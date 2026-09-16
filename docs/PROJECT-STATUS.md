# Estado real del proyecto

Última revisión: septiembre de 2026.

## Implementado en el código

- Frontend Angular para catálogo, autenticación, perfil, administración y carrito.
- API PHP y modelo de datos para usuarios, categorías, productos, carrito, pedidos y líneas de pedido.
- Esquema vacío y reproducible de MySQL/MariaDB en `database/schema.sql`.
- Primera migración PostgreSQL aplicada en el proyecto Supabase europeo `mundo-nomada`; las siete tablas de negocio tienen RLS activado y no están expuestas automáticamente al navegador.
- Configuración de conexión fuera de Git mediante `config/database.local.php` o variables de entorno.
- Adaptador PDO PostgreSQL preparado en `conexion_postgres.php`; requiere un servidor PHP con la extensión `pdo_pgsql` antes de usarlo.
- Registro, inicio/cierre de sesión y los endpoints de consulta y modificación del carrito usan PDO PostgreSQL y el usuario de la sesión del servidor.
- El carrito comprueba el stock al añadir o modificar cantidades; los productos y categorías públicos ya se consultan desde PostgreSQL.
- Límite de intentos de login, tokens de sesión persistente almacenados como hash y consulta de líneas de pedido limitada a su propietario.
- URL de API centralizada en `public/runtime-config.js`, preparada para cambiar el dominio de despliegue sin recompilar ni exponer secretos.

## Pendiente de aprobación o prueba

- El Pull Request #1 protege la propiedad del carrito y el checkout, pero todavía no está fusionado en `main`.
- Siguen pendientes algunos endpoints de perfil, administración y pedidos; no deben exponerse en producción hasta migrarlos y comprobar sus permisos. XAMPP no forma parte del despliegue final.
- El checkout está bloqueado de forma intencionada: no crea pedidos ni descuenta stock hasta validar la confirmación de pago en el backend.
- Deben probarse registro, sesión, carrito, pedido y permisos de administrador con una BBDD limpia.

## No está listo para afirmar que funciona en producción

- JWT, CI/CD, MFA, WebSockets, microservicios, recomendaciones, programa de puntos, internacionalización y escalado automático no forman parte del código verificado.
- No hay un despliegue de producción ni un proceso de pago real validado.
- La migración desde MySQL a Supabase PostgreSQL requiere adaptar el backend de `mysqli` a PDO PostgreSQL antes de activar Supabase como BBDD de la tienda.

## Orden de puesta en marcha

1. Fusionar y probar el Pull Request de seguridad.
2. Configurar el backend de producción con PHP `pdo_pgsql` y las credenciales privadas de Supabase.
3. Migrar los endpoints pendientes y probar catálogo, registro, sesión y carrito con datos ficticios.
4. Configurar dominio, HTTPS, cookies seguras y correo transaccional.
5. Activar pagos reales solo después de revisar legal, privacidad, backups y una prueba de recuperación.
