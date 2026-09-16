<?php
require_once __DIR__ . '/seguridad_carrito.php';

$userId = usuarioSesionCarrito(['GET']);
try {
    $conexion = retornarConexionPostgres();
    $consulta = $conexion->prepare(
        'select coalesce(sum(c.cantidad * p.precio), 0)::numeric(10,2) as total
           from public.carrito c join public.productos p on p.id = c.producto_id
          where c.user_id = :user_id'
    );
    $consulta->execute([':user_id' => $userId]);
    responderJson(['resultado' => 'OK', 'total' => $consulta->fetchColumn()]);
} catch (PDOException $error) {
    error_log('Error al calcular el total del carrito: ' . $error->getMessage());
    responderJson(['resultado' => 'ERROR', 'mensaje' => 'No se pudo calcular el total.'], 500);
}
