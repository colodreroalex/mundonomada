<?php
require_once __DIR__ . '/seguridad_carrito.php';

$userId = usuarioSesionCarrito(['POST']);
$entrada = entradaJsonCarrito();
$cartId = filter_var($entrada['id'] ?? null, FILTER_VALIDATE_INT);
$cantidad = filter_var($entrada['cantidad'] ?? null, FILTER_VALIDATE_INT);
if ($cartId === false || $cartId <= 0 || $cantidad === false || $cantidad <= 0) {
    responderJson(['resultado' => 'ERROR', 'mensaje' => 'La cantidad solicitada no es válida.'], 400);
}

try {
    $conexion = retornarConexionPostgres();
    $conexion->beginTransaction();
    $consulta = $conexion->prepare(
        'select p.stock from public.carrito c join public.productos p on p.id = c.producto_id
          where c.id = :cart_id and c.user_id = :user_id for update of c, p'
    );
    $consulta->execute([':cart_id' => $cartId, ':user_id' => $userId]);
    $linea = $consulta->fetch();
    if (!$linea) {
        $conexion->rollBack();
        responderJson(['resultado' => 'ERROR', 'mensaje' => 'Elemento de carrito no encontrado.'], 404);
    }
    if ($cantidad > (int) $linea['stock']) {
        $conexion->rollBack();
        responderJson(['resultado' => 'ERROR', 'mensaje' => 'La cantidad solicitada supera el stock disponible.'], 409);
    }
    $actualizar = $conexion->prepare('update public.carrito set cantidad = :cantidad where id = :cart_id and user_id = :user_id');
    $actualizar->execute([':cantidad' => $cantidad, ':cart_id' => $cartId, ':user_id' => $userId]);
    $conexion->commit();
    responderJson(['resultado' => 'OK', 'mensaje' => 'Cantidad actualizada.']);
} catch (PDOException $error) {
    if (isset($conexion) && $conexion->inTransaction()) { $conexion->rollBack(); }
    error_log('Error al actualizar el carrito: ' . $error->getMessage());
    responderJson(['resultado' => 'ERROR', 'mensaje' => 'No se pudo actualizar el carrito.'], 500);
}
