<?php
declare(strict_types=1);

/*
 * Avanza un pedido pagado en el proceso de envío. Los cobros y reembolsos se
 * gestionan en Stripe; desde aquí no se puede marcar un pedido como pagado.
 */
require_once __DIR__ . '/../auth/seguridad.php';
require_once __DIR__ . '/../conexion_postgres.php';

exigirAdministrador(['POST']);
$input = json_decode((string) file_get_contents('php://input'), true);
$orderId = filter_var($input['id'] ?? null, FILTER_VALIDATE_INT);
$nuevo = $input['estado'] ?? '';
$anterior = ['enviado' => 'pagado', 'completado' => 'enviado'][$nuevo] ?? null;
if (!$orderId || $anterior === null) {
    responderJson(['resultado' => 'ERROR', 'mensaje' => 'Cambio de estado no válido.'], 400);
}

try {
    $consulta = retornarConexionPostgres()->prepare(
        'update public.orders set estado = cast(:nuevo as public.order_status)
          where id = :id and estado = cast(:anterior as public.order_status) returning id'
    );
    $consulta->execute([':nuevo' => $nuevo, ':id' => $orderId, ':anterior' => $anterior]);
    if (!$consulta->fetch()) {
        responderJson(['resultado' => 'ERROR', 'mensaje' => "Solo se puede pasar a \"$nuevo\" un pedido \"$anterior\"."], 409);
    }
    responderJson(['resultado' => 'OK']);
} catch (PDOException $error) {
    error_log('Mundo Nomada order status failed: ' . $error->getMessage());
    responderJson(['resultado' => 'ERROR', 'mensaje' => 'No se pudo actualizar el pedido.'], 500);
}
