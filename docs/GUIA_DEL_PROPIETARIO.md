# Guía del propietario de Mundo Nómada

Esta guía contiene únicamente lo que debe hacer el propietario de la tienda. No necesitas saber programar. Cuando termines un paso, responde en el chat con el número del paso y se continuará con la parte técnica.

## Regla importante

No compartas en el chat contraseñas, claves, tokens, datos bancarios ni documentos de identidad. Las claves se pegan directamente en el panel de Render o de Supabase, nunca en GitHub.

## Estado actual (20 de octubre de 2026)

- Web publicada en Render (modo demostración): https://mundo-nomada-test.onrender.com
- Base de datos Supabase en Europa con la actualización de pagos aplicada.
- Pago con Stripe **funcionando en modo de prueba**: compra MN-2 pagada con la tarjeta 4242, confirmada por el webhook y con el stock descontado.
- Cuenta de administración de la tienda creada. Admin → **Pedidos** muestra lo que hay que enviar.

## Lista de pendientes

- [x] Paso 1. Actualización de la base de datos
- [x] Paso 2. Cuenta de Stripe en modo de prueba y `STRIPE_SECRET_KEY`
- [x] Paso 3. Webhook de Stripe y `STRIPE_WEBHOOK_SECRET`
- [x] Paso 4. Compra de prueba
- [x] Paso 5. Cuenta de administración
- [ ] Paso 6. Catálogo real
- [ ] Paso 7. Dominio y planes de pago (Render Starter, Supabase Pro)
- [ ] Paso 8. Textos legales
- [ ] Paso 9. Abrir la tienda con pagos reales

---

## Antes de desplegar la versión con precios con IVA incluido

La tienda pasa a mostrar y guardar el **precio final con IVA** (como Zara o cualquier tienda online). El IVA ya no aparece en el carrito, solo una nota "IVA incluido", y la factura lo desglosa al final.

1. En Supabase → **SQL Editor**, ejecuta `supabase/migrations/20261022120000_prices_with_vat.sql`. Multiplica los precios actuales por 1,21 (por ejemplo, 24,90 pasa a 30,13). Los pedidos ya hechos no cambian y sus facturas siguen cuadrando.
2. Justo después, en Render, **Deploy latest commit**. Entre los dos pasos la web antigua sumaría el IVA dos veces, así que no los separes.
3. Repasa los precios en **Modificar producto** y redondéalos a tu gusto (30,13 → 29,95).

Si la migración de tallas (abajo) aún no estaba aplicada, ejecuta primero la de tallas y después esta, y despliega una sola vez al final.

## Antes de desplegar la versión con tallas

1. En Supabase → **SQL Editor**, pega y ejecuta todo `supabase/migrations/20261022090000_product_variants.sql`. Cada producto actual pasa a tener una talla con su stock de ahora (o "Única" si no tenía talla), y los carritos y pedidos existentes se enlazan a ella.
2. Justo después, en Render pulsa **Deploy latest commit**. Entre los dos pasos la tienda puede fallar unos minutos, porque la versión antigua aún busca el stock en el producto.
3. Comprobación: `select count(*) from public.producto_variantes;` debe dar al menos tantas filas como productos hay.

## Despliegue de la versión con facturas (hecho)

La migración `supabase/migrations/20261021090000_invoice_numbers.sql` ya está aplicada en Supabase.

## Pasos completados (referencia)

**Paso 1.** Migración `supabase/migrations/20261020120000_stripe_checkout.sql` ejecutada en Supabase → SQL Editor.

**Paso 2.** En Render → Environment: `STRIPE_SECRET_KEY` = clave secreta `sk_test_...`. La clave publicable (`pk_...`) no se usa.

**Paso 3.** Stripe → Workbench → Webhooks → destino con ámbito **Tu cuenta**, carga **Resumen**, eventos `checkout.session.completed`, `checkout.session.expired`, `checkout.session.async_payment_succeeded` y `checkout.session.async_payment_failed`, URL `https://<web>/api_php/checkout/webhook.php`. Su secreto de firma está en Render como `STRIPE_WEBHOOK_SECRET`.

**Paso 4.** Compra con la tarjeta `4242 4242 4242 4242`, cualquier fecha futura y cualquier CVC.

**Paso 5.** Tras registrarse en la web, en Supabase → SQL Editor:

```sql
update public.users set role = 'admin' where lower(email) = lower('email-de-la-tienda');
-- Comprobación:
select id, name, email, role from public.users where role = 'admin';
```

El editor responde "Success. No rows returned" aunque el cambio se haya aplicado. Después hay que cerrar sesión y volver a entrar.

---

## Paso 6. Catálogo real

### 6.1 Prepara la información de cada producto

