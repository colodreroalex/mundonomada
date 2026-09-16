# Despliegue recomendado

## Arquitectura

- **Web:** Angular en Cloudflare Pages.
- **API:** contenedor `backend/Dockerfile` en un proveedor gestionado compatible con Docker.
- **Datos:** Supabase PostgreSQL, ya creado en Europa.

XAMPP y `htdocs` no se despliegan. El contenedor instala `pdo_pgsql`, por lo que PHP puede conectarse a Supabase sin depender del ordenador local.

## Variables privadas de la API

Configura estas variables solo en el panel privado del proveedor de la API:

- `MUNDONOMADA_SUPABASE_DSN`
- `MUNDONOMADA_SUPABASE_USER`
- `MUNDONOMADA_SUPABASE_PASSWORD`
- `MUNDONOMADA_ALLOWED_ORIGIN`

No subas estos valores a Git ni los pegues en el frontend. La API debe responder en `https://api.TU-DOMINIO/health.php` antes de conectar Angular.

## Variables públicas de Angular

Tras tener la URL HTTPS de la API, cambia únicamente `apiBaseUrl` en `frontend/mundo-nomada/public/runtime-config.js` a `https://api.TU-DOMINIO/api_php/`. No añadas secretos en ese archivo.

## Orden seguro

1. Desplegar API con las variables privadas.
2. Abrir `/health.php` y ejecutar pruebas de registro, login, catálogo y carrito con datos ficticios.
3. Desplegar Angular y fijar el origen CORS exacto.
4. Configurar dominio y HTTPS.
5. Conectar PayPal Sandbox; pagos reales solo tras validar webhook, textos legales y cuenta de cobro.
