<?php
declare(strict_types=1);

require_once __DIR__ . '/../auth/seguridad.php';
require_once __DIR__ . '/../conexion_postgres.php';

aplicarCors(['GET']);
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    responderJson(['resultado' => 'ERROR', 'mensaje' => 'Método no permitido.'], 405);
}
$categoriaId = filter_var($_GET['categoriaID'] ?? null, FILTER_VALIDATE_INT);
if ($categoriaId === false || $categoriaId <= 0) {
    responderJson(['resultado' => 'ERROR', 'mensaje' => 'La categoría indicada no es válida.'], 400);
}

try {
    $consulta = retornarConexionPostgres()->prepare(
        'select id as "ProductoID", nombre, precio, descripcion, stock,
                categoria_id as "categoriaID", imagen_url as imagen, color, talla
           from public.productos where categoria_id = :categoria_id order by id'
    );
    $consulta->execute([':categoria_id' => $categoriaId]);
    responderJson(['resultado' => 'OK', 'productos' => $consulta->fetchAll()]);
} catch (PDOException $error) {
    error_log('Error al listar productos por categoría: ' . $error->getMessage());
    responderJson(['resultado' => 'ERROR', 'mensaje' => 'No se pudieron consultar los productos.'], 500);
}
