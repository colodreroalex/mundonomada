<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=UTF-8');
require_once __DIR__ . '/conexion_postgres.php';
retornarConexionPostgres()->query('select 1');
http_response_code(200);
echo json_encode(['status' => 'ok']);
