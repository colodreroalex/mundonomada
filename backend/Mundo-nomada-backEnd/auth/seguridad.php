<?php
declare(strict_types=1);

require_once __DIR__ . '/../conexion_postgres.php';

function aplicarCors(array $metodos): void
{
    $origenPermitido = getenv('MUNDONOMADA_ALLOWED_ORIGIN') ?: (getenv('RENDER_EXTERNAL_URL') ?: 'http://localhost:4200');
    $origen = $_SERVER['HTTP_ORIGIN'] ?? '';

    if ($origen === $origenPermitido) {
        header('Access-Control-Allow-Origin: ' . $origenPermitido);
        header('Access-Control-Allow-Credentials: true');
        header('Vary: Origin');
    }

    header('Access-Control-Allow-Methods: ' . implode(', ', $metodos));
    header('Access-Control-Allow-Headers: Content-Type');
    header('Content-Type: application/json; charset=UTF-8');
    // Las respuestas de la API pueden contener datos personales: nunca en caché
    header('Cache-Control: no-store');

    // Todas las mutaciones de esta API usan JSON. Rechaza formularios y
    // peticiones de otros sitios antes de leer cookies o modificar datos.
    if (!in_array($_SERVER['REQUEST_METHOD'], ['GET', 'HEAD', 'OPTIONS'], true)) {
        if (($origen !== '' && $origen !== $origenPermitido)
            || (($_SERVER['HTTP_SEC_FETCH_SITE'] ?? '') === 'cross-site')) {
            responderJson(['error' => 'Origen no permitido.'], 403);
        }
        $tipo = strtolower(trim(explode(';', $_SERVER['CONTENT_TYPE'] ?? '')[0]));
        if ($tipo !== 'application/json') {
            responderJson(['error' => 'Se requiere contenido JSON.'], 415);
        }
    }

    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(204);
        exit;
    }
}

/**
 * Inicia la sesión y comprueba en cada petición que el usuario sigue
 * existiendo, con el mismo rol y sin haber cambiado la contraseña desde
 * otro dispositivo. Así quitar el rol de admin o borrar a alguien surte
 * efecto al momento en todas sus sesiones.
 */
function iniciarSesionSegura(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }

    session_set_cookie_params(cookieSegura() + ['lifetime' => 0]);
    session_start();

    $id = $_SESSION['user']['id'] ?? null;
    if ($id === null) {
        return;
    }

    try {
        $consulta = retornarConexionPostgres()->prepare(
            'select id, name, email, role, created_at, updated_at, password_updated_at
               from public.users where id = :id'
        );
        $consulta->execute([':id' => (int) $id]);
        $usuario = $consulta->fetch();
    } catch (PDOException $error) {
        error_log('Mundo Nomada session check failed: ' . $error->getMessage());
        responderJson(['error' => 'No se pudo comprobar la sesión.'], 503);
    }

    $contrasenaCambiada = $usuario
        && ($usuario['password_updated_at'] ?? null) !== ($_SESSION['user']['password_updated_at'] ?? null);
    if (!$usuario || $contrasenaCambiada) {
        cerrarSesionLocal();
        return;
    }

    // Rol, nombre y email siempre los de la base de datos, nunca los guardados
    $_SESSION['user'] = $usuario;
}

/** Vacía y destruye la sesión actual sin tocar la base de datos. */
function cerrarSesionLocal(): void
{
    $_SESSION = [];
    if (session_status() === PHP_SESSION_ACTIVE) {
        session_destroy();
    }
    setcookie(session_name(), '', cookieSegura() + ['expires' => time() - 3600]);
}

/** Datos públicos del usuario de la sesión (sin campos internos). */
function usuarioPublico(array $usuario): array
{
    unset($usuario['password'], $usuario['remember_token'], $usuario['token_expiry']);
    return $usuario;
}

function responderJson(array $respuesta, int $codigo = 200): void
{
    http_response_code($codigo);
    echo json_encode($respuesta);
    exit;
}

