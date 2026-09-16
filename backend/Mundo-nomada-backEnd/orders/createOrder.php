<?php
/* Ruta retirada: nunca acepta total, precio, estado ni artículos desde el navegador.
 * El único creador futuro será el webhook verificado del proveedor de pago. */
declare(strict_types=1);require_once __DIR__.'/../auth/seguridad.php';aplicarCors(['POST']);responderJson(['resultado'=>'ERROR','mensaje'=>'La creación directa de pedidos está deshabilitada por seguridad.'],405);
