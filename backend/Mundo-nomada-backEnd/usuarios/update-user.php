<?php
declare(strict_types=1);

require_once __DIR__ . '/../auth/seguridad.php';

$admin = exigirAdministrador(['POST']);
$d = json_decode(file_get_contents('php://input'), true);
$d = is_array($d) ? $d : [];
$id = filter_var($d['id'] ?? null, FILTER_VALIDATE_INT);
if ($id === false || $id < 1) {
    responderJson(['error' => 'ID no válido.'], 400);
}
$n = textoValido($d['name'] ?? null, 100);
$e = textoValido($d['email'] ?? null, 254);
$e = $e !== null ? strtolower($e) : null;
$r = $d['role'] ?? 'user';
$p = $d['password'] ?? '';
if ($n === null || $e === null || !filter_var($e, FILTER_VALIDATE_EMAIL) || !in_array($r, ['user', 'admin'], true)
    || ($p !== '' && $p !== null && !contrasenaValida($p))) {
    responderJson(['error' => 'Datos no válidos. La contraseña, si se cambia, debe tener entre 8 y 72 caracteres.'], 400);
}
if ($id === $admin && $r !== 'admin') {
    responderJson(['error' => 'No puedes retirarte el rol administrador.'], 400);
}

$nuevaContrasena = is_string($p) && $p !== '';
try {
    // Si se cambia la contraseña, se invalida el resto de sesiones del usuario
    $q = retornarConexionPostgres()->prepare(
        "update public.users set name = :n, email = :e, role = cast(:r as public.user_role),
                password = case when :cambia then :p else password end,
                password_updated_at = case when :cambia2 then now() else password_updated_at end,
                remember_token = case when :cambia3 then null else remember_token end,
                token_expiry = case when :cambia4 then null else token_expiry end
          where id = :id
      returning id, name, email, role, created_at, updated_at"
    );
    $q->execute([
        ':n' => $n, ':e' => $e, ':r' => $r,
        ':p' => $nuevaContrasena ? password_hash($p, PASSWORD_DEFAULT) : '',
        ':cambia' => $nuevaContrasena ? 'true' : 'false',
        ':cambia2' => $nuevaContrasena ? 'true' : 'false',
        ':cambia3' => $nuevaContrasena ? 'true' : 'false',
        ':cambia4' => $nuevaContrasena ? 'true' : 'false',
        ':id' => $id,
    ]);
    $u = $q->fetch();
    if (!$u) {
        responderJson(['error' => 'Usuario no encontrado.'], 404);
    }
    if ($id === $admin && $nuevaContrasena) {
        // El propio admin conserva su sesión actual
        $_SESSION['user']['password_updated_at'] = retornarConexionPostgres()
            ->query('select password_updated_at from public.users where id = ' . (int) $admin)->fetchColumn();
    }
    responderJson(['result' => 'OK', 'user' => $u]);
} catch (PDOException $x) {
    if ($x->getCode() === '23505') {
        responderJson(['error' => 'El email ya está en uso.'], 409);
    }
    error_log('Error actualizar usuario: ' . $x->getMessage());
    responderJson(['error' => 'No se pudo actualizar el usuario.'], 500);
}
