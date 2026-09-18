<?php
declare(strict_types=1);

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

function iniciarSesionSegura(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }

    $esHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');

    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'secure' => $esHttps,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    session_start();
}

function responderJson(array $respuesta, int $codigo = 200): void
{
    http_response_code($codigo);
    echo json_encode($respuesta);
    exit;
}

function cookieSegura(): array
{
    $esHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');

    return [
        'path' => '/',
        'secure' => $esHttps,
        'httponly' => true,
        'samesite' => 'Lax',
    ];
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
