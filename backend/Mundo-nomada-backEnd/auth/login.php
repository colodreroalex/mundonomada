<?php
declare(strict_types=1);

require_once __DIR__ . '/seguridad.php';
require_once __DIR__ . '/../conexion_postgres.php';

aplicarCors(['POST', 'OPTIONS']);
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    responderJson(['error' => 'Método no permitido'], 405);
}

$input = json_decode(file_get_contents('php://input'), true);
$email = is_array($input) ? strtolower(trim((string) ($input['email'] ?? ''))) : '';
$password = is_array($input) ? (string) ($input['password'] ?? '') : '';
if (!filter_var($email, FILTER_VALIDATE_EMAIL) || $password === '') {
    responderJson(['error' => 'Correo o contraseña no válidos'], 401);
}

$identifier = hash('sha256', $email . '|' . ($_SERVER['REMOTE_ADDR'] ?? 'unknown'));
$pdo = retornarConexionPostgres();

try {
    $pdo->beginTransaction();
    $attemptStmt = $pdo->prepare(
        'select attempts, window_started_at, locked_until
         from public.login_attempts where identifier_hash = :identifier for update'
    );
    $attemptStmt->execute([':identifier' => $identifier]);
    $attempt = $attemptStmt->fetch();

    if ($attempt && $attempt['locked_until'] !== null && strtotime($attempt['locked_until']) > time()) {
        $pdo->commit();
        responderJson(['error' => 'Demasiados intentos. Inténtalo de nuevo más tarde.'], 429);
    }

    $userStmt = $pdo->prepare(
        'select id, name, email, password, role, created_at, updated_at
         from public.users where lower(email) = :email limit 1'
    );
    $userStmt->execute([':email' => $email]);
    $user = $userStmt->fetch();

    if (!$user || !password_verify($password, $user['password'])) {
        $windowExpired = !$attempt || strtotime($attempt['window_started_at']) < (time() - 900);
        $attempts = $windowExpired ? 1 : ((int) $attempt['attempts'] + 1);
        $lockedUntil = $attempts >= 5 ? date('c', time() + 900) : null;
        $writeAttempt = $pdo->prepare(
            'insert into public.login_attempts (identifier_hash, attempts, window_started_at, locked_until)
             values (:identifier, :attempts, now(), :locked_until)
             on conflict (identifier_hash) do update set
               attempts = excluded.attempts,
               window_started_at = case when :window_expired then now() else public.login_attempts.window_started_at end,
               locked_until = excluded.locked_until'
        );
        $writeAttempt->execute([
            ':identifier' => $identifier,
            ':attempts' => $attempts,
            ':locked_until' => $lockedUntil,
            ':window_expired' => $windowExpired,
        ]);
        $pdo->commit();
        responderJson(['error' => 'Correo o contraseña no válidos'], 401);
    }

    $pdo->prepare('delete from public.login_attempts where identifier_hash = :identifier')
        ->execute([':identifier' => $identifier]);

    if (($input['rememberMe'] ?? false) === true) {
        $token = bin2hex(random_bytes(32));
        $pdo->prepare("update public.users set remember_token = :token, token_expiry = now() + interval '30 days' where id = :id")
            ->execute([':token' => hash('sha256', $token), ':id' => $user['id']]);
        setcookie('remember_me', $token, cookieSegura() + ['expires' => time() + 86400 * 30]);
    }
    $pdo->commit();

    unset($user['password']);
    iniciarSesionSegura();
    session_regenerate_id(true);
    $_SESSION['user'] = $user;
    responderJson($user);
} catch (PDOException $exception) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log('Mundo Nomada login failed: ' . $exception->getMessage());
    responderJson(['error' => 'No se pudo iniciar sesión.'], 500);
}
