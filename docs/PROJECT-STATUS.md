# Estado del proyecto

Última revisión: 18 de septiembre de 2026.

## Publicado como demostración

https://mundo-nomada-test.onrender.com — Angular y API PHP en Render gratuito
(Frankfurt), conectados a Supabase PostgreSQL (Irlanda).

- Catálogo con tres artículos claramente ficticios.
- Registro, login, logout, sesión persistente, perfil y cambio de contraseña.
- Carrito por sesión con control de stock y propiedad en el servidor.
- Endpoints de administración y consulta de pedidos migrados a PDO PostgreSQL.
- Usuario de base de datos exclusivo del backend con permisos limitados.
- RLS en las siete tablas y sin acceso desde `anon`/`authenticated`.
- Cookies `Secure`, `HttpOnly`, `SameSite=Lax`; validación de origen y JSON en
  mutaciones; límite de intentos de login.
- Dockerfile conjunto, secretos fuera de Git, rutas Angular y health check real.

## Verificación

- Compilación Angular completada; persisten avisos de tamaño y dependencias CommonJS.
- Sintaxis PHP comprobada en todos los endpoints.
- 41 comprobaciones HTTP pasaron en local contra Supabase y en Render por HTTPS.
- Supabase Security Advisors: sin avisos después de la corrección aplicada.

El script reproducible es `tools/smoke-test.mjs`. Estos chequeos no equivalen a
una auditoría completa de todas las funciones administrativas o de seguridad.

## Git

Rama de despliegue: `codex/render-deployment`, basada en
`database-production-foundation`. Los cambios se revisan por PR; `main` no se
ha fusionado. El documento original de la raíz continúa sin versionar.

## Pendiente para vender

- Checkout, creación de pedidos y descuento de stock tras webhook verificado.
  Las rutas de compra permanecen bloqueadas; no se efectúan cobros.
- Catálogo e imágenes reales, cuenta de administración para la propietaria.
- Proveedor de correo, dominio, textos legales y política de privacidad reales.
- Revisión integral de permisos, recuperación de cuenta, revocación de sesiones
  y validación de entradas de administración.
- Copias de seguridad y restauración probadas; configuración estable de sesiones.
- Alinear el historial remoto/local de migraciones antes de utilizar `db push`.

El despliegue permite probar la web, pero todavía no constituye una tienda
habilitada para ventas reales.
