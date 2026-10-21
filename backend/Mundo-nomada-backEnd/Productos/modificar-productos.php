<?php
declare(strict_types=1);

require_once __DIR__ . '/../auth/seguridad.php';
require_once __DIR__ . '/validacion_producto.php';

exigirAdministrador(['POST']);
$d = json_decode(file_get_contents('php://input'), true);
$d = is_array($d) ? $d : [];
$id = filter_var($d['id'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
if ($id === false) {
    responderJson(['resultado' => 'ERROR', 'mensaje' => 'Producto no válido.'], 400);
}
$datos = datosProducto($d);
$variantes = variantesProducto($d);

$pdo = retornarConexionPostgres();
try {
    $pdo->beginTransaction();
    $q = $pdo->prepare(
        'update public.productos
            set nombre = :n, precio = :p, descripcion = :d, categoria_id = :c, imagen_url = :i, color = :co
          where id = :id'
    );
    $q->execute($datos + [':id' => $id]);
    if ($q->rowCount() !== 1) {
        $pdo->rollBack();
        responderJson(['resultado' => 'ERROR', 'mensaje' => 'El producto no existe.'], 404);
    }
    guardarVariantes($pdo, $id, $variantes);
    $pdo->commit();
    responderJson(['resultado' => 'OK', 'mensaje' => 'Producto actualizado correctamente.']);
} catch (PDOException $e) {
    if ($pdo->inTransaction()) { $pdo->rollBack(); }
    if ($e->getCode() === '23505') {
        responderJson(['resultado' => 'ERROR', 'mensaje' => 'Dos tallas no pueden llamarse igual. Si estás intercambiando nombres, hazlo en dos pasos.'], 409);
    }
    error_log('Error producto: ' . $e->getMessage());
    responderJson(['resultado' => 'ERROR', 'mensaje' => 'No se pudo actualizar el producto.'], 400);
} catch (RuntimeException $e) {
    if ($pdo->inTransaction()) { $pdo->rollBack(); }
    responderJson(['resultado' => 'ERROR', 'mensaje' => $e->getMessage()], 409);
}
