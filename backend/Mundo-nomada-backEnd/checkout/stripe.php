<?php
declare(strict_types=1);

/*
 * Integración mínima con la API de Stripe sin dependencias externas.
 * Las claves viven en config/stripe.local.php (ignorado por Git) o en las
 * variables de entorno STRIPE_SECRET_KEY y STRIPE_WEBHOOK_SECRET.
 */

const IVA_PORCENTAJE = 21;
const ENVIO_GRATIS_MINIMO_CENTIMOS = 6000;
const COSTO_ENVIO_CENTIMOS = 350;
const DURACION_PAGO_SEGUNDOS = 1860;

function configuracionStripe(): array
{
    $localConfig = __DIR__ . '/../config/stripe.local.php';
    if (is_file($localConfig)) {
        $config = require $localConfig;
        if (is_array($config)) {
            return $config;
        }
    }

    return [
        'secret_key' => getenv('STRIPE_SECRET_KEY') ?: '',
        'webhook_secret' => getenv('STRIPE_WEBHOOK_SECRET') ?: '',
    ];
}

function urlPublicaTienda(): string
{
    $origen = getenv('MUNDONOMADA_ALLOWED_ORIGIN') ?: (getenv('RENDER_EXTERNAL_URL') ?: 'http://localhost:4200');
    return rtrim($origen, '/');
}

/**
 * Calcula importes en céntimos a partir de precios sin IVA guardados en la BBDD.
 * Mismas reglas que muestra el frontend: 21 % de IVA y 3,50 € de envío por
 * debajo de 60 € de subtotal.
 */
function calcularImportesPedido(array $lineas): array
{
    $subtotal = 0;
    $conIva = 0;
    foreach ($lineas as $linea) {
        $neto = (int) round(((float) $linea['precio']) * 100);
        $bruto = (int) round($neto * (100 + IVA_PORCENTAJE) / 100);
        $subtotal += $neto * (int) $linea['cantidad'];
        $conIva += $bruto * (int) $linea['cantidad'];
    }
    $envio = $subtotal >= ENVIO_GRATIS_MINIMO_CENTIMOS ? 0 : COSTO_ENVIO_CENTIMOS;

    return [
        'subtotal' => $subtotal,
        'iva' => $conIva - $subtotal,
        'envio' => $envio,
        'total' => $conIva + $envio,
    ];
}

function precioConIvaCentimos($precio): int
{
    return (int) round(((int) round(((float) $precio) * 100)) * (100 + IVA_PORCENTAJE) / 100);
}

/** @throws RuntimeException si Stripe no responde o rechaza la petición. */
function llamarStripe(string $metodo, string $ruta, array $datos = [], ?string $idempotencia = null): array
{
    $clave = (string) (configuracionStripe()['secret_key'] ?? '');
    if ($clave === '') {
        throw new RuntimeException('Stripe no está configurado.');
    }

    $cabeceras = ['Content-Type: application/x-www-form-urlencoded', 'Stripe-Version: 2024-06-20'];
    if ($idempotencia !== null) {
        $cabeceras[] = 'Idempotency-Key: ' . $idempotencia;
    }

    $curl = curl_init('https://api.stripe.com/v1/' . ltrim($ruta, '/'));
    curl_setopt_array($curl, [
        CURLOPT_CUSTOMREQUEST => $metodo,
        CURLOPT_USERPWD => $clave . ':',
        CURLOPT_HTTPHEADER => $cabeceras,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 20,
    ]);
    if ($datos !== []) {
        curl_setopt($curl, CURLOPT_POSTFIELDS, http_build_query($datos));
    }

    $respuesta = curl_exec($curl);
    $codigo = (int) curl_getinfo($curl, CURLINFO_RESPONSE_CODE);
    $errorRed = curl_error($curl);
    curl_close($curl);

    if ($respuesta === false) {
        throw new RuntimeException('Stripe no responde: ' . $errorRed);
    }
    $json = json_decode((string) $respuesta, true);
    if ($codigo >= 400 || !is_array($json)) {
        $mensaje = is_array($json) ? ($json['error']['message'] ?? 'desconocido') : 'respuesta no válida';
        throw new RuntimeException("Stripe HTTP $codigo: $mensaje");
    }
    return $json;
}

