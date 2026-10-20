<?php

// Copia este archivo como stripe.local.php para probar en local. El archivo real
// está ignorado por Git. En Render usa las variables STRIPE_SECRET_KEY y
// STRIPE_WEBHOOK_SECRET. Empieza siempre con claves de prueba (sk_test_...).
return [
    'secret_key' => 'sk_test_cambia-esta-clave',
    'webhook_secret' => 'whsec_cambia-este-secreto',
];