| Campo | Qué poner | Ejemplo |
|---|---|---|
| Nombre | Nombre corto y claro | Blusa lino bordada |
| Precio | **Precio final con IVA incluido**, el que paga la clienta | 29,95 |
| Descripción | Material, medidas, cuidados | 100 % lino, lavar a 30 °C |
| Categoría | Debe existir antes | Blusas, Bolsos, Accesorios |
| Color | Opcional | Blanco |
| Tallas y stock | Cada talla con sus unidades reales | S: 2, M: 3, L: 1 |
| Imagen | Foto del producto | Ver abajo |

**Imágenes:** se guardan dentro de la base de datos, así que deben ser ligeras.

- JPG, PNG o WebP; la web las reduce sola a 1200 px antes de guardarlas.
- Para reducirlas: https://squoosh.app (gratis).
- Con muchos productos convendrá moverlas a un almacenamiento aparte (Supabase Storage): avisar cuando llegue el momento.

**Tallas:** un producto lleva todas sus tallas, cada una con su stock. En el formulario, la tabla **Tallas y stock** tiene botones para rellenar S–XL, XS–XXL o 36–44 de una vez; las flechas cambian el orden en que las ve la clienta.

- **Fotos:** en **Modificar producto → Foto** puedes subir, cambiar o quitar la foto de cualquier producto. Se reduce sola en el navegador (las del móvil sirven tal cual).
- Bolsos, bisutería y complementos: arriba de la tabla elige **Talla única** (en lugar de **Con tallas**) y pon solo el stock. La ficha no muestra selector y se añaden al carrito directamente.
- La clienta tiene que elegir talla antes de añadir al carrito. Las tallas agotadas se ven tachadas.
- El mismo modelo en otro color es **otro producto**, porque necesita su propia foto.
- Para dejar de vender una talla, ponle stock 0 o bórrala de la tabla. Los pedidos antiguos conservan la talla que se compró.
- Para intercambiar los nombres de dos tallas, hazlo en dos pasos (la web no permite que dos tallas se llamen igual ni un momento).

### 6.2 Crear el catálogo

1. Admin Panel → **Agregar categoría**, una por tipo de producto.
2. Admin Panel → **Agregar producto**, uno por uno.
3. Abre el catálogo como cliente y revisa precios, fotos, tallas y stock.

### 6.3 Productos de prueba

No borres "Blusa de prueba", "Bolso de prueba", "Pañuelo de prueba" ni la categoría **Demostración**: tienen pedidos de prueba asociados. Avisa cuando el catálogo real esté cargado y se limpiarán junto con los usuarios y pedidos de prueba.

**Hecho cuando:** el catálogo real está completo y revisado.

---

## Paso 7. Dominio y planes de pago

### 7.1 Comprar el dominio

