<?php
declare(strict_types=1);

require_once __DIR__ . '/seguridad.php';

aplicarCors(['POST', 'OPTIONS']);
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    responderJson(['error' => 'Método no permitido'], 405);
}

$input = json_decode(file_get_contents('php://input'), true);
$input = is_array($input) ? $input : [];
$name = textoValido($input['name'] ?? null, 100);
$email = textoValido($input['email'] ?? null, 254);
$email = $email !== null ? strtolower($email) : null;
$password = $input['password'] ?? null;

if ($name === null || $email === null || !filter_var($email, FILTER_VALIDATE_EMAIL) || !contrasenaValida($password)) {
    responderJson(['error' => 'Revisa el nombre, correo y contraseña (entre 8 y 72 caracteres).'], 400);
}

// Como máximo 5 cuentas nuevas por IP y hora (frena bots y altas masivas)
limitarAccion('registro-ip|' . ipCliente(), 5, 3600, 3600);

$pdo = retornarConexionPostgres();
try {
    $stmt = $pdo->prepare(
        'insert into public.users (name, email, password, role)
         values (:name, :email, :password, :role)
         returning id, name, email, role, created_at, updated_at, password_updated_at'
    );
    $stmt->execute([
        ':name' => $name,
        ':email' => $email,
        ':password' => password_hash($password, PASSWORD_DEFAULT),
        ':role' => 'user',
    ]);
    $user = $stmt->fetch();

    iniciarSesionSegura();
    session_regenerate_id(true);
    $_SESSION['user'] = $user;
    responderJson(usuarioPublico($user), 201);
} catch (PDOException $exception) {
    if ($exception->getCode() === '23505') {
        responderJson(['error' => 'El correo electrónico ya está registrado.'], 409);
    }
    error_log('Mundo Nomada registration failed: ' . $exception->getMessage());
    responderJson(['error' => 'No se pudo completar el registro.'], 500);
}
