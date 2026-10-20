<?php
declare(strict_types=1);

require_once __DIR__ . '/seguridad.php';

aplicarCors(['GET', 'OPTIONS']);
iniciarSesionSegura();
if (isset($_SESSION['user'])) {
    responderJson(usuarioPublico($_SESSION['user']));
}
if (empty($_COOKIE['remember_me']) || !is_string($_COOKIE['remember_me']) || strlen($_COOKIE['remember_me']) !== 64) {
    responderJson(['error' => 'No hay sesión activa'], 401);
}

$pdo = retornarConexionPostgres();
$stmt = $pdo->prepare(
    'select id, name, email, role, created_at, updated_at, password_updated_at
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

// Rotación: cada uso del token "recordarme" lo sustituye por uno nuevo, así un
// token robado deja de valer en cuanto la persona legítima vuelve a entrar
$nuevo = bin2hex(random_bytes(32));
$pdo->prepare("update public.users set remember_token = :token, token_expiry = now() + interval '30 days' where id = :id")
    ->execute([':token' => hash('sha256', $nuevo), ':id' => $user['id']]);
setcookie('remember_me', $nuevo, cookieSegura() + ['expires' => time() + 86400 * 30]);

session_regenerate_id(true);
$_SESSION['user'] = $user;
responderJson(usuarioPublico($user));
