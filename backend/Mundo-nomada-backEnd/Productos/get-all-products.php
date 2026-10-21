<?php
declare(strict_types=1);

require_once __DIR__ . '/../auth/seguridad.php';
require_once __DIR__ . '/catalogo.php';

aplicarCors(['GET']);
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    responderJson(['resultado' => 'ERROR', 'mensaje' => 'Método no permitido.'], 405);
}

try {
    responderJson(['resultado' => 'OK', 'productos' => consultarProductos()]);
} catch (PDOException $error) {
    error_log('Error al listar productos: ' . $error->getMessage());
    responderJson(['resultado' => 'ERROR', 'mensaje' => 'No se pudieron consultar los productos.'], 500);
}
