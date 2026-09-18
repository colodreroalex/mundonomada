# Despliegue de prueba

Revisado el 18 de septiembre de 2026.

- Web: https://mundo-nomada-test.onrender.com
- Render: https://dashboard.render.com/web/srv-damni7u7bikc73bpa7lg
- Servicio gratuito `mundo-nomada-test`, Frankfurt.
- Repositorio público `colodreroalex/mundonomada`, rama `codex/render-deployment`.
- Dockerfile: `Dockerfile` en la raíz; contexto: raíz; root directory: vacío.
- Health check: `/api_php/health.php`, con comprobación real de PostgreSQL.

## Arquitectura

El contenedor construye Angular con Node 22 y sirve el resultado junto con PHP
8.3/Apache. PHP incluye `pdo_pgsql` y `mbstring`. El navegador llama a `/api_php/`
en su mismo origen y el backend se conecta a Supabase mediante el pooler de
sesión de Irlanda, puerto 5432 y SSL.

La configuración pública del contenedor procede de
`backend/runtime-config.production.js`. Activa el aviso de demostración y no
contiene secretos. Apache resuelve rutas de Angular, bloquea archivos internos
y evita la indexación del sitio de prueba.

## Variables privadas de Render

- `MUNDONOMADA_SUPABASE_DSN`
- `MUNDONOMADA_SUPABASE_USER`
- `MUNDONOMADA_SUPABASE_PASSWORD`

El usuario PostgreSQL es `mundo_nomada_app`, sin superusuario, DDL ni bypass de
RLS. Tiene permisos limitados a las tablas de la aplicación; pedidos y líneas
de pedido son solo lectura. Su contraseña se generó para este despliegue y no
se versiona. No se cambió la contraseña del usuario `postgres`.

Render proporciona `RENDER_EXTERNAL_URL`, usado como origen permitido por PHP.
Para otro dominio, fijar `MUNDONOMADA_ALLOWED_ORIGIN` al origen HTTPS exacto.

## Publicar cambios

1. Comprobar PHP y ejecutar `npm ci` y `npm run build` en `frontend/mundo-nomada`.
2. Subir la rama `codex/render-deployment` y revisar el Pull Request.
3. En Render, usar **Manual Deploy → Deploy latest commit**. La conexión actual
   usa la URL pública del repositorio; no se depende de auto-deploy.
4. Esperar a **Deploy succeeded | Live** y comprobar `/api_php/health.php`.
5. Ejecutar las pruebas de abajo y comprobar una recarga directa de `/main`.

## Pruebas

Solo contra el entorno de demostración con `database/seeds/demo_catalog.sql`:

```powershell
node tools/smoke-test.mjs https://mundo-nomada-test.onrender.com/api_php/
```

El script verifica 41 peticiones HTTP: catálogo, registro, duplicados, sesión,
permisos, propiedad de carrito, stock, CSRF, perfil, bloqueo de pedidos, sesión
persistente, cambio de contraseña y límite de login. Crea dos usuarios ficticios
`@example.invalid` y guarda sus emails exactos en un informe de `tmp/`. Al acabar,
eliminar solo esos usuarios de prueba mediante el backend administrativo o una
consulta parametrizada. La prueba no compra, cobra ni envía correos.

El chequeo de seguridad de Supabase terminó sin avisos tras revocar el acceso
público a la función interna `rls_auto_enable`.

## Límites

El servicio gratuito se suspende por inactividad. Las sesiones PHP están en el
disco efímero y se pierden al reiniciar; el token persistente puede recuperar la
sesión cuando el usuario lo ha solicitado. El catálogo es ficticio y los pagos
siguen deshabilitados. Antes de vender faltan catálogo real, revisión completa
de seguridad/legal, correo transaccional, proveedor de pago con webhook,
backups verificados y un plan de operación sin suspensión.
