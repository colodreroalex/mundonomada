# Estado del proyecto

Última revisión: 21 de octubre de 2026.

## Publicado en pruebas

https://mundo-nomada-test.onrender.com: Render (Frankfurt, detrás de Cloudflare), conectado a Supabase
PostgreSQL (Irlanda). Rama desplegada: `codex/render-deployment`.

**Tienda**
- Catálogo, ficha de producto con selector de tallas (cada talla con su stock), carrito con control
  de stock por talla en el servidor.
- Registro, acceso, sesión persistente con rotación de token, perfil e historial de pedidos.
- Checkout con Stripe Checkout en modo test: el servidor calcula importes, reserva stock y solo el
  webhook firmado marca el pedido como pagado. El formulario se rellena con el último envío.
- Factura simplificada en PDF con numeración correlativa anual (F2026-000001); se emite como
  justificante hasta completar los datos fiscales (`src/app/config/datos-fiscales.ts`).

**Administración**
- Productos con su tabla de tallas y stock (con validación de imagen y precio), categorías, usuarios y pedidos (pagado → enviado →
  completado), con descarga de facturas.

**Diseño**
- Rediseño responsive con panel lateral, modo claro/oscuro con selector y paleta cálida.

**Seguridad** (auditoría del 20 de octubre: [informe](seguridad/INFORME-PENTEST.md))
- Sesiones revalidadas contra la base de datos, límites por IP y por cuenta, CSP estricta, HSTS,
  SRI, validación de entradas, dependencias actualizadas y pruebas automáticas en `tools/`.

## Pendiente de desplegar

- Tallas: aplicar `supabase/migrations/20261022090000_product_variants.sql` en Supabase y desplegar
  justo después (pasos en la [guía](GUIA_DEL_PROPIETARIO.md#antes-de-desplegar-la-versión-con-tallas)).

## Pendiente para vender

Detallado en la [guía de la propietaria](GUIA_DEL_PROPIETARIO.md) y en la
[lista de seguridad](seguridad/CHECKLIST-PRODUCCION.md):

1. EmailJS: destinatario fijo, dominios permitidos y límite de envíos.
2. Catálogo real e imágenes.
3. Dominio propio, Render Starter y Supabase Pro (copias de seguridad).
4. Textos legales y datos fiscales del vendedor (también para las facturas).
5. Stripe en modo real y `MUNDONOMADA_PRODUCTION=1`.
6. Antes de abrir: borrar pedidos y usuarios de prueba y reiniciar el contador de facturas.

## Mejoras recomendadas

- Migrar Angular 19 a una versión con soporte (quedan avisos sin impacto real).
- Recuperación de contraseña con correo transaccional.
- Imágenes de producto en Supabase Storage en lugar de base64 en la base de datos.
- Revisar con gestoría la factura simplificada y la obligación de Verifactu (2027).
