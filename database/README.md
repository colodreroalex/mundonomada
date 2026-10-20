# Base de datos de Mundo Nómada

`schema.sql` es el esquema canónico, vacío y reproducible de la aplicación. No se suben copias de phpMyAdmin ni datos de clientes, pedidos, contraseñas o imágenes en Base64.

## Instalación local

El backend ya solo usa PostgreSQL (la conexión MySQL antigua se eliminó). `schema.sql` y
`users/` se conservan como referencia histórica del esquema MySQL.

Para un entorno local se crea un PostgreSQL vacío aplicando, en orden, las migraciones de
`supabase/migrations/` y después `seeds/demo_catalog.sql`. No importes el antiguo volcado en
un entorno accesible desde Internet.

## Producción

La aplicación se conecta a través de las variables `MUNDONOMADA_DB_HOST`, `MUNDONOMADA_DB_PORT`, `MUNDONOMADA_DB_NAME`, `MUNDONOMADA_DB_USER` y `MUNDONOMADA_DB_PASSWORD`, o mediante el archivo local ignorado. La cuenta de la aplicación no debe ser `root` ni tener permisos globales.

Para ponerla online, el servidor de MySQL debe aceptar conexiones solamente desde el backend privado. El puerto 3306 no se publica en Internet. Se usa una conexión cifrada cuando el proveedor lo ofrezca.

## Migraciones

Antes de adaptar una BBDD existente, haz una copia de seguridad y prueba el proceso en una clonación. La migración `migrations/001_normalize_money_and_cart.sql` requiere MySQL 8 o MariaDB 10.4 y comprueba primero carritos duplicados para no perder cantidades.
