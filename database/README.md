# Datos de prueba

La base de datos de la tienda es **Supabase PostgreSQL**. Su estructura vive en las migraciones
versionadas de [`supabase/migrations/`](../supabase/migrations) (ver [`supabase/README.md`](../supabase/README.md)).

Esta carpeta solo contiene datos de demostración:

- `seeds/demo_catalog.sql`: categoría "Demostración" con tres artículos ficticios. Únicamente para
  entornos de prueba; no se carga en producción.

## Entorno local

Para un PostgreSQL local vacío aplica, en orden, las migraciones de `supabase/migrations/` y después
`seeds/demo_catalog.sql`. El procedimiento completo con Docker está en
[`docs/seguridad/INFORME-PENTEST.md`](../docs/seguridad/INFORME-PENTEST.md#2-alcance-y-entorno).

No se suben a Git exportaciones de la base de datos: pueden contener cuentas, hashes de contraseñas,
datos de envío y pedidos de clientes.