- En cualquier registrador: [DonDominio](https://www.dondominio.com), [Namecheap](https://www.namecheap.com) o Cloudflare.
- Por ejemplo `mundonomada.es` (unos 10 €/año).
- **No** contrates el hosting ni el correo que ofrezcan junto al dominio.

### 7.2 Render → plan Starter (unos 7 $/mes)

[Render](https://dashboard.render.com/web/srv-damni7u7bikc73bpa7lg) → **Settings → Instance Type → Starter**. El plan gratuito se duerme y el primer visitante espera casi un minuto.

### 7.3 Supabase → plan Pro (25 $/mes)

Supabase → **Organization → Billing → Pro**. El plan gratuito se **pausa tras 7 días sin uso** (ya ocurrió en octubre y dejó la web caída). El plan Pro incluye copias de seguridad diarias.

### 7.4 Conectar el dominio a Render

1. Render → **Settings → Custom Domains → Add Custom Domain**: añade `mundonomada.es` y `www.mundonomada.es`.
2. Render muestra unos registros DNS (`A` o `CNAME`): créalos en el panel del registrador del dominio.
3. Espera a que Render marque **Verified**. El HTTPS se activa solo (de minutos a unas horas).

### 7.5 Avisar al servidor del dominio nuevo

Render → **Environment** → añade `MUNDONOMADA_ALLOWED_ORIGIN` = `https://mundonomada.es` (sin barra final) → **Save, rebuild, and deploy**.

Sin esta variable, el inicio de sesión y el carrito fallan desde el dominio nuevo: por seguridad, el servidor solo acepta peticiones de su propio dominio.

### 7.6 Actualizar el webhook de Stripe

Stripe → **Workbench → Webhooks** → tu destino → **Editar** → URL `https://mundonomada.es/api_php/checkout/webhook.php`.

**Hecho cuando:** `https://mundonomada.es` carga, permite iniciar sesión y una compra de prueba con la tarjeta 4242 queda **pagada**.

---

## Paso 8. Textos legales

Obligatorios para vender online en España (LSSI y RGPD). Las páginas actuales tienen **datos de ejemplo** (por ejemplo, el NIF "B12345678" del aviso legal es inventado). Envía en el chat estos datos para actualizarlas:

**Titular**

- Nombre completo o razón social, y si eres autónomo/a o sociedad.
- NIF/CIF.
- Dirección fiscal.
- Email y teléfono de atención al cliente.
- Si es una sociedad: datos de inscripción en el Registro Mercantil.

**Envíos**

- Zonas: ¿solo península? ¿Baleares, Canarias, Ceuta, Melilla?
- Plazo de entrega (por ejemplo, 2–4 días laborables) y transportista.
- Precio: hoy son 3,50 € y gratis desde 60 € sin IVA (72,60 € con IVA). ¿Se mantiene?

**Devoluciones**

- Plazo: mínimo legal de 14 días naturales.
- Quién paga el envío de la devolución.
- Excepciones (productos personalizados, ropa interior…).
- Cómo se solicita (por ejemplo, por email).

**Cookies**

- ¿Se usará Google Analytics u otra herramienta de analítica? Si no, la web solo usa cookies técnicas (sesión y carrito) y el aviso es más sencillo.

**Facturas**

Los mismos datos del titular (nombre o razón social, NIF y domicilio fiscal) se ponen en `frontend/mundo-nomada/src/app/config/datos-fiscales.ts`. Mientras falten, el PDF que reciben los clientes se emite como **"Justificante de compra"** sin validez fiscal. En cuanto estén, pasa a ser **"Factura simplificada"** con numeración correlativa (F2026-000001…).

Que tu gestor/a confirme:

- Que la factura simplificada te sirve: ventas a particulares de hasta 400 €.
- Cómo te afecta **Verifactu**: el sistema de facturación verificable obligatorio para la facturación electrónica, que se aplica desde 2027.

Conviene que un/a gestor/a o abogado/a revise los textos finales.

**Hecho cuando:** aviso legal, privacidad, cookies, condiciones de compra, envíos y devoluciones tienen datos reales.

---

## Paso 9. Abrir la tienda con pagos reales

Hazlo solo cuando los pasos 6, 7 y 8 estén completos.

### 9.1 Activar la cuenta de Stripe

1. En Stripe pulsa **"Cambia a la cuenta en modo activo"**.
2. Completa la verificación: datos del negocio y del titular (documento de identidad), cuenta bancaria (IBAN) para recibir el dinero, descripción del negocio y URL de la web (el dominio nuevo).
3. Espera la aprobación (de horas a algunos días).

### 9.2 Claves reales

1. En modo activo: **Desarrolladores → Claves de API** → copia la **clave secreta** `sk_live_...`.
2. Crea un **webhook nuevo en modo activo**, igual que en el paso 3 (mismos 4 eventos, carga **Resumen**, URL del dominio nuevo). Copia su `whsec_...`.
3. En Render → **Environment**, sustituye los valores:
   - `STRIPE_SECRET_KEY` → `sk_live_...`
   - `STRIPE_WEBHOOK_SECRET` → el `whsec_...` del webhook en modo activo
4. En modo activo: **Configuración → Correos de clientes → Pagos correctos**, para que el cliente reciba el justificante.

### 9.3 Quitar el modo demo

Render → **Environment** → `MUNDONOMADA_PRODUCTION` = `1` → **Save, rebuild, and deploy**. Desaparece el aviso amarillo de demostración y Google puede indexar la web.

### 9.4 Compra real de control

1. Haz una compra real pequeña con tu propia tarjeta.
2. Comprueba que el pedido aparece **pagado** en Admin → Pedidos, que llega el justificante y que el stock baja.
3. Reembólsala en Stripe → **Pagos** → el pago → **Reembolsar**, y vuelve a subir el stock de esa talla desde **Modificar producto**.

**Hecho cuando:** la compra real se ha cobrado, aparece en Pedidos y se ha reembolsado correctamente. La tienda está abierta.

---

## Uso diario

- **Nuevos pedidos:** Admin → Pedidos, filtro **pagado**. Prepara el paquete y pulsa **Marcar como enviado**; cuando llegue, **Marcar como completado**.
- **Reembolsos y cancelaciones de pedidos pagados:** se hacen en el panel de Stripe. Después ajusta el stock de la talla desde **Modificar producto** si la prenda vuelve a la tienda.
- **Pedidos "pendiente" o "cancelado":** son pagos que el cliente no terminó. El stock se devuelve solo cuando Stripe los caduca (unos 30 minutos).
- **Copias de seguridad:** con Supabase Pro son diarias. Antes de cambios grandes en el catálogo, descarga una copia desde Supabase → Database → Backups.
