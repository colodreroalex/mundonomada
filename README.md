# Mundo Nómada

Tienda online compuesta por un frontend Angular y una API PHP. Actualmente usa MySQL/MariaDB en local; la BBDD de producción objetivo es Supabase PostgreSQL.

## Estructura

- `frontend/mundo-nomada`: aplicación Angular.
- `backend/Mundo-nomada-backEnd`: API PHP; es la fuente de verdad del backend.
- `database/schema.sql`: estructura limpia de MySQL/MariaDB. No contiene usuarios ni productos reales.
- `supabase/migrations/`: migraciones versionadas para la futura BBDD PostgreSQL de Supabase.
- `docs/`: decisiones y trabajo pendiente.

La carpeta `htdocs/` es una copia local para XAMPP. No forma parte del repositorio: para probar cambios, copia o enlaza el backend fuente en tu instalación local, pero no edites ambas copias.

## Arranque local

1. Crea una base de datos vacía y ejecuta `database/schema.sql`.
2. Copia `backend/Mundo-nomada-backEnd/config/database.local.example.php` como `database.local.php` y configura las credenciales locales. No subas contraseñas ni exportaciones con datos.
3. Desde `frontend/mundo-nomada`, ejecuta `npm ci` y `npm start`.
4. Sirve la API PHP con Apache/XAMPP en la ruta configurada por el frontend.

## Forma de trabajar

- `main` debe permanecer estable.
- Cada cambio va en una rama con un nombre descriptivo, por ejemplo `security/cart-authorization`.
- Abre un Pull Request antes de fusionar una rama a `main`.
- Nunca añadas al repositorio archivos `.env`, exportaciones `.sql` con datos, tokens ni credenciales.

Consulta `docs/PROJECT-STATUS.md`, `docs/SECURITY-ROADMAP.md` y `supabase/README.md` antes de publicar la tienda.
