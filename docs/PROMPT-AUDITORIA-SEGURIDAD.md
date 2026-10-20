# Prompt: auditoría de seguridad (pentest) de Mundo Nómada antes de producción

> Encargo para ejecutar tal cual. La propietaria del proyecto autoriza estas pruebas sobre su
> propia aplicación, con las reglas de alcance de abajo. El objetivo es encontrar y **corregir**
> fallos antes de vender, no solo listarlos.

---

## Contexto del sistema

- **Frontend:** Angular 19 (`frontend/mundo-nomada`), servido por Apache en el mismo contenedor.
- **API:** PHP 8.3 sin framework (`backend/Mundo-nomada-backEnd`). Autenticación por sesión PHP y token "recordarme".
  - Helpers de seguridad en `auth/seguridad.php`: `aplicarCors`, comprobación de `Origin` y `Content-Type: application/json` en mutaciones, `exigirAdministrador`, `iniciarSesionSegura`.
  - Carrito en `carrito/seguridad_carrito.php`.
- **Base de datos:** Supabase PostgreSQL.
  - El backend se conecta con el rol `mundo_nomada_app`, con RLS en todas las tablas y sin acceso para `anon`/`authenticated`.
  - Migraciones en `supabase/migrations/`.
- **Pagos:** Stripe Checkout. `checkout/createCheckoutSession.php` crea el pedido y reserva stock; `checkout/webhook.php` (firma HMAC verificada en `checkout/stripe.php`) marca el pedido como pagado o lo cancela.
- **Despliegue:** Docker (`Dockerfile`, `backend/apache-site.conf`, `backend/production.ini`, `backend/docker-entrypoint.sh`) en Render. Variables secretas solo en Render.
- **Terceros:** EmailJS para el formulario de contacto, con claves públicas en `contacto.component.ts`.
- **Pruebas existentes:** `tools/smoke-test.mjs` (41 comprobaciones de sesión, carrito, CSRF y límite de login).

## Reglas de alcance (obligatorias)

1. **La demo de Render y la tienda usan la misma base de datos de Supabase.** Las pruebas invasivas no se hacen contra Render: fuerza bruta, inyección, carga masiva, borrados o cambios de rol.
   - Se monta un **entorno local**: el contenedor Docker con una base PostgreSQL local, creada con las migraciones de `supabase/migrations/` y `database/seeds/demo_catalog.sql`.
   - Contra Render solo se permiten comprobaciones pasivas o de bajo impacto: cabeceras, TLS, rutas expuestas y respuestas a peticiones sin sesión. Además, como máximo una prueba funcional con usuarios `@example.invalid`.
2. **Prohibido:**
   - denegación de servicio
   - escaneos masivos contra Render, Supabase, Stripe o EmailJS
   - atacar infraestructura de terceros
   - usar o mostrar datos reales de clientes
3. **Stripe:** solo en modo test. Para probar el webhook se usan payloads firmados localmente con un secreto de prueba local, nunca el `whsec_` real.
4. **Secretos:** nunca se imprimen, copian ni suben a Git. Si se encuentra uno expuesto, se informa de **dónde** está, no de su valor, y se indica cómo rotarlo.
5. **Trabajo:** en la rama `security/auditoria-produccion`. Un commit por corrección, con prueba que lo demuestre. Nada se fusiona en `codex/render-deployment` sin aprobación de la propietaria.

## Metodología

Se sigue **OWASP ASVS 4.0 nivel 2** y **OWASP Top 10 (2021)** como lista de control, con **OWASP WSTG** como guía de pruebas. Cada hallazgo se clasifica con **CVSS 3.1** (Crítico / Alto / Medio / Bajo / Informativo).

### Fase 1. Reconocimiento y superficie de ataque
- **Inventario de endpoints:** listar todos los `.php` bajo `backend/` con su método, si exige sesión, si exige admin, qué parámetros acepta y qué devuelve.
- **Exposición en Apache:** comprobar qué responde ante archivos que no deberían servirse: `config/`, `conexion*.php`, `hash.php`, `stripe.php`, `*.bak`, `.git`, `.env`, `composer.*`, `Dockerfile`, `phpinfo`, `stats.json` de Angular y mapas de código (`*.map`).
- **Información filtrada:** buscar en el bundle de Angular URLs internas, claves, comentarios y rutas de admin.
- **Secretos en Git:** revisar el historial completo, incluidas las ramas y `.git-backups/`, con `gitleaks` o `trufflehog` en local. Comprobar que `supabaseMundonomadaPass.txt` y los `*.local.php` nunca se han subido.

