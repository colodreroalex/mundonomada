# Base de datos de Mundo Nómada

`schema.sql` es el esquema canónico, vacío y reproducible de la aplicación. No se suben copias de phpMyAdmin ni datos de clientes, pedidos, contraseñas o imágenes en Base64.

## Instalación local

1. Arranca MySQL o MariaDB desde XAMPP.
2. Crea una base de datos limpia ejecutando `schema.sql` con un usuario administrador local.
3. Crea el usuario de aplicación a partir de `users/app-user.sql.example`, sustituyendo la contraseña por una larga y única.
4. Copia `../backend/Mundo-nomada-backEnd/config/database.local.example.php` a `database.local.php` en esa misma carpeta y coloca exactamente las mismas credenciales.
5. Importa solo datos de prueba anónimos si los necesitas. No importes el antiguo volcado en un entorno accesible desde Internet.

## Producción

La aplicación se conecta a través de las variables `MUNDONOMADA_DB_HOST`, `MUNDONOMADA_DB_PORT`, `MUNDONOMADA_DB_NAME`, `MUNDONOMADA_DB_USER` y `MUNDONOMADA_DB_PASSWORD`, o mediante el archivo local ignorado. La cuenta de la aplicación no debe ser `root` ni tener permisos globales.

Para ponerla online, el servidor de MySQL debe aceptar conexiones solamente desde el backend privado. El puerto 3306 no se publica en Internet. Se usa una conexión cifrada cuando el proveedor lo ofrezca.

## Migraciones

Antes de adaptar una BBDD existente, haz una copia de seguridad y prueba el proceso en una clonación. La migración `migrations/001_normalize_money_and_cart.sql` requiere MySQL 8 o MariaDB 10.4 y comprueba primero carritos duplicados para no perder cantidades.