/** Verifica la cabecera Stripe-Signature (esquema v1, HMAC-SHA256). */
function firmaStripeValida(string $payload, string $cabecera, string $secreto, int $tolerancia = 300): bool
{
    $marca = null;
    $firmas = [];
    foreach (explode(',', $cabecera) as $parte) {
        [$clave, $valor] = array_pad(explode('=', trim($parte), 2), 2, '');
        if ($clave === 't' && ctype_digit($valor)) {
            $marca = (int) $valor;
        } elseif ($clave === 'v1') {
            $firmas[] = $valor;
        }
    }
    if ($marca === null || $firmas === [] || abs(time() - $marca) > $tolerancia) {
        return false;
    }

    $esperada = hash_hmac('sha256', $marca . '.' . $payload, $secreto);
    foreach ($firmas as $firma) {
        if (hash_equals($esperada, $firma)) {
            return true;
        }
    }
    return false;
}

/** Cancela un pedido pendiente y devuelve su stock reservado. Idempotente. */
function liberarPedido(PDO $pdo, int $orderId): bool
{
    $pdo->beginTransaction();
    try {
        $pedido = $pdo->prepare(
            "update public.orders set estado = 'cancelado'
              where id = :id and estado = 'pendiente' returning id"
        );
        $pedido->execute([':id' => $orderId]);
        if (!$pedido->fetch()) {
            $pdo->commit();
            return false;
        }
        $pdo->prepare(
            'update public.productos p set stock = p.stock + oi.cantidad
               from public.order_items oi
              where oi.order_id = :id and oi.producto_id = p.id'
        )->execute([':id' => $orderId]);
        $pdo->commit();
        return true;
    } catch (Throwable $error) {
        $pdo->rollBack();
        throw $error;
    }
}

/** Marca como pagado el pedido de una sesión de Stripe y vacía esas líneas del carrito. */
function confirmarPagoPedido(PDO $pdo, string $sessionId, ?string $paymentIntent): void
{
    $pdo->beginTransaction();
    try {
        $pedido = $pdo->prepare(
            "update public.orders set estado = 'pagado', paid_at = now(), payment_intent = :pi
              where payment_reference = :sid and estado = 'pendiente'
          returning id, user_id"
        );
        $pedido->execute([':sid' => $sessionId, ':pi' => $paymentIntent]);
        $fila = $pedido->fetch();
        if ($fila) {
            // Factura simplificada: número correlativo de la serie del año, en la
            // misma transacción que el pago para que no queden huecos
            $contador = $pdo->prepare(
                "insert into public.invoice_counters (year, last_number)
                 values (extract(year from now())::integer, 1)
                 on conflict (year) do update set last_number = public.invoice_counters.last_number + 1
                 returning year, last_number"
            );
            $contador->execute();
            $serie = $contador->fetch();
            $pdo->prepare(
                'update public.orders set invoice_number = :numero, invoice_date = now() where id = :id'
            )->execute([
                ':numero' => sprintf('F%d-%06d', $serie['year'], $serie['last_number']),
                ':id' => $fila['id'],
            ]);

            $pdo->prepare(
                'delete from public.carrito c using public.order_items oi
                  where oi.order_id = :order_id and c.producto_id = oi.producto_id and c.user_id = :user_id'
            )->execute([':order_id' => $fila['id'], ':user_id' => $fila['user_id']]);
        } else {
            $estado = $pdo->prepare('select id, estado from public.orders where payment_reference = :sid');
            $estado->execute([':sid' => $sessionId]);
            $actual = $estado->fetch();
            if ($actual && $actual['estado'] === 'cancelado') {
                error_log("Mundo Nomada ALERTA: pago recibido para el pedido cancelado {$actual['id']} (sesión $sessionId). Revisar stock o reembolsar.");
            }
        }
        $pdo->commit();
    } catch (Throwable $error) {
        $pdo->rollBack();
        throw $error;
    }
}