### Fase 2. Autenticación y sesiones
- **Registro:**
  - ¿se puede forzar `role: admin`?
  - validación de email y política de contraseña (longitud mínima real en el servidor)
  - nombres con HTML o scripts
- **Login:**
  - límite de intentos por IP y por cuenta, y si se puede saltar cambiando `X-Forwarded-For`
  - enumeración de usuarios por mensajes o tiempos de respuesta distintos
  - que no se puedan iniciar sesiones con la cuenta bloqueada
- **Sesión:**
  - regeneración del ID al iniciar sesión, al cambiar la contraseña y al cambiar de rol
  - cookies `Secure`, `HttpOnly` y `SameSite`
  - caducidad e invalidación al cerrar sesión
  - fijación de sesión
  - si la sesión sigue válida tras borrar el usuario o cambiarle el rol
- **Token "recordarme":** cómo se guarda (debe ir con hash), caducidad, rotación, robo y reutilización, e invalidación al cambiar la contraseña.
- **Cambio de contraseña:** exige la actual; se cierran las demás sesiones.
- **Recuperar contraseña:** confirmar que no existe y proponer un diseño seguro (token de un solo uso con caducidad y respuesta idéntica exista o no el email).

### Fase 3. Autorización (control de acceso)
- **Cada endpoint de admin** (`Productos/*`, `Categorias/*`, `usuarios/*`, `orders/getAllOrders.php`, `orders/updateOrderStatus.php`): probarlo sin sesión, con un usuario normal y con un admin.
- **IDOR:**
  - carrito de otro usuario
  - pedidos y líneas de pedido de otro (`getOrderItems.php?order_id=`)
  - `getCheckoutStatus.php?session_id=` de otro usuario
  - `update-user` y `delete-user` sobre otros administradores o sobre uno mismo
- **Escalada de privilegios:** que un usuario normal no pueda ascenderse a admin, que la última cuenta admin no pueda perder su rol y que no se puedan cambiar campos protegidos (`role`, `password`, `id`).
- **Guards del frontend:** confirmar que son solo comodidad visual y que toda la protección real está en el servidor.

### Fase 4. Validación de entradas e inyección
- **SQL:** inyección en todos los parámetros, aunque se usen consultas preparadas (`PDO::ATTR_EMULATE_PREPARES` desactivado). Atención especial a `ORDER BY`, `LIMIT` y búsquedas.
- **XSS almacenado** en nombre de producto, descripción, color, talla, categoría, nombre de usuario y datos de envío. Revisar cómo se muestran en Angular y en el **PDF del recibo** (`pdf.service.ts`).
- **Imágenes de producto** (`imagen_url` guarda cadenas base64 o URLs):
  - límite de tamaño en el servidor
  - tipo MIME real
  - rechazar `javascript:`, `data:text/html` y SVG con scripts
  - `post_max_size`, y la falta de límite como vector de denegación de servicio y de base de datos inflada
  - **recomendar migrar a Supabase Storage** con lista blanca de tipos
- **Tipos y rangos:** precios negativos o con muchos decimales, stock negativo, cantidades enormes, enteros fuera de rango, JSON malformado o anidado, cadenas muy largas y Unicode raro.
- **Cabeceras manipuladas:** `Origin` falso, ausencia de `Origin`, `Content-Type` alternativos y `Sec-Fetch-Site`.

### Fase 5. Lógica de negocio y pagos
- **Manipulación del precio:** confirmar que el importe de Stripe sale **solo** de la base de datos y que no se puede alterar desde el cliente.
- **Webhook:**
  - firma inválida, caducada o reenviada (replay)
  - eventos de otra cuenta, eventos duplicados
  - orden inverso (llega `expired` después de `completed`)
  - el mismo pedido pagado dos veces
  - pago confirmado de un pedido ya cancelado
- **Stock:**
  - condiciones de carrera (dos compras simultáneas de la última unidad)
  - reserva abusiva de stock con muchas cuentas o muchos intentos de pago
  - que el stock nunca baje de 0
  - devolución correcta al caducar
- **Estados del pedido:** que solo el webhook pueda marcar "pagado" y que el admin solo pueda avanzar pagado → enviado → completado.
- **Carrito de invitado:** que los precios guardados en `localStorage` no se usen en ningún cálculo del servidor.

