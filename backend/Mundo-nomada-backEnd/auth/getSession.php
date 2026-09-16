<?php
declare(strict_types=1);

require_once __DIR__ . '/seguridad.php';
require_once __DIR__ . '/../conexion_postgres.php';

aplicarCors(['GET', 'OPTIONS']);
iniciarSesionSegura();
if (isset($_SESSION['user'])) {
    responderJson($_SESSION['user']);
}
if (empty($_COOKIE['remember_me'])) {
    responderJson(['error' => 'No hay sesión activa'], 401);
}

$pdo = retornarConexionPostgres();
$stmt = $pdo->prepare(
    'select id, name, email, role, created_at, updated_at
     from public.users
     where remember_token = :token and token_expiry > now()
     limit 1'
);
$stmt->execute([':token' => hash('sha256', (string) $_COOKIE['remember_me'])]);
$user = $stmt->fetch();
if (!$user) {
    setcookie('remember_me', '', cookieSegura() + ['expires' => time() - 3600]);
    responderJson(['error' => 'No hay sesión activa'], 401);
}

session_regenerate_id(true);
$_SESSION['user'] = $user;
responderJson($user);
