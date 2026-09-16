<?php
declare(strict_types=1);

/**
 * Conexión preparada para Supabase PostgreSQL. Los endpoints se migrarán por
 * grupos a PDO para no interrumpir la instalación MySQL local durante la transición.
 */
function configuracionSupabase(): array
{
    $localConfig = __DIR__ . '/config/supabase.local.php';
    if (is_file($localConfig)) {
        $config = require $localConfig;
        if (is_array($config)) {
            return $config;
        }
    }

    return [
        'dsn' => getenv('MUNDONOMADA_SUPABASE_DSN') ?: '',
        'username' => getenv('MUNDONOMADA_SUPABASE_USER') ?: '',
        'password' => getenv('MUNDONOMADA_SUPABASE_PASSWORD') ?: '',
    ];
}

function retornarConexionPostgres(): PDO
{
    $config = configuracionSupabase();
    if (!in_array('pgsql', PDO::getAvailableDrivers(), true) || empty($config['dsn']) || empty($config['username']) || empty($config['password'])) {
        http_response_code(500);
        header('Content-Type: application/json; charset=UTF-8');
        echo json_encode(['status' => 'error', 'message' => 'La conexión PostgreSQL no está configurada.']);
        exit;
    }

    try {
        return new PDO(
            (string) $config['dsn'],
            (string) $config['username'],
            (string) $config['password'],
            [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ]
        );
    } catch (PDOException $exception) {
        error_log('Mundo Nomada PostgreSQL connection failed: ' . $exception->getMessage());
        http_response_code(500);
        header('Content-Type: application/json; charset=UTF-8');
        echo json_encode(['status' => 'error', 'message' => 'No se pudo conectar con el servicio de datos.']);
        exit;
    }
}
