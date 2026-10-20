# Guía del propietario de Mundo Nómada

Esta guía contiene únicamente lo que debe hacer el propietario de la tienda. No necesitas saber programar. Cuando termines un paso, responde en el chat con el número del paso y se continuará con la parte técnica.

## Regla importante

No compartas en el chat contraseñas, claves, tokens, datos bancarios ni documentos de identidad. Las claves se pegan directamente en el panel de Render o de Supabase, nunca en GitHub.

## Estado actual (20 de octubre de 2026)

- Base de datos Supabase en Europa, con tablas y protecciones aplicadas.
- Web y API publicadas como demostración en Render.
- El pago con Stripe está programado: el servidor calcula el importe, reserva el stock y solo marca un pedido como pagado cuando Stripe lo confirma.
- La administración tiene una pantalla **Pedidos** para ver qué hay que enviar.

## Pasos para abrir la tienda

### Paso 1. Aplicar la actualización de la base de datos

1. Abre [Supabase](https://supabase.com/dashboard) → proyecto **mundo-nomada** → **SQL Editor**.
2. Pega el contenido de `supabase/migrations/20261020120000_stripe_checkout.sql` y pulsa **Run**.
3. Debe terminar con "Success". Responde: **Paso 1 hecho**.

### Paso 2. Crear la cuenta de Stripe (modo de prueba)

1. Crea una cuenta en [Stripe](https://dashboard.stripe.com/register) con los datos del negocio.
2. Activa **Test mode** (interruptor arriba a la derecha).
3. En **Developers → API keys** copia la **Secret key** (`sk_test_...`).
4. En Render → servicio → **Environment**, añade `STRIPE_SECRET_KEY` con ese valor.

### Paso 3. Conectar el webhook de Stripe

1. En Stripe → **Developers → Webhooks → Add endpoint**.
2. URL: `https://<tu-web>/api_php/checkout/webhook.php`
   (hoy: `https://mundo-nomada-test.onrender.com/api_php/checkout/webhook.php`).
3. Eventos: `checkout.session.completed`, `checkout.session.expired`,
   `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`.
4. Copia el **Signing secret** (`whsec_...`) y añádelo en Render como `STRIPE_WEBHOOK_SECRET`.
5. En Stripe → **Settings → Customer emails**, activa **Successful payments** para que el cliente reciba el justificante.

### Paso 4. Probar una compra de prueba

Con el despliegue nuevo, compra en la web usando la tarjeta de prueba `4242 4242 4242 4242`, cualquier fecha futura y cualquier CVC. Comprueba que el pedido aparece como **pagado** en Admin → Pedidos y que el stock ha bajado. Después responde: **Paso 4 hecho**.

### Paso 5. Cuenta de administración

1. Regístrate en la web con el email de la tienda.
2. En Supabase → SQL Editor ejecuta, cambiando el email:
   `update public.users set role = 'admin' where lower(email) = lower('tu-email@ejemplo.com');`
3. Cierra sesión y vuelve a entrar: verás el panel de administración.

### Paso 6. Catálogo real

Desde el panel, crea las categorías y productos reales con su precio **sin IVA** (la web añade el 21 %), stock e imagen. Elimina los tres productos "de prueba".

### Paso 7. Dominio y hosting sin suspensión

1. Compra el dominio (por ejemplo `mundonomada.es`).
2. En Render, cambia el plan del servicio a **Starter** (el gratuito se duerme y tarda en despertar).
3. En Render → **Settings → Custom Domains**, añade el dominio y sigue las instrucciones de DNS.
4. En **Environment** añade `MUNDONOMADA_ALLOWED_ORIGIN` = `https://tu-dominio` (sin barra final).
5. Actualiza la URL del webhook de Stripe al nuevo dominio.

### Paso 8. Textos legales

Revisa y envía los datos reales para: aviso legal (titular, NIF, dirección), privacidad, cookies, condiciones de compra, envíos y devoluciones. Se actualizarán las páginas del pie de la web.

### Paso 9. Abrir la tienda

1. En Stripe completa la verificación del negocio y la cuenta bancaria, desactiva **Test mode** y repite los pasos 2 y 3 con las claves reales (`sk_live_...` y su nuevo `whsec_...`).
2. En Render pon `MUNDONOMADA_PRODUCTION` = `1`. Esto quita el aviso de demostración y permite que Google indexe la web.
3. Haz una compra real pequeña y reembólsala desde Stripe para confirmar que todo funciona.

## Uso diario

- **Nuevos pedidos:** Admin → Pedidos, filtro **pagado**. Prepara el paquete y pulsa **Marcar como enviado**; cuando llegue, **Marcar como completado**.
- **Reembolsos y cancelaciones de pedidos pagados:** se hacen en el panel de Stripe. Después ajusta el stock desde Modificar producto si la prenda vuelve a la tienda.
- **Pedidos "pendiente" o "cancelado":** son pagos que el cliente no terminó. El stock se devuelve solo cuando Stripe los caduca (unos 30 minutos).

## Antes de vender

- [x] Backend conectado a Supabase y probado.
- [x] Usuarios, carrito y stock probados con datos ficticios.
- [ ] Pago validado en modo de pruebas con el webhook (pasos 1–4).
- [ ] Cuenta de administración y catálogo real (pasos 5–6).
- [ ] Dominio, HTTPS y plan sin suspensión (paso 7).
- [ ] Aviso legal, privacidad, cookies, devoluciones y contacto revisados (paso 8).
- [ ] Copia de seguridad: en Supabase plan Pro hay copias diarias; en el gratuito, descarga una copia antes de abrir.
