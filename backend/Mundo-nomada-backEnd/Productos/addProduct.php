<?php
declare(strict_types=1);

require_once __DIR__ . '/../auth/seguridad.php';
require_once __DIR__ . '/validacion_producto.php';

exigirAdministrador(['POST']);
$d = json_decode(file_get_contents('php://input'), true);
$datos = datosProducto(is_array($d) ? $d : []);

try {
    $q = retornarConexionPostgres()->prepare(
        'insert into public.productos (nombre, precio, descripcion, stock, categoria_id, imagen_url, color, talla)
         values (:n, :p, :d, :s, :c, :i, :co, :t) returning id'
    );
    $q->execute($datos);
    responderJson(['resultado' => 'OK', 'mensaje' => 'Producto registrado correctamente.', 'id' => $q->fetchColumn()], 201);
} catch (PDOException $e) {
    if ($e->getCode() === '23503') {
        responderJson(['resultado' => 'ERROR', 'mensaje' => 'La categoría no existe.'], 400);
    }
    error_log('Error producto: ' . $e->getMessage());
    responderJson(['resultado' => 'ERROR', 'mensaje' => 'No se pudo registrar el producto.'], 400);
}
