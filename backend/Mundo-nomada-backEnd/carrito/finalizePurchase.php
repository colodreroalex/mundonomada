<?php
/*
 * No crea pedidos ni reduce stock desde el navegador. El flujo definitivo
 * debe recibir una confirmación verificable del proveedor de pago en un
 * endpoint privado (webhook) antes de marcar un pedido como pagado.
 */
require_once __DIR__ . '/seguridad_carrito.php';

usuarioSesionCarrito(['POST']);
responderJson([
    'resultado' => 'ERROR',
    'mensaje' => 'El pago online aún no está configurado de forma segura. No se ha creado ningún pedido ni cobrado ningún importe.'
], 409);
