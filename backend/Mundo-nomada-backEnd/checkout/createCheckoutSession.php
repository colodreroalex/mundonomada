<?php
declare(strict_types=1);

/*
 * Crea un pedido "pendiente" con precios y stock leídos de la BBDD, reserva
 * las unidades y devuelve la URL de pago de Stripe. Nunca acepta importes ni
 * artículos desde el navegador: solo los datos de envío.
 */
require_once __DIR__ . '/../carrito/seguridad_carrito.php';
require_once __DIR__ . '/stripe.php';

$userId = usuarioSesionCarrito(['POST']);
$input = entradaJsonCarrito();

// Cada intento reserva stock durante 31 minutos: se limita para que nadie pueda
// dejar productos "agotados" abriendo pagos sin terminarlos
limitarAccion('pago|' . $userId, 10, 900, 900);

$campos = [
    'nombre' => 100, 'apellidos' => 100, 'direccion' => 255, 'codigoPostal' => 10,
    'ciudad' => 100, 'provincia' => 100, 'telefono' => 30, 'email' => 254,
];
$envio = [];
foreach ($campos as $campo => $maximo) {
    $valor = textoValido($input[$campo] ?? null, $maximo) ?? '';
    if ($valor === '' || mb_strlen($valor) > $maximo) {
        responderJson(['resultado' => 'ERROR', 'mensaje' => 'Revisa los datos de envío.'], 400);
    }
    $envio[$campo] = $valor;
}
if (!preg_match('/^[0-9]{5}$/', $envio['codigoPostal'])
    || !preg_match('/^\+?[0-9 ]{9,15}$/', $envio['telefono'])
    || !filter_var($envio['email'], FILTER_VALIDATE_EMAIL)) {
    responderJson(['resultado' => 'ERROR', 'mensaje' => 'Revisa el código postal, el teléfono o el email.'], 400);
}
if (configuracionStripe()['secret_key'] === '') {
    responderJson(['resultado' => 'ERROR', 'mensaje' => 'El pago online no está disponible en este momento.'], 503);
}

$pdo = retornarConexionPostgres();

// Un nuevo intento sustituye a los pagos abiertos anteriores del mismo usuario.
$abiertos = $pdo->prepare(
    "select id, payment_reference from public.orders
      where user_id = :user_id and estado = 'pendiente' and payment_reference is not null"
);
$abiertos->execute([':user_id' => $userId]);
foreach ($abiertos->fetchAll() as $abierto) {
    try {
        $sesion = llamarStripe('POST', 'checkout/sessions/' . rawurlencode($abierto['payment_reference']) . '/expire');
        if (($sesion['status'] ?? '') === 'expired') {
            liberarPedido($pdo, (int) $abierto['id']);
        }
    } catch (RuntimeException $error) {
        error_log("Mundo Nomada: no se pudo expirar la sesión del pedido {$abierto['id']}: " . $error->getMessage());
    }
}

