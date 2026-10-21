<?php
declare(strict_types=1);

require_once __DIR__ . '/../auth/seguridad.php';
require_once __DIR__ . '/catalogo.php';

aplicarCors(['GET']);
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    responderJson(['resultado' => 'ERROR', 'mensaje' => 'Método no permitido.'], 405);
}
$id = filter_var($_GET['ProductoID'] ?? null, FILTER_VALIDATE_INT);
if ($id === false || $id <= 0) {
    responderJson(['resultado' => 'ERROR', 'mensaje' => 'Producto no válido.'], 400);
}

try {
    $productos = consultarProductos('p.id = :id', [':id' => $id]);
    if ($productos === []) {
        responderJson(['resultado' => 'ERROR', 'mensaje' => 'Producto no encontrado.'], 404);
    }
    responderJson(['resultado' => 'OK', 'producto' => $productos]);
} catch (PDOException $error) {
    error_log('Error producto: ' . $error->getMessage());
    responderJson(['resultado' => 'ERROR', 'mensaje' => 'No se pudo consultar el producto.'], 500);
}
