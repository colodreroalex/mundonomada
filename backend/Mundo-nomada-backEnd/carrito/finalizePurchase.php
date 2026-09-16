<?php
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header("Access-Control-Allow-Origin: http://localhost:4200");
    header("Access-Control-Allow-Credentials: true");
    header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
    exit(0);
}

// Cabeceras para la petición
header("Access-Control-Allow-Origin: http://localhost:4200");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header('Content-Type: application/json');

// Iniciar la sesión para obtener la información del usuario
session_start();

if (!isset($_SESSION['user']['id'])) {
    http_response_code(401);
    echo json_encode(['resultado' => 'ERROR', 'mensaje' => 'Debes iniciar sesión para finalizar la compra.']);
    exit;
}

// Incluir el archivo de conexión
require("../conexion.php");

// Obtener y decodificar el JSON enviado por el frontend
$input = file_get_contents('php://input');
$data = json_decode($input, true);

// Verificar que se reciba la información del carrito
if (!isset($data['cart']) || !is_array($data['cart'])) {
    echo json_encode([
        'resultado' => 'ERROR',
        'mensaje'   => 'No se recibió información válida del carrito.'
    ]);
    exit;
}

$cartItems = $data['cart'];
if (count($cartItems) === 0) {
    echo json_encode([
        'resultado' => 'ERROR',
        'mensaje'   => 'El carrito está vacío.'
    ]);
    exit;
}

// Obtener la conexión usando tu función personalizada
$conn = retornarConexion();

// Iniciar transacción para asegurar la atomicidad de las operaciones
$conn->begin_transaction();

