<?php
declare(strict_types=1);

/**
 * La configuración local vive en config/database.local.php (ignorado por Git)
 * o en variables de entorno MUNDONOMADA_DB_*. Nunca se guardan credenciales
 * reales en el repositorio.
 */
function configuracionBaseDatos(): array
{
    $localConfig = __DIR__ . '/config/database.local.php';
    if (is_file($localConfig)) {
        $config = require $localConfig;
        if (is_array($config)) {
            return $config;
        }
    }

    return [
        'host' => getenv('MUNDONOMADA_DB_HOST') ?: '127.0.0.1',
        'port' => (int) (getenv('MUNDONOMADA_DB_PORT') ?: 3306),
        'database' => getenv('MUNDONOMADA_DB_NAME') ?: 'mundonomada',
        'username' => getenv('MUNDONOMADA_DB_USER') ?: '',
        'password' => getenv('MUNDONOMADA_DB_PASSWORD') ?: '',
    ];
}

function retornarConexion(): mysqli
{
    $config = configuracionBaseDatos();

    if (empty($config['username'])) {
        http_response_code(500);
        header('Content-Type: application/json; charset=UTF-8');
        echo json_encode(['status' => 'error', 'message' => 'La base de datos no está configurada.']);
        exit;
    }

    mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

    try {
        $conexion = mysqli_init();
        $conexion->options(MYSQLI_OPT_CONNECT_TIMEOUT, 5);
        $conexion->real_connect(
            (string) $config['host'],
            (string) $config['username'],
            (string) $config['password'],
            (string) $config['database'],
            (int) $config['port']
        );
        $conexion->set_charset('utf8mb4');

        return $conexion;
    } catch (mysqli_sql_exception $exception) {
        error_log('Mundo Nomada database connection failed: ' . $exception->getMessage());
        http_response_code(500);
        header('Content-Type: application/json; charset=UTF-8');
        echo json_encode(['status' => 'error', 'message' => 'No se pudo conectar con el servicio de datos.']);
        exit;
    }
}
