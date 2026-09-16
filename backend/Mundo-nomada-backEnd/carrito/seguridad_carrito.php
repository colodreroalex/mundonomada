<?php
declare(strict_types=1);

require_once __DIR__ . '/../auth/seguridad.php';
require_once __DIR__ . '/../conexion_postgres.php';

function usuarioSesionCarrito(array $metodos): int
{
    aplicarCors($metodos);
    if (!in_array($_SERVER['REQUEST_METHOD'], $metodos, true)) {
        responderJson(['resultado' => 'ERROR', 'mensaje' => 'Método no permitido.'], 405);
    }

    iniciarSesionSegura();
    $userId = $_SESSION['user']['id'] ?? null;
    if (!is_int($userId) && !ctype_digit((string) $userId)) {
        responderJson(['resultado' => 'ERROR', 'mensaje' => 'Debes iniciar sesión.'], 401);
    }
    return (int) $userId;
}

function entradaJsonCarrito(): array
{
    $input = json_decode(file_get_contents('php://input'), true);
    if (!is_array($input)) {
        responderJson(['resultado' => 'ERROR', 'mensaje' => 'Datos no válidos.'], 400);
    }
    return $input;
}
