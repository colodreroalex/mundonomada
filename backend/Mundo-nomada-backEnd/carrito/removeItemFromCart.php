<?php

header("Access-Control-Allow-Origin: http://localhost:4200");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
session_start();
if (!isset($_SESSION['user']['id'])) {
    http_response_code(401);
    echo json_encode(['resultado' => 'ERROR', 'mensaje' => 'Debes iniciar sesión.']);
    exit;
}

// Resto de tu código...
require("../conexion.php");
$con = retornarConexion();

$data = json_decode(file_get_contents("php://input"));

if (!isset($data->id)) {
    echo json_encode(['resultado' => 'ERROR', 'mensaje' => 'ID no especificado']);
    exit();
}

$id = intval($data->id);
$userId = (int) $_SESSION['user']['id'];

$sql = "DELETE FROM carrito WHERE id = ? AND user_id = ?";
$stmt = $con->prepare($sql);
$stmt->bind_param("ii", $id, $userId);
$stmt->execute();

if ($stmt->affected_rows === 0) {
    http_response_code(404);
    echo json_encode(['resultado' => 'ERROR', 'mensaje' => 'Elemento de carrito no encontrado.']);
    exit;
}

$response = new stdClass();
$response->resultado = 'OK';
$response->mensaje = 'Producto eliminado del carrito';

$stmt->close();
$con->close();

echo json_encode($response);
?>
