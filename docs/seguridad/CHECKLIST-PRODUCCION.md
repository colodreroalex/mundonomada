# Lista de seguridad antes de abrir la tienda

Complementa la [Guía del propietario](../GUIA_DEL_PROPIETARIO.md) y el [informe de la auditoría](INFORME-PENTEST.md).
Marca cada punto al hacerlo. Ninguno de estos pasos requiere programar.

## Prioridad alta: hacer ya

- [ ] **EmailJS · destinatario fijo.** En [EmailJS](https://dashboard.emailjs.com) → *Email Templates* → la plantilla `template_wewwis4` → campo **To Email**: escribe directamente `mundonomadabaena@gmail.com`. No uses `{{to_email}}` ni ninguna otra variable. Si hoy usa una variable, cualquiera puede enviar correos con tu cuenta a quien quiera.
- [ ] **EmailJS · dominios permitidos.** *Account* → *Security* → activa la lista de dominios permitidos y añade solo el dominio de la tienda (y el de Render mientras lo uses).
- [ ] **EmailJS · límite de envíos.** *Account* → *Security* → **Rate Limit**: por ejemplo, 1 correo cada 10 segundos.
- [ ] **Contraseña de Supabase en texto plano.** Guarda en un gestor de contraseñas la que hay en `supabaseMundonomadaPass.txt` y **borra ese archivo** de la carpeta del proyecto.
- [ ] **Desplegar la rama de seguridad** y ejecutar `node tools/security-test.mjs https://<tu-web> --pasivo`. Debe dar 0 fallos.

## Supabase

- [ ] **Security Advisors.** *Advisors* → *Security*: 0 avisos.
- [ ] **Copias de seguridad.** Con el plan Pro hay copias diarias. Haz **una restauración de prueba** en un proyecto aparte antes de abrir, porque una copia que no se ha probado no garantiza nada.
- [ ] **Rotar la contraseña de `mundo_nomada_app`** antes de abrir.
  1. SQL Editor: `alter role mundo_nomada_app password '<nueva larga y aleatoria>';`
  2. Ponla en Render (`MUNDONOMADA_SUPABASE_PASSWORD`).
  3. Despliega.
- [ ] **Rotar la contraseña del usuario `postgres`** (*Project Settings → Database*) y guardarla solo en el gestor.
- [ ] **Autenticación en dos pasos (2FA)** en la cuenta de Supabase.

## Render

- [ ] **Variables necesarias:**
  - `MUNDONOMADA_SUPABASE_DSN`, `MUNDONOMADA_SUPABASE_USER` y `MUNDONOMADA_SUPABASE_PASSWORD`
  - `STRIPE_SECRET_KEY` y `STRIPE_WEBHOOK_SECRET`
  - `MUNDONOMADA_ALLOWED_ORIGIN`, cuando haya dominio propio
  - `MUNDONOMADA_PRODUCTION=1`, al abrir
- [ ] **Sin variables sobrantes.** No debe estar definida `MUNDONOMADA_TRUST_PROXY`, que es solo para pruebas locales; en Render se detecta sola.
- [ ] **2FA** en la cuenta de Render.
- [ ] **Avisos de despliegue fallido** por correo, en *Notifications*.

## Stripe

- [ ] **Webhook** con solo los 4 eventos: `checkout.session.completed`, `checkout.session.expired`, `checkout.session.async_payment_succeeded` y `checkout.session.async_payment_failed`.
- [ ] **Claves reales.** Al pasar a modo activo, crea una **clave restringida** si Stripe lo permite para Checkout, o usa la secreta, y no la compartas.
- [ ] **2FA** en la cuenta de Stripe y alertas de pagos y disputas activadas.
- [ ] **Pagos sobre pedidos cancelados.** Revisa en los registros de Render (busca `ALERTA: pago recibido para el pedido cancelado`) y reembolsa desde Stripe si aparece alguno.

## Dominio y correo

- [ ] **HTTPS** activo en el dominio propio (Render lo hace solo).
- [ ] **Comprobar HSTS** pasados unos días: `strict-transport-security` debe aparecer en las cabeceras. Solo cuando todo vaya bien, valorar el *preload* de HSTS.
- [ ] **Registros SPF/DMARC** del dominio, si se usa correo propio, para evitar suplantaciones.

## Cuentas de la tienda

- [ ] **Solo una cuenta admin,** con contraseña larga y única (gestor de contraseñas).
- [ ] **Usuarios de prueba borrados.** No debe quedar ninguno `@example.invalid` (SQL de la guía).
- [ ] **No reutilices** la contraseña de admin en ningún otro servicio.

## Revisión periódica (cada mes)

- [ ] **Dependencias:** `npm audit --omit=dev` en `frontend/mundo-nomada` y actualizar parches.
- [ ] **Imagen base:** actualizar `php:8.3-apache` y `node:22` (volver a desplegar basta para recoger los parches).
- [ ] **Pruebas de seguridad:** `node tools/security-test.mjs <web> --pasivo`.
- [ ] **Registros de Render:** revisar muchos 429 (ataques de contraseña) o 500 inesperados.
