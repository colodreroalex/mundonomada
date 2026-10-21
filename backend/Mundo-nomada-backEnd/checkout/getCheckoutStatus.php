<?php
declare(strict_types=1);

/* Estado del pedido asociado a una sesión de Stripe del usuario que vuelve del pago. */
require_once __DIR__ . '/../carrito/seguridad_carrito.php';

$userId = usuarioSesionCarrito(['GET']);
$sessionId = (string) ($_GET['session_id'] ?? '');
if (!preg_match('/^cs_(test|live)_[A-Za-z0-9]{10,200}$/', $sessionId)) {
    responderJson(['resultado' => 'ERROR', 'mensaje' => 'Pago no válido.'], 400);
}

try {
    $pdo = retornarConexionPostgres();
    $consulta = $pdo->prepare(
        'select id, fecha, estado, subtotal, iva, envio, total, paid_at, invoice_number, invoice_date, shipping_name, shipping_address,
                shipping_postal_code, shipping_city, shipping_province, shipping_phone, shipping_email
           from public.orders where payment_reference = :sid and user_id = :user_id'
    );
    $consulta->execute([':sid' => $sessionId, ':user_id' => $userId]);
    $pedido = $consulta->fetch();
    if (!$pedido) {
        responderJson(['resultado' => 'ERROR', 'mensaje' => 'Pedido no encontrado.'], 404);
    }
    $items = $pdo->prepare(
        "select oi.producto_id, p.nombre || case when coalesce(oi.talla, '') in ('', 'Única', 'única') then '' else ' · Talla ' || oi.talla end as nombre, oi.talla, oi.cantidad, oi.precio_unitario
           from public.order_items oi join public.productos p on p.id = oi.producto_id
          where oi.order_id = :id order by oi.id"
    );
    $items->execute([':id' => $pedido['id']]);
    responderJson(['resultado' => 'OK', 'pedido' => $pedido, 'items' => $items->fetchAll()]);
} catch (PDOException $error) {
    error_log('Mundo Nomada checkout status failed: ' . $error->getMessage());
    responderJson(['resultado' => 'ERROR', 'mensaje' => 'No se pudo consultar el pedido.'], 500);
}
