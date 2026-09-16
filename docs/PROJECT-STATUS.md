# Estado real del proyecto

Última revisión: septiembre de 2026.

## Implementado en el código

- Frontend Angular para catálogo, autenticación, perfil, administración y carrito.
- API PHP y modelo de datos para usuarios, categorías, productos, carrito, pedidos y líneas de pedido.
- Esquema vacío y reproducible de MySQL/MariaDB en `database/schema.sql`.
- Primera migración PostgreSQL para Supabase en `supabase/migrations/`.
- Configuración de conexión fuera de Git mediante `config/database.local.php` o variables de entorno.

## Pendiente de aprobación o prueba

- El Pull Request #1 protege la propiedad del carrito y el checkout, pero todavía no está fusionado en `main`.
- El flujo de pago debe validarse con una confirmación del proveedor en el backend antes de vender.
- Deben probarse registro, sesión, carrito, pedido y permisos de administrador con una BBDD limpia.

## No está listo para afirmar que funciona en producción

- JWT, CI/CD, MFA, WebSockets, microservicios, recomendaciones, programa de puntos, internacionalización y escalado automático no forman parte del código verificado.
- No hay un despliegue de producción ni un proceso de pago real validado.
- La migración desde MySQL a Supabase PostgreSQL requiere adaptar el backend de `mysqli` a PDO PostgreSQL antes de activar Supabase como BBDD de la tienda.

## Orden de puesta en marcha

1. Fusionar y probar el Pull Request de seguridad.
2. Crear Supabase, aplicar la migración y configurar el backend para PostgreSQL.
3. Probar el flujo completo con datos ficticios y PayPal Sandbox.
4. Configurar dominio, HTTPS, cookies seguras y correo transaccional.
5. Activar pagos reales solo después de revisar legal, privacidad, backups y una prueba de recuperación.
