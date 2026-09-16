<?php
declare(strict_types=1);

require_once __DIR__ . '/../auth/seguridad.php';
require_once __DIR__ . '/../conexion_postgres.php';

aplicarCors(['POST']);
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    responderJson(['resultado' => 'ERROR', 'mensaje' => 'Método no permitido.'], 405);
}

$entrada = json_decode(file_get_contents('php://input'), true);
if (!is_array($entrada) || !isset($entrada['ids']) || !is_array($entrada['ids']) || count($entrada['ids']) === 0 || count($entrada['ids']) > 100) {
    responderJson(['resultado' => 'ERROR', 'mensaje' => 'IDs de productos no válidos.'], 400);
}

$ids = array_values(array_unique(array_filter(
    array_map(static fn ($id) => filter_var($id, FILTER_VALIDATE_INT), $entrada['ids']),
    static fn ($id) => $id !== false && $id > 0
)));
if (count($ids) === 0) {
    responderJson(['resultado' => 'ERROR', 'mensaje' => 'IDs de productos no válidos.'], 400);
}

try {
    $parametros = [];
    foreach ($ids as $indice => $id) {
        $parametros[':id' . $indice] = $id;
    }
    $consulta = retornarConexionPostgres()->prepare(
        'select id as "ProductoID", nombre, precio, descripcion, stock,
                categoria_id as "categoriaID", imagen_url as imagen
           from public.productos
          where id in (' . implode(', ', array_keys($parametros)) . ') and stock > 0'
    );
    $consulta->execute($parametros);
    responderJson(['resultado' => 'OK', 'products' => $consulta->fetchAll()]);
} catch (PDOException $error) {
    error_log('Error al consultar el stock: ' . $error->getMessage());
    responderJson(['resultado' => 'ERROR', 'mensaje' => 'No se pudo comprobar el stock.'], 500);
}
