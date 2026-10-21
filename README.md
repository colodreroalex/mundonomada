# Mundo Nómada

Tienda online de moda y complementos: frontend **Angular 19**, API **PHP 8.3** y **Supabase PostgreSQL**,
con pagos por **Stripe Checkout**. Angular y PHP se sirven desde un único contenedor Docker en Render.

`Navegador → Apache (Angular + API PHP en /api_php/) → Supabase PostgreSQL`
`Stripe Checkout → webhook firmado → API PHP`

## Estructura

| Carpeta | Contenido |
|---|---|
| `frontend/mundo-nomada` | Aplicación Angular (tienda, cuenta, checkout y administración) |
| `backend/Mundo-nomada-backEnd` | API PHP; `auth/seguridad.php` concentra sesión, CORS/CSRF, límites de intentos y validación |
| `backend/` (resto) | Configuración de Apache, PHP y arranque del contenedor |
| `supabase/migrations` | Esquema de la base de datos, versionado ([guía](supabase/README.md)) |
| `database/seeds` | Catálogo de demostración para entornos de prueba |
| `tools/` | `smoke-test.mjs` (49 comprobaciones funcionales) y `security-test.mjs` (pruebas de seguridad) |
| `docs/` | Guía de la propietaria, despliegue, estado y seguridad |

## Documentación

- [Guía de la propietaria](docs/GUIA_DEL_PROPIETARIO.md): pasos pendientes para abrir la tienda y uso diario.
- [Estado del proyecto](docs/PROJECT-STATUS.md).
- [Despliegue en Render](docs/DEPLOYMENT-PLAN.md).
- [Informe de seguridad](docs/seguridad/INFORME-PENTEST.md) y [lista antes de producción](docs/seguridad/CHECKLIST-PRODUCCION.md).

## Desarrollo local

- **Frontend:** `npm ci` y `npm start` en `frontend/mundo-nomada`. `public/runtime-config.js` indica la URL de la API.
- **Backend:** cualquier PHP 8.2+ con `pdo_pgsql`, o el propio contenedor (`docker build -t mundo-nomada .`). Credenciales solo en `config/supabase.local.php` y `config/stripe.local.php` (ignorados por Git) o en variables de entorno.
- **Entorno de pruebas completo** con PostgreSQL local: ver el [informe de seguridad](docs/seguridad/INFORME-PENTEST.md#2-alcance-y-entorno).

## Despliegue

Web de prueba: https://mundo-nomada-test.onrender.com, desplegada desde la rama `codex/render-deployment` con el `Dockerfile` de la raíz. Las migraciones nuevas de `supabase/migrations/` se aplican en Supabase **antes** de desplegar el código que las usa.

## Normas

- Ningún secreto en Git: ni `.env`, ni exportaciones `.sql` con datos, ni claves de Stripe o Supabase.
- Cada cambio va en su propia rama y se fusiona cuando está probado.
