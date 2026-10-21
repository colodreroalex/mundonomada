<?php
declare(strict_types=1);

require_once __DIR__ . '/../auth/seguridad.php';

aplicarCors(['GET']);
iniciarSesionSegura();
$id = $_SESSION['user']['id'] ?? null;
if (!$id) {
    responderJson(['resultado' => 'ERROR', 'mensaje' => 'No has iniciado sesión.'], 401);
}

try {
    // Incluye los datos de factura y envío para poder descargar la factura desde el perfil
    $q = retornarConexionPostgres()->prepare(
        'select id, fecha, total, subtotal, iva, envio, precios_con_iva, estado, paid_at, invoice_number, invoice_date,
                shipping_name, shipping_address, shipping_postal_code, shipping_city, shipping_province,
                shipping_phone, shipping_email
           from public.orders where user_id = :id order by fecha desc'
    );
    $q->execute([':id' => (int) $id]);
    responderJson(['resultado' => 'OK', 'orders' => $q->fetchAll()]);
} catch (PDOException $e) {
    error_log('Error pedidos: ' . $e->getMessage());
    responderJson(['resultado' => 'ERROR', 'mensaje' => 'No se pudieron obtener los pedidos.'], 500);
}
