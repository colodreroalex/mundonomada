# Supabase en Mundo Nómada

Supabase será la base de datos PostgreSQL de producción. El navegador no debe acceder a las tablas de negocio directamente: Angular seguirá llamando al backend PHP y este se conectará a PostgreSQL con una credencial guardada fuera de Git.

## Flujo de trabajo

1. Cada cambio de esquema se añade como un archivo nuevo en `migrations/`.
2. Se revisa junto al código en un Pull Request.
3. Una sola persona aplica las migraciones al proyecto remoto tras aprobar el PR.

No se crean tablas desde el editor SQL remoto una vez iniciado este flujo; la migración versionada es la fuente de verdad.

## Pendiente antes de conectar producción

- Crear el proyecto Supabase en la región europea que elija el titular.
- Guardar la cadena de conexión de PostgreSQL únicamente en la configuración privada del backend.
- Adaptar la capa `mysqli` actual a PDO PostgreSQL y probar el flujo completo en un entorno de pruebas.
- Configurar una copia de seguridad y comprobar una restauración antes de aceptar pedidos reales.
