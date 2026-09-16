<?php
declare(strict_types=1);

require_once __DIR__ . '/seguridad.php';
require_once __DIR__ . '/../conexion_postgres.php';

aplicarCors(['POST', 'OPTIONS']);
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    responderJson(['error' => 'Método no permitido'], 405);
}

iniciarSesionSegura();
$userId = $_SESSION['user']['id'] ?? null;
if ($userId !== null) {
    $pdo = retornarConexionPostgres();
    $pdo->prepare('update public.users set remember_token = null, token_expiry = null where id = :id')
        ->execute([':id' => $userId]);
}

$_SESSION = [];
if (ini_get('session.use_cookies')) {
    $params = session_get_cookie_params();
    setcookie(session_name(), '', [
        'expires' => time() - 3600,
        'path' => $params['path'] ?: '/',
        'secure' => (bool) $params['secure'],
        'httponly' => (bool) $params['httponly'],
        'samesite' => $params['samesite'] ?? 'Lax',
    ]);
}
session_destroy();
setcookie('remember_me', '', cookieSegura() + ['expires' => time() - 3600]);
responderJson(['message' => 'Sesión cerrada']);