try {
    $pdo->beginTransaction();
    $consulta = $pdo->prepare(
        'select c.producto_id, c.cantidad, p.nombre, p.precio, p.stock, p.imagen_url
           from public.carrito c
           join public.productos p on p.id = c.producto_id
          where c.user_id = :user_id
          order by p.id
          for update of p'
    );
    $consulta->execute([':user_id' => $userId]);
    $lineas = $consulta->fetchAll();
    if ($lineas === []) {
        throw new RuntimeException('Tu carrito está vacío.');
    }
    $sinStock = array_filter($lineas, fn($l) => (int) $l['stock'] < (int) $l['cantidad']);
    if ($sinStock !== []) {
        throw new RuntimeException('No hay stock suficiente de: ' . implode(', ', array_column($sinStock, 'nombre')) . '.');
    }

    $importes = calcularImportesPedido($lineas);
    $pedido = $pdo->prepare(
        "insert into public.orders (user_id, total, subtotal, iva, envio, estado, shipping_name,
                shipping_address, shipping_postal_code, shipping_city, shipping_province,
                shipping_phone, shipping_email)
         values (:user_id, :total, :subtotal, :iva, :envio, 'pendiente', :nombre,
                :direccion, :cp, :ciudad, :provincia, :telefono, :email)
         returning id"
    );
    $pedido->execute([
        ':user_id' => $userId,
        ':total' => $importes['total'] / 100,
        ':subtotal' => $importes['subtotal'] / 100,
        ':iva' => $importes['iva'] / 100,
        ':envio' => $importes['envio'] / 100,
        ':nombre' => $envio['nombre'] . ' ' . $envio['apellidos'],
        ':direccion' => $envio['direccion'],
        ':cp' => $envio['codigoPostal'],
        ':ciudad' => $envio['ciudad'],
        ':provincia' => $envio['provincia'],
        ':telefono' => $envio['telefono'],
        ':email' => $envio['email'],
    ]);
    $orderId = (int) $pedido->fetchColumn();

    $item = $pdo->prepare(
        'insert into public.order_items (order_id, producto_id, cantidad, precio_unitario)
         values (:order_id, :producto_id, :cantidad, :precio)'
    );
    $reserva = $pdo->prepare('update public.productos set stock = stock - :cantidad where id = :id');
    foreach ($lineas as $linea) {
        $item->execute([
            ':order_id' => $orderId, ':producto_id' => $linea['producto_id'],
            ':cantidad' => $linea['cantidad'], ':precio' => $linea['precio'],
        ]);
        $reserva->execute([':cantidad' => $linea['cantidad'], ':id' => $linea['producto_id']]);
    }
    $pdo->commit();
} catch (RuntimeException $error) {
    if ($pdo->inTransaction()) { $pdo->rollBack(); }
    responderJson(['resultado' => 'ERROR', 'mensaje' => $error->getMessage()], 409);
} catch (PDOException $error) {
    if ($pdo->inTransaction()) { $pdo->rollBack(); }
    error_log('Mundo Nomada checkout failed: ' . $error->getMessage());
    responderJson(['resultado' => 'ERROR', 'mensaje' => 'No se pudo preparar el pedido.'], 500);
}

$base = urlPublicaTienda();
$datos = [
    'mode' => 'payment',
    'locale' => 'es',
    'currency' => 'eur',
    'customer_email' => $envio['email'],
    'client_reference_id' => (string) $orderId,
    'metadata' => ['order_id' => (string) $orderId],
    'payment_intent_data' => ['metadata' => ['order_id' => (string) $orderId]],
    'expires_at' => time() + DURACION_PAGO_SEGUNDOS,
    'success_url' => $base . '/checkout?session_id={CHECKOUT_SESSION_ID}',
    'cancel_url' => $base . '/checkout?cancelado=1',
    'line_items' => [],
];
foreach ($lineas as $linea) {
    $producto = ['name' => $linea['nombre']];
    if (str_starts_with((string) $linea['imagen_url'], 'https://')) {
        $producto['images'] = [$linea['imagen_url']];
    }
    $datos['line_items'][] = [
        'quantity' => (int) $linea['cantidad'],
        'price_data' => [
            'currency' => 'eur',
            'unit_amount' => precioConIvaCentimos($linea['precio']),
            'product_data' => $producto,
        ],
    ];
}
if ($importes['envio'] > 0) {
    $datos['line_items'][] = [
        'quantity' => 1,
        'price_data' => ['currency' => 'eur', 'unit_amount' => $importes['envio'], 'product_data' => ['name' => 'Gastos de envío']],
    ];
}

try {
    $sesion = llamarStripe('POST', 'checkout/sessions', $datos, 'mundonomada-order-' . $orderId);
    $pdo->prepare('update public.orders set payment_reference = :sid where id = :id')
        ->execute([':sid' => $sesion['id'], ':id' => $orderId]);
    responderJson(['resultado' => 'OK', 'url' => $sesion['url']]);
} catch (Throwable $error) {
    error_log("Mundo Nomada: no se pudo crear el pago del pedido $orderId: " . $error->getMessage());
    liberarPedido($pdo, $orderId);
    responderJson(['resultado' => 'ERROR', 'mensaje' => 'No se pudo iniciar el pago. No se ha cobrado nada.'], 502);
}
