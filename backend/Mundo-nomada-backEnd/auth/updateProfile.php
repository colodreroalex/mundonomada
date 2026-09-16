<?php
declare(strict_types=1);
require_once __DIR__ . '/seguridad.php';
require_once __DIR__ . '/../conexion_postgres.php';
aplicarCors(['POST']); iniciarSesionSegura();
if ($_SERVER['REQUEST_METHOD'] !== 'POST' || !isset($_SESSION['user']['id'])) responderJson(['success' => false, 'message' => 'No hay sesión activa.'], 401);
$data = json_decode(file_get_contents('php://input'), true);
$name = trim((string) ($data['name'] ?? '')); $email = strtolower(trim((string) ($data['email'] ?? '')));
if ($name === '' || mb_strlen($name) > 100 || !filter_var($email, FILTER_VALIDATE_EMAIL)) responderJson(['success' => false, 'message' => 'Datos de perfil no válidos.'], 400);
try {
    $query = retornarConexionPostgres()->prepare('update public.users set name = :name, email = :email where id = :id returning updated_at');
    $query->execute([':name' => $name, ':email' => $email, ':id' => (int) $_SESSION['user']['id']]);
    $updated = $query->fetchColumn();
    $_SESSION['user']['name'] = $name; $_SESSION['user']['email'] = $email; $_SESSION['user']['updated_at'] = $updated;
    responderJson(['success' => true, 'message' => 'Perfil actualizado correctamente.', 'updated_at' => $updated]);
} catch (PDOException $error) {
    if ($error->getCode() === '23505') responderJson(['success' => false, 'message' => 'El correo electrónico ya está en uso.'], 409);
    error_log('Error perfil: ' . $error->getMessage()); responderJson(['success' => false, 'message' => 'No se pudo actualizar el perfil.'], 500);
}
