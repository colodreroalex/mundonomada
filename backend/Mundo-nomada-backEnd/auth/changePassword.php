<?php
declare(strict_types=1);

require_once __DIR__ . '/seguridad.php';

aplicarCors(['POST']);
iniciarSesionSegura();
if ($_SERVER['REQUEST_METHOD'] !== 'POST' || !isset($_SESSION['user']['id'])) {
    responderJson(['success' => false, 'message' => 'No hay sesión activa.'], 401);
}

$userId = (int) $_SESSION['user']['id'];
$data = json_decode(file_get_contents('php://input'), true);
$old = is_array($data) && is_string($data['oldPassword'] ?? null) ? $data['oldPassword'] : '';
$new = is_array($data) ? ($data['newPassword'] ?? null) : null;
if (!contrasenaValida($new)) {
    responderJson(['success' => false, 'message' => 'La nueva contraseña debe tener entre 8 y 72 caracteres.'], 400);
}

// Evita adivinar la contraseña actual con una sesión robada
limitarAccion('cambio-contrasena|' . $userId, 5, 900, 900);

try {
    $db = retornarConexionPostgres();
    $db->beginTransaction();
    $query = $db->prepare('select password from public.users where id = :id for update');
    $query->execute([':id' => $userId]);
    $hash = $query->fetchColumn();
    if (!$hash || !password_verify($old, $hash)) {
        $db->rollBack();
        responderJson(['success' => false, 'message' => 'La contraseña actual no es correcta.'], 400);
    }

    // Al cambiar password_updated_at, el resto de sesiones de esta cuenta dejan de ser válidas
    $update = $db->prepare(
        'update public.users set password = :password, password_updated_at = now(), remember_token = null, token_expiry = null
          where id = :id returning password_updated_at'
    );
    $update->execute([':password' => password_hash($new, PASSWORD_DEFAULT), ':id' => $userId]);
    $updated = $update->fetchColumn();
    $db->commit();

    borrarIntentos($db, 'cambio-contrasena|' . $userId);
    session_regenerate_id(true);
    $_SESSION['user']['password_updated_at'] = $updated;
    setcookie('remember_me', '', cookieSegura() + ['expires' => time() - 3600]);
    responderJson(['success' => true, 'message' => 'Contraseña actualizada correctamente.', 'password_updated_at' => $updated]);
} catch (PDOException $error) {
    if (isset($db) && $db->inTransaction()) {
        $db->rollBack();
    }
    error_log('Error contraseña: ' . $error->getMessage());
    responderJson(['success' => false, 'message' => 'No se pudo actualizar la contraseña.'], 500);
}
