<?php
declare(strict_types=1);

require_once __DIR__ . '/../auth/seguridad.php';
require_once __DIR__ . '/../conexion_postgres.php';

aplicarCors(['GET']);
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    responderJson(['resultado' => 'ERROR', 'mensaje' => 'Método no permitido.'], 405);
}

try {
    $consulta = retornarConexionPostgres()->query(
        'select p.id as "ProductoID", p.nombre, p.precio, p.descripcion, p.stock,
                p.categoria_id as "categoriaID", p.imagen_url as imagen, p.color, p.talla
           from public.productos p join public.categorias c on c.id = p.categoria_id
          order by p.id'
    );
    responderJson(['resultado' => 'OK', 'productos' => $consulta->fetchAll()]);
} catch (PDOException $error) {
    error_log('Error al listar productos: ' . $error->getMessage());
    responderJson(['resultado' => 'ERROR', 'mensaje' => 'No se pudieron consultar los productos.'], 500);
}
