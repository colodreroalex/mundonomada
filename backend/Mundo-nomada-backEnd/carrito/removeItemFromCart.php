<?php
require_once __DIR__ . '/seguridad_carrito.php';

$userId = usuarioSesionCarrito(['POST']);
$entrada = entradaJsonCarrito();
$cartId = filter_var($entrada['id'] ?? null, FILTER_VALIDATE_INT);
if ($cartId === false || $cartId <= 0) {
    responderJson(['resultado' => 'ERROR', 'mensaje' => 'El elemento indicado no es válido.'], 400);
}

try {
    $conexion = retornarConexionPostgres();
    $eliminar = $conexion->prepare('delete from public.carrito where id = :cart_id and user_id = :user_id');
    $eliminar->execute([':cart_id' => $cartId, ':user_id' => $userId]);
    if ($eliminar->rowCount() !== 1) {
        responderJson(['resultado' => 'ERROR', 'mensaje' => 'Elemento de carrito no encontrado.'], 404);
    }
    responderJson(['resultado' => 'OK', 'mensaje' => 'Producto eliminado del carrito.']);
} catch (PDOException $error) {
    error_log('Error al eliminar del carrito: ' . $error->getMessage());
    responderJson(['resultado' => 'ERROR', 'mensaje' => 'No se pudo eliminar el producto.'], 500);
}
