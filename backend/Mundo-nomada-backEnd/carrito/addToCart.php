<?php
header('Access-Control-Allow-Origin: http://localhost:4200');
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=UTF-8');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

session_start();
if (!isset($_SESSION['user']['id'])) {
    http_response_code(401);
    echo json_encode(['resultado' => 'ERROR', 'mensaje' => 'Debes iniciar sesión para guardar el carrito.']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);
$productoId = isset($data['producto_id']) ? filter_var($data['producto_id'], FILTER_VALIDATE_INT) : false;
$cantidad = isset($data['cantidad']) ? filter_var($data['cantidad'], FILTER_VALIDATE_INT) : false;
if ($productoId === false || $productoId <= 0 || $cantidad === false || $cantidad <= 0) {
    http_response_code(400);
    echo json_encode(['resultado' => 'ERROR', 'mensaje' => 'Producto o cantidad no válidos.']);
    exit;
}

require_once __DIR__ . '/../conexion.php';
$conexion = retornarConexion();
$userId = (int) $_SESSION['user']['id'];
try {
    $conexion->begin_transaction();
    $product = $conexion->prepare('SELECT stock FROM productos WHERE ProductoID = ? FOR UPDATE');
    $product->bind_param('i', $productoId);
    $product->execute();
    $stock = $product->get_result()->fetch_assoc();
    $product->close();
    if (!$stock) { throw new RuntimeException('El producto ya no existe.'); }

    $cart = $conexion->prepare('SELECT id, cantidad FROM carrito WHERE user_id = ? AND producto_id = ? FOR UPDATE');
    $cart->bind_param('ii', $userId, $productoId);
    $cart->execute();
    $item = $cart->get_result()->fetch_assoc();
    $cart->close();
    $newQuantity = $cantidad + ($item ? (int) $item['cantidad'] : 0);
    if ($newQuantity > (int) $stock['stock']) { throw new RuntimeException('No hay suficientes unidades disponibles.'); }

    if ($item) {
        $stmt = $conexion->prepare('UPDATE carrito SET cantidad = ? WHERE id = ? AND user_id = ?');
        $stmt->bind_param('iii', $newQuantity, $item['id'], $userId);
    } else {
        $stmt = $conexion->prepare('INSERT INTO carrito (user_id, producto_id, cantidad) VALUES (?, ?, ?)');
        $stmt->bind_param('iii', $userId, $productoId, $cantidad);
    }
    $stmt->execute();
    $stmt->close();
    $conexion->commit();
    echo json_encode(['resultado' => 'OK', 'mensaje' => 'Producto añadido al carrito.']);
} catch (Throwable $exception) {
    $conexion->rollback();
    http_response_code(400);
    echo json_encode(['resultado' => 'ERROR', 'mensaje' => $exception->getMessage()]);
} finally {
    $conexion->close();
}
?>
