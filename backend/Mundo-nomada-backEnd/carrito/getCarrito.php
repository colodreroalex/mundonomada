<?php
header("Access-Control-Allow-Origin: http://localhost:4200");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
session_start();
if (!isset($_SESSION['user']['id'])) {
    http_response_code(401);
    echo json_encode(['resultado' => 'ERROR', 'mensaje' => 'Debes iniciar sesión.']);
    exit;
}

require("../conexion.php");
$con = retornarConexion();

// El usuario siempre procede de la sesión, nunca de la URL.
$user_id = (int) $_SESSION['user']['id'];

// Consulta para obtener los productos del carrito junto con los detalles del producto
$sql = "SELECT 
    c.id AS cart_id,
    c.cantidad,
    p.ProductoID,
    p.nombre,
    p.precio,
    p.descripcion,
    p.stock,
    p.categoriaID,
    p.imagen
FROM carrito c
INNER JOIN productos p ON c.producto_id = p.ProductoID
WHERE c.user_id = ?
";

$stmt = $con->prepare($sql);
$stmt->bind_param("i", $user_id);
$stmt->execute();
$result = $stmt->get_result();

$items = array();
while ($row = $result->fetch_assoc()) {
    $items[] = $row;
}

$response = new stdClass();
$response->resultado = 'OK';
$response->datos = $items;

$stmt->close();
$con->close();

echo json_encode($response);
?>
