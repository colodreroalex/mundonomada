<?php
declare(strict_types=1);

/* Listado de pedidos para la administración, con sus líneas. */
require_once __DIR__ . '/../auth/seguridad.php';
require_once __DIR__ . '/../conexion_postgres.php';

exigirAdministrador(['GET']);
$estado = $_GET['estado'] ?? '';
if ($estado !== '' && !in_array($estado, ['pendiente', 'pagado', 'enviado', 'completado', 'cancelado'], true)) {
    responderJson(['resultado' => 'ERROR', 'mensaje' => 'Estado no válido.'], 400);
}

try {
    $pdo = retornarConexionPostgres();
    $consulta = $pdo->prepare(
        "select o.id, o.fecha, o.estado, o.total, o.subtotal, o.iva, o.envio, o.paid_at,
                o.payment_intent, o.shipping_name, o.shipping_address, o.shipping_postal_code,
                o.shipping_city, o.shipping_province, o.shipping_phone, o.shipping_email,
                u.email as user_email,
                coalesce((select json_agg(json_build_object('nombre', p.nombre, 'cantidad', oi.cantidad,
                                  'precio_unitario', oi.precio_unitario) order by oi.id)
                            from public.order_items oi join public.productos p on p.id = oi.producto_id
                           where oi.order_id = o.id), '[]') as items
           from public.orders o join public.users u on u.id = o.user_id
          where (:estado = '' or o.estado::text = :estado)
          order by o.fecha desc
          limit 200"
    );
    $consulta->execute([':estado' => $estado]);
    $pedidos = array_map(function (array $pedido): array {
        $pedido['items'] = json_decode((string) $pedido['items'], true);
        return $pedido;
    }, $consulta->fetchAll());
    responderJson(['resultado' => 'OK', 'orders' => $pedidos]);
} catch (PDOException $error) {
    error_log('Mundo Nomada admin orders failed: ' . $error->getMessage());
    responderJson(['resultado' => 'ERROR', 'mensaje' => 'No se pudieron obtener los pedidos.'], 500);
}
