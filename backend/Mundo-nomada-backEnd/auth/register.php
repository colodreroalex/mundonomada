<?php
declare(strict_types=1);

require_once __DIR__ . '/seguridad.php';
require_once __DIR__ . '/../conexion_postgres.php';

aplicarCors(['POST', 'OPTIONS']);
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    responderJson(['error' => 'Método no permitido'], 405);
}

$input = json_decode(file_get_contents('php://input'), true);
$name = is_array($input) ? trim((string) ($input['name'] ?? '')) : '';
$email = is_array($input) ? strtolower(trim((string) ($input['email'] ?? ''))) : '';
$password = is_array($input) ? (string) ($input['password'] ?? '') : '';

if ($name === '' || !filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($password) < 8) {
    responderJson(['error' => 'Revisa el nombre, correo y contraseña (mínimo 8 caracteres).'], 400);
}

$pdo = retornarConexionPostgres();
try {
    $pdo->beginTransaction();
    $stmt = $pdo->prepare(
        'insert into public.users (name, email, password, role)
         values (:name, :email, :password, :role)
         returning id, name, email, role, created_at, updated_at'
    );
    $stmt->execute([
        ':name' => $name,
        ':email' => $email,
        ':password' => password_hash($password, PASSWORD_DEFAULT),
        ':role' => 'user',
    ]);
    $user = $stmt->fetch();
    $pdo->commit();

    iniciarSesionSegura();
    session_regenerate_id(true);
    $_SESSION['user'] = $user;
    responderJson($user, 201);
} catch (PDOException $exception) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    if ($exception->getCode() === '23505') {
        responderJson(['error' => 'El correo electrónico ya está registrado.'], 409);
    }
    error_log('Mundo Nomada registration failed: ' . $exception->getMessage());
    responderJson(['error' => 'No se pudo completar el registro.'], 500);
}
