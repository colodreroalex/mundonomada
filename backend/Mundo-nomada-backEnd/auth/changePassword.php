<?php
declare(strict_types=1);
require_once __DIR__ . '/seguridad.php';
require_once __DIR__ . '/../conexion_postgres.php';
aplicarCors(['POST']); iniciarSesionSegura();
if ($_SERVER['REQUEST_METHOD'] !== 'POST' || !isset($_SESSION['user']['id'])) responderJson(['success' => false, 'message' => 'No hay sesión activa.'], 401);
$data = json_decode(file_get_contents('php://input'), true); $old = (string) ($data['oldPassword'] ?? ''); $new = (string) ($data['newPassword'] ?? '');
if (strlen($new) < 8) responderJson(['success' => false, 'message' => 'La nueva contraseña debe tener al menos 8 caracteres.'], 400);
try {
    $db = retornarConexionPostgres(); $query = $db->prepare('select password from public.users where id = :id for update'); $db->beginTransaction(); $query->execute([':id' => (int) $_SESSION['user']['id']]); $hash = $query->fetchColumn();
    if (!$hash || !password_verify($old, $hash)) { $db->rollBack(); responderJson(['success' => false, 'message' => 'La contraseña actual no es correcta.'], 400); }
    $update = $db->prepare('update public.users set password = :password, password_updated_at = now(), remember_token = null, token_expiry = null where id = :id returning password_updated_at');
    $update->execute([':password' => password_hash($new, PASSWORD_DEFAULT), ':id' => (int) $_SESSION['user']['id']]); $updated = $update->fetchColumn(); $db->commit(); $_SESSION['user']['password_updated_at'] = $updated;
    responderJson(['success' => true, 'message' => 'Contraseña actualizada correctamente.', 'password_updated_at' => $updated]);
} catch (PDOException $error) { if (isset($db) && $db->inTransaction()) $db->rollBack(); error_log('Error contraseña: ' . $error->getMessage()); responderJson(['success' => false, 'message' => 'No se pudo actualizar la contraseña.'], 500); }