function esHttps(): bool
{
    return (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
}

function cookieSegura(): array
{
    return [
        'path' => '/',
        'secure' => esHttps(),
        'httponly' => true,
        'samesite' => 'Lax',
    ];
}

/**
 * IP del visitante. Render publica a través de Cloudflare: CF-Connecting-IP
 * lleva la IP real y Cloudflare la sobrescribe aunque el cliente la envíe.
 * Sin ella se usa la última entrada de X-Forwarded-For (las anteriores las
 * puede inventar el cliente). Fuera de un proxy de confianza, REMOTE_ADDR.
 */
function ipCliente(): string
{
    $detrasDeProxy = getenv('RENDER') !== false || getenv('MUNDONOMADA_TRUST_PROXY') === '1';
    $cloudflare = $_SERVER['HTTP_CF_CONNECTING_IP'] ?? '';
    if ($detrasDeProxy && filter_var($cloudflare, FILTER_VALIDATE_IP)) {
        return $cloudflare;
    }
    $reenviada = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? '';
    if ($detrasDeProxy && $reenviada !== '') {
        $partes = array_map('trim', explode(',', $reenviada));
        $ultima = end($partes);
        if (filter_var($ultima, FILTER_VALIDATE_IP)) {
            return $ultima;
        }
    }
    return $_SERVER['REMOTE_ADDR'] ?? 'desconocida';
}

/**
 * Límite de intentos con la tabla login_attempts. La clave se guarda con hash.
 * Devuelve true si la clave está bloqueada en este momento.
 */
function intentosBloqueados(PDO $pdo, string $clave): bool
{
    $consulta = $pdo->prepare('select locked_until from public.login_attempts where identifier_hash = :id');
    $consulta->execute([':id' => hash('sha256', $clave)]);
    $bloqueo = $consulta->fetchColumn();
    return $bloqueo !== false && $bloqueo !== null && strtotime((string) $bloqueo) > time();
}

/** Suma un intento a la clave y la bloquea al llegar a $maximo dentro de la ventana. */
function registrarIntento(PDO $pdo, string $clave, int $maximo, int $ventanaSegundos, int $bloqueoSegundos): void
{
    $pdo->prepare(
        "insert into public.login_attempts (identifier_hash, attempts, window_started_at, locked_until)
         values (:id, 1, now(), null)
         on conflict (identifier_hash) do update set
           attempts = case when public.login_attempts.window_started_at < now() - make_interval(secs => cast(:v1 as double precision))
                           then 1 else public.login_attempts.attempts + 1 end,
           window_started_at = case when public.login_attempts.window_started_at < now() - make_interval(secs => cast(:v2 as double precision))
                                    then now() else public.login_attempts.window_started_at end,
           locked_until = case when public.login_attempts.window_started_at >= now() - make_interval(secs => cast(:v3 as double precision))
                                    and public.login_attempts.attempts + 1 >= cast(:maximo as integer)
                               then now() + make_interval(secs => cast(:bloqueo as double precision)) else null end"
    )->execute([
        ':id' => hash('sha256', $clave),
        ':v1' => $ventanaSegundos,
        ':v2' => $ventanaSegundos,
        ':v3' => $ventanaSegundos,
        ':maximo' => $maximo,
        ':bloqueo' => $bloqueoSegundos,
    ]);
}

function borrarIntentos(PDO $pdo, string $clave): void
{
    $pdo->prepare('delete from public.login_attempts where identifier_hash = :id')
        ->execute([':id' => hash('sha256', $clave)]);
}

/** Comprueba y registra un uso de una acción limitada; responde 429 si se supera. */
function limitarAccion(string $clave, int $maximo, int $ventanaSegundos, int $bloqueoSegundos): void
{
    $pdo = retornarConexionPostgres();
    if (intentosBloqueados($pdo, $clave)) {
        responderJson(['error' => 'Demasiados intentos. Inténtalo de nuevo más tarde.'], 429);
    }
    registrarIntento($pdo, $clave, $maximo, $ventanaSegundos, $bloqueoSegundos);
}

/** Texto obligatorio con longitud máxima en caracteres. */
function textoValido($valor, int $maximo, bool $obligatorio = true): ?string
{
    if ($valor === null || $valor === '') {
        return $obligatorio ? null : '';
    }
    if (!is_string($valor) && !is_int($valor) && !is_float($valor)) {
        return null;
    }
    $texto = trim((string) $valor);
    if (($obligatorio && $texto === '') || mb_strlen($texto) > $maximo) {
        return null;
    }
    return $texto;
}

/** Contraseña de 8 a 72 bytes (límite de bcrypt). */
function contrasenaValida($valor): bool
{
    return is_string($valor) && strlen($valor) >= 8 && strlen($valor) <= 72;
}

function exigirAdministrador(array $metodos): int
{
    aplicarCors($metodos);
    if (!in_array($_SERVER['REQUEST_METHOD'], $metodos, true)) {
        responderJson(['resultado' => 'ERROR', 'mensaje' => 'Método no permitido.'], 405);
    }
    iniciarSesionSegura();
    if (($_SESSION['user']['role'] ?? null) !== 'admin') {
        responderJson(['resultado' => 'ERROR', 'mensaje' => 'No tienes permisos para realizar esta acción.'], 403);
    }
    return (int) $_SESSION['user']['id'];
}
