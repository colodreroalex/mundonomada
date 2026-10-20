<?php
declare(strict_types=1);

require_once __DIR__ . '/seguridad.php';

aplicarCors(['POST', 'OPTIONS']);
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    responderJson(['error' => 'Método no permitido'], 405);
}

$input = json_decode(file_get_contents('php://input'), true);
$email = is_array($input) ? strtolower(trim((string) (is_scalar($input['email'] ?? null) ? $input['email'] : ''))) : '';
$password = is_array($input) && is_string($input['password'] ?? null) ? $input['password'] : '';
if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 254 || $password === '' || strlen($password) > 1024) {
    responderJson(['error' => 'Correo o contraseña no válidos'], 401);
}

// Tres límites independientes (ventanas en segundos):
// - por IP: frena el relleno de credenciales contra muchas cuentas
// - por cuenta e IP: frena la fuerza bruta clásica sin bloquear a la víctima desde su propia IP
// - por cuenta (umbral alto): frena ataques repartidos entre muchas IPs
$ip = ipCliente();
$claveIp = 'login-ip|' . $ip;
$claveCuentaIp = 'login-cuenta-ip|' . $email . '|' . $ip;
$claveCuenta = 'login-cuenta|' . $email;

// Hash de relleno: si el email no existe se verifica igualmente para que el
// tiempo de respuesta no revele qué cuentas están registradas
const HASH_RELLENO = '$2y$10$3oQICFQV/TZkQMhNDdcwWeA5Tmc9Fddrz0uTxlJBGp1kXFK4Tvlyq';

$pdo = retornarConexionPostgres();

try {
    if (intentosBloqueados($pdo, $claveIp) || intentosBloqueados($pdo, $claveCuentaIp) || intentosBloqueados($pdo, $claveCuenta)) {
        responderJson(['error' => 'Demasiados intentos. Inténtalo de nuevo más tarde.'], 429);
    }

    $userStmt = $pdo->prepare(
        'select id, name, email, password, role, created_at, updated_at, password_updated_at
         from public.users where lower(email) = :email limit 1'
    );
    $userStmt->execute([':email' => $email]);
    $user = $userStmt->fetch();

    $valida = password_verify($password, $user ? $user['password'] : HASH_RELLENO);
    if (!$user || !$valida) {
        registrarIntento($pdo, $claveIp, 20, 900, 900);
        registrarIntento($pdo, $claveCuentaIp, 5, 900, 900);
        registrarIntento($pdo, $claveCuenta, 30, 3600, 900);
        responderJson(['error' => 'Correo o contraseña no válidos'], 401);
    }

    borrarIntentos($pdo, $claveCuentaIp);

    if (password_needs_rehash($user['password'], PASSWORD_DEFAULT)) {
        $pdo->prepare('update public.users set password = :password where id = :id')
            ->execute([':password' => password_hash($password, PASSWORD_DEFAULT), ':id' => $user['id']]);
    }

    if (($input['rememberMe'] ?? false) === true) {
        $token = bin2hex(random_bytes(32));
        $pdo->prepare("update public.users set remember_token = :token, token_expiry = now() + interval '30 days' where id = :id")
            ->execute([':token' => hash('sha256', $token), ':id' => $user['id']]);
        setcookie('remember_me', $token, cookieSegura() + ['expires' => time() + 86400 * 30]);
    }

    unset($user['password']);
    iniciarSesionSegura();
    session_regenerate_id(true);
    $_SESSION['user'] = $user;
    responderJson(usuarioPublico($user));
} catch (PDOException $exception) {
    error_log('Mundo Nomada login failed: ' . $exception->getMessage());
    responderJson(['error' => 'No se pudo iniciar sesión.'], 500);
}
