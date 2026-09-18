# Supabase en Mundo Nómada

Estado a 18 de septiembre de 2026. El navegador usa la API PHP del mismo dominio
en Render. Solo PHP se conecta a PostgreSQL; Angular no recibe claves privadas.

## Conexión desplegada

- Proyecto: `mundo-nomada` (`mavnskcqyteoatxlzhok`), Irlanda.
- Pooler de sesión: `aws-1-eu-west-1.pooler.supabase.com:5432`.
- Usuario del pooler: `mundo_nomada_app.mavnskcqyteoatxlzhok`.
- Base: `postgres`; conexión SSL.
- Variables privadas de Render: `MUNDONOMADA_SUPABASE_DSN`,
  `MUNDONOMADA_SUPABASE_USER`, `MUNDONOMADA_SUPABASE_PASSWORD`.

No es necesario restablecer la contraseña de `postgres`: el backend usa una
credencial exclusiva, generada fuera de Git y almacenada en Render.
El rol no tiene superusuario, creación de roles/base de datos ni bypass de RLS.
Las políticas permiten las operaciones del backend sobre sus tablas; PHP es
responsable de autenticar la sesión y comprobar permisos y propiedad.
`anon` y `authenticated` no tienen acceso a las tablas de negocio.

## Migraciones

El esquema inicial se aplicó desde el editor SQL el 16 de septiembre de 2026;
su versión `20260916160000` todavía no figura en el historial remoto.
Las migraciones de rol privado y restricción de la función interna se aplicaron
por MCP el 18 de septiembre. Los nombres de sus archivos se han alineado con
las versiones registradas por el servidor.

Antes de usar `supabase db push`, registrar el esquema inicial como ya aplicado
con el flujo oficial `supabase migration repair`, usando una sesión de CLI
autorizada, y comprobar `supabase migration list`. No repetir el esquema inicial
ni usar `--include-all`. No se ha cambiado manualmente ese historial.

Los archivos versionados son la fuente de las migraciones. El catálogo ficticio
está separado en `database/seeds/demo_catalog.sql` y solo se carga en pruebas.

## Desarrollo

PHP necesita `pdo_pgsql` y `mbstring`. Para una configuración local, copiar
`backend/Mundo-nomada-backEnd/config/supabase.local.example.php` a
`supabase.local.php` y guardar los datos de conexión allí. Ese archivo se excluye
de Git y de la imagen Docker. No subirlo al frontend.

El Dockerfile de la raíz instala las extensiones y construye Angular.
Ver `docs/DEPLOYMENT-PLAN.md` para volver a publicar en Render.
El chequeo de seguridad de Supabase terminó sin avisos; la política de copias
y una restauración real siguen pendientes antes de vender.