try {
    // El usuario solo procede de la sesión. Nunca aceptamos user_id del navegador.
    $user_id = (int) $_SESSION['user']['id'];
    $crear_registro_pedido = true;
    
    // Calcular el total del pedido
    $total = 0;
    $items_for_order = [];
    
    // Primera pasada: verificar stock y calcular total
    $seenCartIds = [];
    foreach ($cartItems as $item) {
        // Se espera que cada item tenga 'id' (ID del registro en carrito), 'producto_id' y 'cantidad'
        if (!isset($item['id'], $item['producto_id'], $item['cantidad'])) {
            throw new Exception("Datos del carrito incompletos.");
        }
        
        $producto_id = $item['producto_id'];
        $cantidad = $item['cantidad'];

        if ($cantidad <= 0 || in_array($item['id'], $seenCartIds, true)) {
            throw new Exception('Datos de carrito no válidos.');
        }
        $seenCartIds[] = $item['id'];

        // La línea debe pertenecer al usuario y sus valores no se pueden manipular en el navegador.
        $cartStmt = $conn->prepare('SELECT producto_id, cantidad FROM carrito WHERE id = ? AND user_id = ?');
        $cartStmt->bind_param('ii', $item['id'], $user_id);
        $cartStmt->execute();
        $storedCartItem = $cartStmt->get_result()->fetch_assoc();
        $cartStmt->close();
        if (!$storedCartItem || (int) $storedCartItem['producto_id'] !== (int) $producto_id || (int) $storedCartItem['cantidad'] !== (int) $cantidad) {
            throw new Exception('El carrito ha cambiado. Actualiza la página e inténtalo de nuevo.');
        }
        
        // Consultar información del producto para obtener precio y stock
        $stmt = $conn->prepare("SELECT ProductoID, precio, stock FROM productos WHERE ProductoID = ? FOR UPDATE");
        if (!$stmt) {
            throw new Exception("Error en la preparación de la consulta: " . $conn->error);
        }
        $stmt->bind_param("i", $producto_id);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows === 0) {
            throw new Exception("Producto con ID $producto_id no encontrado.");
        }
        
        $producto = $result->fetch_assoc();
        $stmt->close();
        
        // Verificar stock suficiente
        if ($producto['stock'] < $cantidad) {
            throw new Exception("Stock insuficiente para el producto con ID $producto_id. Stock actual: {$producto['stock']}, cantidad solicitada: $cantidad.");
        }
        
        // Calcular subtotal para este producto
        $precio = (float)$producto['precio'];
        $subtotal = $precio * $cantidad;
        $total += $subtotal;
        
        // Guardar información para crear los items del pedido después
        $items_for_order[] = [
            'producto_id' => $producto_id,
            'cantidad' => $cantidad,
            'precio_unitario' => $precio
        ];
    }
    
    // Solo crear registro de pedido si es un usuario registrado
    if ($crear_registro_pedido) {
        // Crear el pedido en la tabla 'orders'
        $fecha = date('Y-m-d H:i:s');
        $estado = 'pendiente';
        
        $stmt = $conn->prepare("INSERT INTO orders (user_id, fecha, total, estado) VALUES (?, ?, ?, ?)");
        if (!$stmt) {
            throw new Exception("Error al preparar la inserción del pedido: " . $conn->error);
        }
        
        $stmt->bind_param("isds", $user_id, $fecha, $total, $estado);
        if (!$stmt->execute()) {
            throw new Exception("Error al crear el pedido: " . $stmt->error);
        }
        
        $order_id = $conn->insert_id;
        $stmt->close();
        
        // Crear los items del pedido en la tabla 'order_items'
        $stmt = $conn->prepare("INSERT INTO order_items (order_id, producto_id, cantidad, precio_unitario) VALUES (?, ?, ?, ?)");
        if (!$stmt) {
            throw new Exception("Error al preparar la inserción de los items del pedido: " . $conn->error);
        }
        
        foreach ($items_for_order as $item) {
            $stmt->bind_param("iiid", $order_id, $item['producto_id'], $item['cantidad'], $item['precio_unitario']);
            if (!$stmt->execute()) {
                throw new Exception("Error al insertar item en el pedido: " . $stmt->error);
            }
        }
        
        $stmt->close();
    }
    
    // Segunda pasada: actualizar stock y limpiar carrito
    foreach ($cartItems as $item) {
        $carrito_id = $item['id'];
        $producto_id = $item['producto_id'];
        $cantidad = $item['cantidad'];
        
        // Actualizar stock del producto
        $stmt = $conn->prepare("UPDATE productos SET stock = stock - ? WHERE ProductoID = ?");
        if (!$stmt) {
            throw new Exception("Error en la preparación de la actualización de stock: " . $conn->error);
        }
        
        $stmt->bind_param("ii", $cantidad, $producto_id);
        if (!$stmt->execute()) {
            throw new Exception("Error al actualizar el stock para el producto con ID $producto_id.");
        }
        $stmt->close();
        
        // Eliminar el item del carrito
        $stmt = $conn->prepare("DELETE FROM carrito WHERE id = ? AND user_id = ?");
        if (!$stmt) {
            throw new Exception("Error en la preparación para eliminar el item: " . $conn->error);
        }
        
        $stmt->bind_param("ii", $carrito_id, $user_id);
        if (!$stmt->execute()) {
            throw new Exception("Error al eliminar el item del carrito con ID $carrito_id.");
        }
        if ($stmt->affected_rows !== 1) {
            throw new Exception('No se pudo actualizar el carrito.');
        }
        $stmt->close();
    }
    
    // Si todo salió bien, confirmar la transacción y devolver respuesta exitosa
    $conn->commit();
    
    // Preparar mensaje de respuesta según el tipo de usuario
    $mensaje_exito = $crear_registro_pedido 
        ? 'Compra finalizada con éxito. Su pedido ha sido registrado en su historial.' 
        : 'Compra finalizada con éxito.';  // Para usuarios invitados
    
    echo json_encode([
        'resultado' => 'OK',
        'mensaje'   => $mensaje_exito,
        'usuario_registrado' => $crear_registro_pedido
    ]);
} catch (Exception $e) {
    // En caso de error, revertir la transacción
    $conn->rollback();
    
    echo json_encode([
        'resultado' => 'ERROR',
        'mensaje' => $e->getMessage()
    ]);
}

$conn->close();
?>
