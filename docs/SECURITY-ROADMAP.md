# Hoja de ruta antes de producción

## Bloqueadores

1. Autorizar en el servidor todas las operaciones de carrito por sesión; nunca aceptar `user_id` ni IDs de carrito como prueba de propiedad.
2. Unificar el checkout en una única ruta. El servidor debe obtener productos, precio y stock desde la base de datos y calcular el total dentro de una transacción.
3. Configurar credenciales de base de datos mediante variables de entorno o un archivo local no versionado. No devolver detalles de conexión al cliente.
4. Configurar cookies de sesión seguras en producción (`Secure`, `HttpOnly`, `SameSite`) y protección CSRF para peticiones con cookie.
5. Añadir límite de intentos de inicio de sesión, validación estricta de entradas y registros de errores sin datos sensibles.

## Necesario para vender

1. Integrar un proveedor de pago: la confirmación debe llegar desde el proveedor al backend, no desde el navegador.
2. Guardar dirección de envío, método de entrega, impuestos, referencia de pago e historial de cambios de estado.
3. Reservar o descontar stock de forma atómica y definir el comportamiento de productos agotados.
4. Publicar páginas legales reales con datos del negocio, contacto y política de privacidad/cookies revisada.
5. Crear pruebas de autenticación, carrito, checkout y permisos de administrador.

## Operación

- Base de datos Supabase PostgreSQL con migraciones versionadas, copias de seguridad y una prueba de restauración.
- HTTPS obligatorio.
- Entornos separados: local, pruebas y producción.
- No guardar imágenes como base64 en la BBDD a largo plazo; usar almacenamiento de archivos y conservar solo su URL.
