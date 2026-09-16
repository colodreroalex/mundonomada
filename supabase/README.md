# Supabase en Mundo Nómada

Supabase es la base de datos PostgreSQL de producción. No sustituye al backend PHP: el navegador Angular llama a la API PHP y esa API se conecta a Supabase con una credencial privada. XAMPP no se usará en producción; solo fue el entorno local inicial del proyecto.

## Arquitectura objetivo

```text
Cliente → https://www.tudominio.es  (Angular)
             ↓ HTTPS con cookies seguras
          https://api.tudominio.es  (PHP 8.2+)
             ↓ PDO PostgreSQL con SSL
          Supabase PostgreSQL       (datos)
```

No instales `supabase-js` ni pongas claves de Supabase en Angular: el modelo elegido mantiene la BBDD inaccesible desde el navegador y concentra permisos, precios, stock y pedidos en PHP.

## Estado del proyecto remoto

- Proyecto: `mundo-nomada`, región West EU (Ireland).
- La migración `20260916160000_initial_schema.sql` se aplicó el 16 de septiembre de 2026 desde este archivo versionado.
- Se verificaron las tablas `users`, `categorias`, `productos`, `carrito`, `orders`, `order_items` y `login_attempts`; RLS está activado en todas.
- La API de datos está habilitada, pero la exposición automática de tablas está desactivada y las tablas no conceden permisos a `anon` ni `authenticated`.

> La primera aplicación se realizó mediante el editor SQL porque la CLI no podía autenticarse de forma interactiva en este equipo. Antes de usar `supabase db push`, hay que registrar esta migración como aplicada siguiendo el paso 4 de abajo. No ejecutes `db push --include-all` antes: intentaría repetir el esquema.

## Flujo de trabajo

1. Cada cambio de esquema se añade como un archivo nuevo en `migrations/`.
2. Se revisa junto al código en un Pull Request.
3. Una sola persona aplica las migraciones al proyecto remoto tras aprobar el PR.

No se crean tablas desde el editor SQL remoto una vez iniciado este flujo; la migración versionada es la fuente de verdad.

## Configurar Supabase paso a paso

### 1. Contraseña de base de datos

En el panel de Supabase abre **Project Settings > Database** y restablece la contraseña de PostgreSQL. Guárdala en un gestor de contraseñas. No la pegues en el chat, en el frontend ni en Git.

### 2. Datos de conexión

Pulsa **Connect** y selecciona **Session pooler**. Es la opción recomendada para la mayoría de hostings y conexiones IPv4. Copia host, puerto, usuario y contraseña en una configuración privada.

En desarrollo, crea `backend/Mundo-nomada-backEnd/config/supabase.local.php` copiando el archivo `.example`:

```php
return [
    'dsn' => 'pgsql:host=HOST_DEL_POOLER;port=PUERTO;dbname=postgres;sslmode=require',
    'username' => 'USUARIO_DEL_POOLER',
    'password' => 'CONTRASENA_PRIVADA',
];
```

En producción no subas este archivo. Configura estas tres variables secretas en el panel del hosting:

```text
MUNDONOMADA_SUPABASE_DSN
MUNDONOMADA_SUPABASE_USER
MUNDONOMADA_SUPABASE_PASSWORD
```

### 3. Hosting PHP, sin XAMPP

El hosting elegido debe ofrecer PHP 8.2 o superior, la extensión `PDO_PGSQL`, salida HTTPS a Internet y variables de entorno. Antes de contratarlo, pregunta expresamente si permite conexiones PostgreSQL salientes a Supabase mediante SSL. XAMPP no se instala en el hosting.

Para desarrollo local, instala PHP de forma independiente, usa Docker o conserva XAMPP solo si te resulta cómodo. En cualquiera de los casos, activa `pdo_pgsql` y comprueba que `php -m` muestra `pdo_pgsql` y `pgsql`.

### 4. Historial de migraciones

Para dejar sincronizado el historial de migraciones, crea un token personal en Supabase (**Account > Access Tokens**) y ejecútalo solo en tu terminal, sustituyendo los valores entre corchetes:

   ```powershell
   npx supabase login --token [TU_TOKEN]
   npx supabase link --project-ref mavnskcqyteoatxlzhok --password [TU_CONTRASENA_POSTGRES]
   npx supabase migration repair --status applied 20260916160000
   npx supabase migration list
   ```

El token y la contraseña no se guardan en el repositorio. A partir de entonces, cada cambio será un nuevo archivo de migración y se aplicará con `npx supabase db push` tras revisar el Pull Request.

### 5. Despliegue del frontend

Publica el contenido generado por Angular en un hosting estático. Antes de publicar, cambia solo `apiBaseUrl` en `frontend/mundo-nomada/public/runtime-config.js` a la URL HTTPS del backend, por ejemplo `https://api.tudominio.es/`. No pongas secretos en ese archivo.

Configura `MUNDONOMADA_ALLOWED_ORIGIN=https://www.tudominio.es` en el servidor PHP. Así las cookies de sesión y CORS solo aceptarán la web real.

## Pendiente antes de conectar producción

- Guardar la cadena de conexión de PostgreSQL únicamente en la configuración privada del backend.
- Elegir un hosting PHP con `PDO_PGSQL`, HTTPS y variables de entorno para sustituir el entorno local.
- Migrar los endpoints de `mysqli` a PDO PostgreSQL por grupos, empezando por autenticación, carrito y checkout.
- Configurar una copia de seguridad y comprobar una restauración antes de aceptar pedidos reales.
