<?php
header("Access-Control-Allow-Origin: http://localhost:4200");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
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

$data = json_decode(file_get_contents("php://input"));

if (!isset($data->id) || !isset($data->cantidad)) {
    echo json_encode(['resultado' => 'ERROR', 'mensaje' => 'Datos incompletos']);
    exit();
}

$id = intval($data->id);
$cantidad = intval($data->cantidad);
if ($id <= 0 || $cantidad <= 0) {
    http_response_code(400);
    echo json_encode(['resultado' => 'ERROR', 'mensaje' => 'Datos no válidos.']);
    exit;
}
$userId = (int) $_SESSION['user']['id'];

$sql = "UPDATE carrito SET cantidad = ? WHERE id = ? AND user_id = ?";
$stmt = $con->prepare($sql);
$stmt->bind_param("iii", $cantidad, $id, $userId);
$stmt->execute();

if ($stmt->affected_rows === 0) {
    http_response_code(404);
    echo json_encode(['resultado' => 'ERROR', 'mensaje' => 'Elemento de carrito no encontrado.']);
    exit;
}

$response = new stdClass();
$response->resultado = 'OK';
$response->mensaje = 'Cantidad actualizada';

$stmt->close();
$con->close();

echo json_encode($response);
?>
