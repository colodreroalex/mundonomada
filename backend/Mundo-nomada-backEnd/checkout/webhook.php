<?php
declare(strict_types=1);

/*
 * Webhook de Stripe: única ruta que marca pedidos como pagados o devuelve el
 * stock reservado. No usa sesión ni CORS; la autenticidad la da la firma.
 */
require_once __DIR__ . '/../conexion_postgres.php';
require_once __DIR__ . '/stripe.php';

header('Content-Type: application/json; charset=UTF-8');

function responderWebhook(int $codigo, string $mensaje): void
{
    http_response_code($codigo);
    echo json_encode(['mensaje' => $mensaje]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    responderWebhook(405, 'Método no permitido.');
}

$secreto = (string) (configuracionStripe()['webhook_secret'] ?? '');
$payload = (string) file_get_contents('php://input');
if ($secreto === '' || !firmaStripeValida($payload, $_SERVER['HTTP_STRIPE_SIGNATURE'] ?? '', $secreto)) {
    responderWebhook(400, 'Firma no válida.');
}

$evento = json_decode($payload, true);
$sesion = $evento['data']['object'] ?? null;
if (!is_array($sesion) || ($sesion['object'] ?? '') !== 'checkout.session') {
    responderWebhook(200, 'Evento ignorado.');
}

$pdo = retornarConexionPostgres();
try {
    switch ($evento['type'] ?? '') {
        case 'checkout.session.completed':
        case 'checkout.session.async_payment_succeeded':
            if (($sesion['payment_status'] ?? '') === 'paid') {
                confirmarPagoPedido($pdo, (string) $sesion['id'], $sesion['payment_intent'] ?? null);
            }
            break;
        case 'checkout.session.expired':
        case 'checkout.session.async_payment_failed':
            $orden = $pdo->prepare('select id from public.orders where payment_reference = :sid');
            $orden->execute([':sid' => (string) $sesion['id']]);
            $orderId = $orden->fetchColumn();
            if ($orderId !== false) {
                liberarPedido($pdo, (int) $orderId);
            }
            break;
    }
} catch (Throwable $error) {
    // Stripe reintentará el envío si respondemos con error.
    error_log('Mundo Nomada webhook failed: ' . $error->getMessage());
    responderWebhook(500, 'Error interno.');
}

responderWebhook(200, 'OK');