### Fase 6. Protección del navegador y transporte
- **CSP:** actualmente **no hay Content-Security-Policy**. Diseñar una compatible con Angular, Google Fonts, jsDelivr, cdnjs, Stripe, el mapa de Google y EmailJS, con `frame-ancestors`, `object-src 'none'` y `base-uri 'self'`. Probarla primero en modo `Report-Only`.
- **HSTS:** actualmente **no hay HSTS**. Añadirlo con dominio propio (`max-age` creciente; `preload` solo al final).
- **Resto de cabeceras:** `Permissions-Policy`, `Cross-Origin-Opener-Policy`, `Referrer-Policy` y `X-Content-Type-Options`.
- **CORS:** que solo se acepte el origen exacto de producción (`MUNDONOMADA_ALLOWED_ORIGIN`) y que `Access-Control-Allow-Credentials` nunca vaya con un origen comodín.
- **Recursos de CDN:** atributo `integrity` (SRI) en las hojas de estilo de jsDelivr y cdnjs, o servirlas desde el propio build.
- **Clickjacking:** `X-Frame-Options` y `frame-ancestors`.

### Fase 7. Abuso y disponibilidad (sin DoS real)
- **Límites de peticiones en registro, login, contacto y creación de pagos:** proponer e implementar límites (tabla en PostgreSQL o limitador en Apache) y medirlos con muy pocas peticiones en local.
- **EmailJS:** la clave pública permite enviar correos desde cualquier web. Hay que restringir los dominios permitidos y activar el límite de envíos en el panel de EmailJS (tarea de la propietaria), y añadir protección anti-bots (campo trampa o Cloudflare Turnstile) en Contacto y Registro.
- **Tamaños máximos:** de las peticiones y del JSON aceptado.

### Fase 8. Configuración, dependencias y secretos
- **PHP:** `display_errors` desactivado, `expose_php`, opciones de sesión de `production.ini`, que no haya `phpinfo`, y que los errores no muestren rutas, SQL ni la pila de llamadas.
- **Apache:** sin listado de directorios, que `ServerTokens` y `ServerSignature` no revelen la versión, y bloqueo de métodos no usados (TRACE, PUT y DELETE donde no correspondan).
- **Docker:** que la imagen no contenga secretos ni código innecesario, el usuario con el que se ejecuta y la imagen base actualizada.
- **Dependencias:** `npm audit` y `npm outdated` en el frontend, sustitución de `xlsx` u otras librerías con avisos si existen, y versiones de las imágenes `php` y `node`.
- **Supabase:**
  - revisar los Security Advisors
  - que no haya ninguna tabla nueva sin RLS
  - permisos de `mundo_nomada_app` mínimos
  - que `anon` y `authenticated` no tengan nada concedido
  - copias de seguridad y restauración probadas
- **Stripe:** claves con permisos restringidos si es posible, webhook solo con los 4 eventos necesarios, y alertas del panel activadas.
- **Rotación:** documentar cómo rotar cada secreto (Supabase, Stripe, la clave de sesión si existe y EmailJS) y hacerlo antes de abrir la tienda.

### Fase 9. Privacidad (RGPD)
- **Datos personales:** cuáles se guardan (envío, teléfono, email), dónde y durante cuánto tiempo. Que no aparezcan en logs ni en mensajes de error.
- **Derechos del cliente:** exportación y borrado de la cuenta; qué pasa con los pedidos de un usuario borrado (obligación de conservar facturas).
- **Cookies:** que el aviso de cookies coincida con las cookies reales.

## Entregables

1. **`docs/seguridad/INFORME-PENTEST.md`**, con:
   - resumen para la propietaria en lenguaje no técnico
   - tabla de hallazgos (ID, título, severidad CVSS, estado)
   - para cada hallazgo: descripción, impacto real en la tienda, prueba de concepto reproducible **solo en local**, corrección aplicada y evidencia de la nueva prueba
2. **Correcciones en código,** un commit por hallazgo, empezando por los críticos y altos.
3. **Pruebas automáticas** que impidan volver atrás: ampliar `tools/smoke-test.mjs` o crear `tools/security-test.mjs` con los casos de control de acceso, IDOR, CSRF/Origin, validación, webhook y límites. Deben ejecutarse en local y opcionalmente contra Render (solo las pasivas).
4. **`docs/seguridad/CHECKLIST-PRODUCCION.md`:** lista de verificación previa a abrir la tienda, con lo que hace el código y lo que debe hacer la propietaria en los paneles (Render, Supabase, Stripe, EmailJS y dominio).
5. **Lista de tareas pendientes** que no se puedan resolver en código, con su prioridad.

## Criterios de cierre
- Ningún hallazgo crítico o alto abierto.
- Los medios tienen corrección o una aceptación de riesgo justificada y firmada por la propietaria.
- `npm run build`, la sintaxis PHP y todas las pruebas de seguridad pasan.
- La CSP lleva una semana en `Report-Only` sin bloqueos legítimos antes de pasar a modo estricto.
