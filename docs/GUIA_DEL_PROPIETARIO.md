# Guía del propietario de Mundo Nómada

Esta guía contiene únicamente lo que debe hacer el propietario de la tienda. No necesitas saber programar. Cuando termines un paso, responde en este chat con el número del paso y yo continuaré con la parte técnica.

## Regla importante

No compartas aquí contraseñas, claves, tokens, datos bancarios ni documentos de identidad. Si una pantalla muestra uno de esos datos, guárdalo en un gestor de contraseñas. Yo no lo necesito para escribir código.

## Estado actual

- La base de datos Supabase `mundo-nomada` ya está creada en Europa.
- Sus tablas y protecciones básicas ya están aplicadas.
- La tienda todavía no está lista para aceptar pedidos reales: falta terminar la migración del backend, probarla y elegir dónde publicar la web.

## Lo que tienes que hacer ahora

### Paso 1. Guarda la contraseña de Supabase

1. Abre [Supabase](https://supabase.com/dashboard).
2. Entra en el proyecto **mundo-nomada**.
3. Ve a **Project Settings > Database**.
4. Restablece la contraseña de la base de datos y guárdala en un gestor de contraseñas.

No copies esa contraseña en este chat ni en GitHub. Cuando termines, responde: **Paso 1 hecho**.

### Paso 2. No instales ni configures XAMPP

No tienes que hacer nada con XAMPP para la tienda publicada. No será el servidor final ni guardará la base de datos final.

Para que yo pueda terminar la programación, usaré archivos de configuración privados y pruebas controladas. Cuando llegue el momento de probar desde tu ordenador, te daré un paso concreto y sencillo; no adelantes instalaciones por tu cuenta.

### Paso 3. Elige dominio y hosting cuando te lo indique

Más adelante tendrás que contratar dos cosas:

1. **Dominio**: por ejemplo, `mundonomada.es`.
2. **Hosting para PHP**: debe indicar que permite PHP 8.2 o superior, PostgreSQL mediante `PDO_PGSQL`, HTTPS, variables de entorno y conexiones externas SSL.

No compres todavía un plan al azar. Cuando el backend esté terminado, revisaré contigo las opciones para evitar elegir un hosting incompatible.

## Lo que haré yo

1. Migrar el backend PHP desde MySQLi a PDO PostgreSQL.
2. Conectar el backend con Supabase usando configuración privada, sin secretos en GitHub.
3. Probar registro, inicio de sesión, carrito, stock, pedidos y permisos de administrador.
4. Corregir fallos de seguridad antes de habilitar pagos.
5. Preparar el despliegue: variables de entorno, CORS, cookies HTTPS y URL pública de la API.
6. Crear Pull Requests y dejar los cambios documentados. No fusionaré cambios sin avisarte.

## Lo que te pediré más adelante

Solo cuando sea necesario te pediré que hagas una de estas acciones:

- Elegir y pagar un hosting o dominio.
- Restablecer una contraseña o crear una clave personal en un panel.
- Añadir variables secretas directamente en el panel del hosting.
- Crear una cuenta de cobro de PayPal o Stripe y completar su verificación legal.
- Revisar textos legales, precios, gastos de envío, devoluciones y datos de contacto de la tienda.

Nunca te pediré que publiques una contraseña en GitHub, que me la envíes por chat ni que actives pagos reales sin pruebas previas.

## Antes de vender

La tienda solo se publicará para ventas cuando estén marcados todos estos puntos:

- [ ] Backend conectado a Supabase y probado.
- [ ] Usuarios, carrito, stock y pedidos probados con datos ficticios.
- [ ] Pago validado con modo de pruebas y confirmación desde el backend.
- [ ] Dominio, HTTPS y correos de la tienda configurados.
- [ ] Aviso legal, privacidad, cookies, devoluciones y contacto revisados.
- [ ] Copia de seguridad y procedimiento de recuperación comprobados.

## Resumen para ti hoy

Haz únicamente el **Paso 1** y luego escribe: **Paso 1 hecho**. Yo me encargo del resto técnico.
