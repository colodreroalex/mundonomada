<?php
declare(strict_types=1);

require_once __DIR__ . '/../auth/seguridad.php';
require_once __DIR__ . '/validacion_producto.php';

exigirAdministrador(['POST']);
$d = json_decode(file_get_contents('php://input'), true);
$d = is_array($d) ? $d : [];
$datos = datosProducto($d);
// En un producto nuevo todas las tallas son nuevas
$variantes = array_map(static fn(array $v): array => ["id" => null] + $v, variantesProducto($d));

$pdo = retornarConexionPostgres();
try {
    $pdo->beginTransaction();
    $q = $pdo->prepare(
        'insert into public.productos (nombre, precio, descripcion, categoria_id, imagen_url, color)
         values (:n, :p, :d, :c, :i, :co) returning id'
    );
    $q->execute($datos);
    $id = (int) $q->fetchColumn();
    guardarVariantes($pdo, $id, $variantes);
    $pdo->commit();
    responderJson(['resultado' => 'OK', 'mensaje' => 'Producto registrado correctamente.', 'id' => $id], 201);
} catch (PDOException $e) {
    if ($pdo->inTransaction()) { $pdo->rollBack(); }
    if ($e->getCode() === '23503') {
        responderJson(['resultado' => 'ERROR', 'mensaje' => 'La categoría no existe.'], 400);
    }
    error_log('Error producto: ' . $e->getMessage());
    responderJson(['resultado' => 'ERROR', 'mensaje' => 'No se pudo registrar el producto.'], 400);
}
