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
        'select id as "CategoriaID", nombre, descripcion from public.categorias order by nombre'
    );
    responderJson(['result' => 'OK', 'categorias' => $consulta->fetchAll()]);
} catch (PDOException $error) {
    error_log('Error al listar categorías: ' . $error->getMessage());
    responderJson(['result' => 'ERROR', 'mensaje' => 'No se pudieron consultar las categorías.'], 500);
}
