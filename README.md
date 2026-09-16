# Mundo Nómada

Tienda online compuesta por un frontend Angular, una API PHP y Supabase PostgreSQL como base de datos de producción. XAMPP fue solo el entorno local original: no forma parte del despliegue final.

## Estructura

- `frontend/mundo-nomada`: aplicación Angular.
- `backend/Mundo-nomada-backEnd`: API PHP; es la fuente de verdad del backend.
- `database/schema.sql`: estructura limpia de MySQL/MariaDB. No contiene usuarios ni productos reales.
- `supabase/migrations/`: migraciones versionadas para la futura BBDD PostgreSQL de Supabase.
- `docs/`: decisiones y trabajo pendiente.

La carpeta `htdocs/` es una copia local para XAMPP. No forma parte del repositorio: para probar cambios, copia o enlaza el backend fuente en tu instalación local, pero no edites ambas copias.

## Arquitectura de producción

`Navegador Angular → API PHP desplegada → Supabase PostgreSQL`

- Supabase guarda los datos y copias de seguridad; no ejecuta este backend PHP.
- Angular no se conecta a las tablas ni recibe claves de Supabase.
- La API PHP se despliega en un hosting o servidor con PHP 8.2+, `PDO_PGSQL` y HTTPS. Puede ser un hosting PHP gestionado o un VPS con Nginx/Apache; no XAMPP.

## Desarrollo local sin XAMPP

Para desarrollar hace falta algún runtime de PHP con la extensión `pdo_pgsql`; XAMPP es solo una posibilidad, no un requisito. Puedes usar PHP instalado de forma independiente, Docker o un hosting de pruebas. Configura las credenciales únicamente en `config/supabase.local.php` (archivo ignorado por Git) y ejecuta Angular con `npm ci` y `npm start` desde `frontend/mundo-nomada`.

La guía completa de la conexión está en `supabase/README.md`.

## Configurar la URL de la API

El frontend lee `frontend/mundo-nomada/public/runtime-config.js` al arrancar. Para desarrollo local mantiene `http://localhost/mundonomada/api_php/`. En el despliegue, cambia únicamente `apiBaseUrl` por la URL HTTPS pública del backend, por ejemplo `https://api.ejemplo.es/`. Este archivo es público: nunca guardes en él contraseñas, claves de Supabase ni claves de pago.

## Forma de trabajar

- `main` debe permanecer estable.
- Cada cambio va en una rama con un nombre descriptivo, por ejemplo `security/cart-authorization`.
- Abre un Pull Request antes de fusionar una rama a `main`.
- Nunca añadas al repositorio archivos `.env`, exportaciones `.sql` con datos, tokens ni credenciales.

Consulta `docs/PROJECT-STATUS.md`, `docs/SECURITY-ROADMAP.md` y `supabase/README.md` antes de publicar la tienda.
