<?php
function retornarConexion() {
    $host = "localhost"; // Quita el :3306 de aquí, mysqli usa el puerto por defecto
    $user = "root";
    $pass = "";
    $dbname = "mundonomada3";

    mysqli_report(MYSQLI_REPORT_OFF);

    try {
        $conexion = @new mysqli($host, $user, $pass, $dbname);

        if ($conexion->connect_error) {
            throw new Exception($conexion->connect_error);
        }

        $conexion->set_charset("utf8mb4");
        return $conexion;

    } catch (Exception $e) {
        header("Content-Type: application/json; charset=UTF-8");
        http_response_code(500);
        
        echo json_encode([
            "status" => "error",
            "message" => "Error de conexión a la base de datos: " . $e->getMessage()
        ]);
        exit();
    }
}
?>