<?php
declare(strict_types=1);

require_once __DIR__ . '/../auth/seguridad.php';

exigirAdministrador(['POST']);
$d = json_decode(file_get_contents('php://input'), true);
$d = is_array($d) ? $d : [];
$n = textoValido($d['name'] ?? null, 100);
$e = textoValido($d['email'] ?? null, 254);
$e = $e !== null ? strtolower($e) : null;
$p = $d['password'] ?? null;
$r = $d['role'] ?? 'user';
if ($n === null || $e === null || !filter_var($e, FILTER_VALIDATE_EMAIL) || !contrasenaValida($p) || !in_array($r, ['user', 'admin'], true)) {
    responderJson(['error' => 'Datos no válidos. La contraseña debe tener entre 8 y 72 caracteres.'], 400);
}

try {
    $q = retornarConexionPostgres()->prepare(
        'insert into public.users (name, email, password, role) values (:n, :e, :p, :r) returning id, name, email, role'
    );
    $q->execute([':n' => $n, ':e' => $e, ':p' => password_hash($p, PASSWORD_DEFAULT), ':r' => $r]);
    responderJson(['result' => 'OK', 'message' => 'Usuario creado.', 'user' => $q->fetch()], 201);
} catch (PDOException $x) {
    if ($x->getCode() === '23505') {
        responderJson(['error' => 'El email ya está registrado.'], 409);
    }
    error_log('Error crear usuario: ' . $x->getMessage());
    responderJson(['error' => 'No se pudo crear el usuario.'], 500);
}
