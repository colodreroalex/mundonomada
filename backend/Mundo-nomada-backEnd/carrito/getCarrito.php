<?php
require_once __DIR__ . '/seguridad_carrito.php';

$userId = usuarioSesionCarrito(['GET']);

try {
    $conexion = retornarConexionPostgres();
    $consulta = $conexion->prepare(
        'select c.id as cart_id, c.cantidad, p.id as "ProductoID", p.nombre,
                p.precio, p.descripcion, p.stock, p.categoria_id as "categoriaID",
                p.imagen_url as imagen
           from public.carrito c
           join public.productos p on p.id = c.producto_id
          where c.user_id = :user_id
          order by c.id'
    );
    $consulta->execute([':user_id' => $userId]);
    responderJson(['resultado' => 'OK', 'datos' => $consulta->fetchAll()]);
} catch (PDOException $error) {
    error_log('Error al leer el carrito: ' . $error->getMessage());
    responderJson(['resultado' => 'ERROR', 'mensaje' => 'No se pudo consultar el carrito.'], 500);
}
