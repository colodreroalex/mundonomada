# Prompt: estilo glassmorphism premium para Mundo Nómada

> Usar tal cual como encargo. Es una **prueba visual reversible**: se aplica en una rama aparte,
> detrás de un interruptor que la apaga en un segundo, y solo cambia la capa visual. La
> funcionalidad, los servicios, las rutas y el backend no se tocan.

---

## Contexto

Mundo Nómada es una tienda online pequeña de moda femenina y complementos de Baena (Córdoba),
con estética cálida, otoñal y editorial (Instagram [@mundonomadaa](https://www.instagram.com/mundonomadaa/)).
La mayoría de las compras se hacen desde **móvil**. Las fotos de producto son las protagonistas.

Stack: Angular 19 standalone en `frontend/mundo-nomada`, Bootstrap 5.3, Montserrat, Bootstrap
Icons y Font Awesome. Ya existe un sistema de diseño completo en `src/styles.css`:

- **Tokens** en `:root`: colores, tipografía fluida, espaciado de 4 px, radios
  (`--radio-sm 8px`, `--radio 14px`, `--radio-lg 22px`, `--radio-pill`), sombras cálidas
  (`--sombra-1/2/3`), movimiento (`--ease`, `--t-rapida 150ms`, `--t-media 260ms`).
- **Modo oscuro propio**: `[data-bs-theme="dark"]` en `<html>`, que pone `public/tema-inicial.js`
  antes del primer pintado y cambia `TemaService` con el botón sol/luna.
- La cabecera (`menu`) ya usa `backdrop-filter`. El diálogo de detalle de pedido del perfil y los
  controles del carrusel también usan un desenfoque ligero.

**Objetivo:** una capa de **vidrio translúcido premium, limpia y elegante**: menús, paneles y
tarjetas translúcidos, una portada (slides) con tarjeta de vidrio, una gráfica suave en la
administración de pedidos y maquetación moderna. Debe sentirse **cálida y de boutique**, no
tecnológica ni neón. El vidrio enmarca las fotos, no compite con ellas.

## Reglas obligatorias

1. **Sin cambios funcionales.** No modificar servicios (`src/app/services`), modelos, rutas,
   guards, llamadas HTTP, validaciones, el flujo de Stripe ni nada de `backend/`. La lógica
   TypeScript solo se toca para estados visuales y, si se aprueba, para calcular la gráfica a
   partir de datos que la pantalla ya ha cargado.
2. **Misma paleta, sin colores nuevos.** Los tintes del vidrio salen de los tokens existentes con
   `color-mix()`: `--color-superficie`, `--color-secundario`, `--color-arena`, `--color-marca`,
   `--color-primario` y sus versiones de modo oscuro. El granate sigue siendo el único acento.
   Los colores de estado (`--color-exito`, `--color-aviso`, `--color-error`) no cambian.
3. **Se mantienen** los textos, la fuente Montserrat y los iconos. **Ninguna dependencia nueva**
   (ni npm ni CDN): la CSP de `backend/apache-site.conf` solo permite scripts propios
   (`script-src 'self'`).
4. **Reversible por diseño** (lo más importante de este encargo):
   - Toda la capa de vidrio va en **un archivo nuevo**, `src/vidrio.css`, registrado en
     `angular.json` justo después de `src/styles.css`.
   - **Todas** sus reglas cuelgan de `html[data-estilo='vidrio']`, y ese atributo se pone en
     `<html>` de `src/index.html`. Quitar el atributo devuelve la web exactamente a su aspecto
     actual.
   - Los cambios en plantillas HTML deben ser mínimos y verse bien también con el interruptor
     apagado (por ejemplo, un `div` envolvente sin estilo propio).
5. **Rama aparte.**
   - Partir de `codex/render-deployment` y crear `feature/glassmorphism`, con una etiqueta Git
     `pre-glassmorphism` en el punto de partida.
   - Antes de empezar, revisar `git status`. Si hay cambios sin guardar ajenos al diseño (por
     ejemplo en `docs/`), no mezclarlos: añadir a cada commit solo las rutas del diseño, nunca
     `git add -A`.
   - Nada se sube ni se fusiona en `codex/render-deployment` (la rama que publica Render) sin la
     aprobación de la propietaria.
6. **Commits pequeños y por bloques**, en este orden, para poder deshacer bloques sueltos: base y
   fondo, cabecera y menús, portada, catálogo y ficha, carrito y checkout, cuenta, admin y
   gráfica, notificaciones/modales/pie.
7. **Presupuesto de CSS por componente.** `angular.json` avisa a los 12 kB y falla a los 16 kB.
   `perfil-usuario.component.css` ya supera el aviso (13,35 kB) y `menu.component.css` ocupa
   15,6 kB sin minificar. Por eso los estilos de vidrio van en `src/vidrio.css` y no en el CSS de
   los componentes. Solo los elementos nuevos (la gráfica) pueden llevar CSS propio, con cada
   archivo por debajo de 12 kB.

## Decisiones de la propietaria (rellenar antes de ejecutar)

- [x] **Fondo ambiental** (recomendado): manchas de luz muy difuminadas en granate suave y arena
  detrás del contenido, fijas al hacer scroll. Sin algo detrás, el vidrio sobre el crema liso no
  se nota. Si no se aprueba, el vidrio se reduce a translucidez con borde y brillo.
- [ ] **Grano sutil** (opcional): textura de ruido al 3 % solo sobre el fondo ambiental, para un
  acabado más "papel" y menos digital.
- [ ] **Cabecera flotante en escritorio** (opcional): barra de vidrio separada de los bordes, con
  esquinas redondeadas. Si no se aprueba, la cabecera sigue a todo el ancho.
- [x] **Resumen y gráfica en Admin → Pedidos** (opcional): tarjetas de cifras clave y una curva
  suave de facturación. Es un elemento nuevo del panel de administración, no de la tienda.

## 1. Base: tokens, utilidades y fondo (`src/vidrio.css`)

**Tokens** bajo `html[data-estilo='vidrio']`, con su versión oscura en
`html[data-estilo='vidrio'][data-bs-theme='dark']`. Valores de partida, a ajustar a ojo y con
medición de contraste:

| Token | Claro | Oscuro |
|---|---|---|
| `--vidrio-fondo` | superficie al 62 % | superficie (`#1f1919`) al 58 % |
| `--vidrio-fondo-fuerte` (paneles con mucho texto) | superficie al 84 % | superficie al 80 % |
| `--vidrio-fondo-sutil` | superficie al 40 % | superficie al 36 % |
| `--vidrio-oscuro` (sobre fotos, texto claro) | `rgba(20, 10, 8, 0.28)` | igual |
| `--vidrio-borde` | `rgba(255, 255, 255, 0.55)` | `rgba(255, 255, 255, 0.08)` |
| `--vidrio-brillo` (filo superior) | `inset 0 1px 0 rgba(255, 255, 255, 0.65)` | `inset 0 1px 0 rgba(255, 255, 255, 0.06)` |
| `--vidrio-sombra` | sombra cálida como `--sombra-2`, más difusa | como `--sombra-2` oscura |
| `--vidrio-blur` / `--vidrio-saturacion` | `18px` / `160%` (12 px en móvil) | igual |

**Utilidades:** `.vidrio`, `.vidrio-fuerte`, `.vidrio-sutil`, `.vidrio-oscuro` y
`.vidrio-sin-blur` (misma translucidez y borde, sin `backdrop-filter`, para elementos repetidos).
Cada una con fondo, `-webkit-backdrop-filter` y `backdrop-filter`
(`saturate() blur()`), borde de 1 px, brillo más sombra y `--radio-lg` por defecto.

**Alternativas obligatorias** (el vidrio nunca debe empeorar la lectura):

- `@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px)))`:
  superficies sólidas.
- `@media (prefers-reduced-transparency: reduce)`: superficies sólidas.
- `@media (forced-colors: active)`: sin transparencias y con bordes visibles.
- `@media print`: sin vidrio ni fondo ambiental.

**Fondo ambiental** (si se aprueba): `html[data-estilo='vidrio'] body::before` fijo, `inset: 0`,
`z-index: -1`, `pointer-events: none`, con 2–3 `radial-gradient` grandes: granate suave arriba a
la derecha, arena abajo a la izquierda. En oscuro, brillos granate profundo (`--color-marca` al
~20 %) sobre `#141010`. Estático: no se animan fondos grandes. El grano, si se aprueba, va solo en
esta capa como SVG `feTurbulence` en `data:` (la CSP ya permite `img-src data:`).

**Reglas técnicas del vidrio** (cumplirlas evita los fallos típicos):

1. **Vidrio dentro de vidrio no desenfoca.** Un ancestro con `backdrop-filter`, `filter`,
   `opacity < 1`, `mask` o `mix-blend-mode` impide que sus descendientes desenfoquen la página.
   Hoy `.cabecera` tiene `backdrop-filter`, así que el desplegable de Catálogo y el menú de
   usuario no verían el contenido de detrás. Solución: mover el desenfoque de la cabecera a
   `.cabecera::before` (`position: absolute; inset: 0; z-index: -1`) y dejar `.cabecera` sin
   `backdrop-filter`. Mismo patrón donde haya vidrio anidado.
2. **`backdrop-filter` rompe los `position: fixed` de dentro.** El elemento pasa a ser el bloque
   contenedor de sus descendientes fijos. Nunca poner vidrio directamente en un ancestro de
   `.barra-compra` (ficha), `.barra-total` (carrito), `.barra-pago` (checkout), `.dialogo`
   (perfil), `.notification-banner` ni `.panel-lateral`. Usar el patrón `::before`.
3. **Nada de desenfoque en elementos repetidos.** Ni en las tarjetas de producto, ni en el botón
   `.btn-addcart` (visible en todas las tarjetas), ni en las líneas del carrito, ni en las listas
   de pedidos o usuarios: ahí se usa `.vidrio-sin-blur` o nada. Como máximo unas 6 superficies
   desenfocadas visibles a la vez.
4. **Legibilidad primero.** El texto corrido solo va sobre `.vidrio-fuerte` o sobre superficie
   sólida. Contraste AA (4,5:1 texto normal, 3:1 texto grande e iconos) medido sobre el punto
   más desfavorable del fondo, también sobre las fotos de la portada. Los campos de formulario
   mantienen fondo sólido.
5. **Movimiento:** solo `opacity` y `transform`, con `--ease`, `--t-rapida` y `--t-media`. Nunca
   animar `backdrop-filter` ni gradientes grandes. El `prefers-reduced-motion` global ya existe.
6. **Especificidad:** los estilos de componente llevan el atributo de Angular
   (`.clase[_ngcontent-…]`, 0-2-0). `html[data-estilo='vidrio'] .clase` (0-2-1) gana sin
   `!important`. Subir la especificidad solo lo justo, y usar `!important` solo donde la base ya
   lo usa (`.btn-custom`, sombras de `.card`).
7. Escribir siempre `-webkit-backdrop-filter` además de `backdrop-filter` (Safari).

## 2. Cabecera y menús (`menu`)

- **Cabecera:** vidrio en `::before` con línea inferior de brillo. Con `.cabecera-scroll`, un poco
  más opaca y con `--vidrio-sombra`. Si se aprueba la cabecera flotante en escritorio (≥ 992 px),
  barra separada de los bordes con `--radio-pill` o `--radio-lg`, sin tapar contenido y
  respetando `--header-h` y `env(safe-area-inset-*)`.
- **Desplegable de Catálogo (menú amplio):** `.vidrio` con `--radio-lg`. Enlaces con hover en
  `--color-primario-suave` y brillo interior. La tarjeta "Toda la colección" conserva su foto,
  con su CTA como píldora `.vidrio-oscuro`. Entrada con `opacity` + `translateY(-6px)
  scale(0.98)` → reposo en `--t-media`.
- **Menú de usuario** y `.dropdown-menu` de Bootstrap: mismo lenguaje.
- **Panel lateral móvil:** `.vidrio-fuerte` (tiene mucho texto). La capa `.panel-fondo` lleva
  `--color-overlay` más un desenfoque de 6 px. Las filas de navegación tienen hover y estado
  activo de vidrio, y el interruptor de modo oscuro pasa a ser un interruptor de vidrio. No tocar
  el focus trap, Escape, el cierre al navegar ni el bloqueo de scroll.
- El contador del carrito sigue en granate sólido.

## 3. Portada y slides (`main`)

- El carrusel conserva sus imágenes, el fundido, el intervalo de 5,5 s y la pausa al pasar el ratón.
- **Lema sobre tarjeta de vidrio:** el bloque de `.hero-contenido` (logo, etiqueta, título y botón)
  va dentro de una tarjeta `.vidrio-oscuro` con texto `#fbf8f4`. En escritorio la tarjeta queda a
  la izquierda, centrada en vertical. En móvil va abajo, a todo el ancho menos el gutter, con
  `--radio-lg`. Se puede suavizar el degradado oscuro actual si el contraste sigue en AA.
- **Indicadores:** dentro de una píldora de vidrio oscuro. El punto activo se alarga como ahora.
- **Flechas anterior/siguiente:** círculos de vidrio con borde de brillo, visibles solo con ratón
  (como ahora).
- **Ventajas (`service-features`):** las 4 tarjetas pasan a `.vidrio` sobre la banda arena
  (realzada por el fondo ambiental). El icono va en un círculo de vidrio con tinte granate, como
  los destacados de Instagram. Disposición en rejilla tipo bento: 2×2 en móvil y tablet, 4
  columnas en escritorio. Se mantienen el hover con elevación y todos los textos.

## 4. Catálogo y ficha de producto

- **Tarjetas de producto (`mostrar-products`):** sin vidrio en la tarjeta. Solo:
  - etiquetas sobre la foto (`.product-tag`, "Últimas", "Agotado") con `.vidrio-sin-blur` de
    fondo fuerte;
  - el botón de vista rápida, que solo aparece con hover y ratón, en `.vidrio`;
  - `.btn-addcart` sin desenfoque (está en todas las tarjetas).
- **Paginación y chips de filtro**, si los hay: píldoras de vidrio con el activo en granate sólido.
- **Ficha (`detalle-producto`):** la foto sigue sólida. Los bloques de información (`.bloque`) van
  en `.vidrio-fuerte`. Las tallas (`.talla-boton`) son chips de vidrio con la seleccionada en
  granate sólido y las agotadas claramente atenuadas. La barra de compra fija de móvil
  (`.barra-compra`) va en `.vidrio-fuerte` con el área segura inferior.

## 5. Carrito y checkout

- **Carrito:** las líneas sin desenfoque. El resumen de totales (lateral pegajoso en escritorio y
  `.barra-total` en móvil) va en `.vidrio-fuerte`. La barra de progreso de envío gratis
  (`.progreso`) lleva pista de vidrio y relleno granate con transición suave del ancho.
- **Checkout:** el formulario se lee sobre `.vidrio-fuerte` o sobre superficie sólida, con los
  campos siempre sólidos. El resumen y `.barra-pago` van en `.vidrio-fuerte`. El botón de pago
  sigue en granate sólido. El recibo y la impresión no llevan vidrio. No tocar nada del flujo de
  Stripe.

## 6. Cuenta: acceso, registro y perfil

- **Login y registro:** `.auth-tarjeta` en `.vidrio-fuerte` sobre el fondo radial que ya tiene
  `.auth-pagina`, con los brillos algo más presentes. Es el sitio donde mejor luce el efecto.
- **Perfil** (todo en `src/vidrio.css`, no en su CSS, que ya pasa del aviso de presupuesto):
  - cabecera con avatar en `.vidrio`;
  - pestañas (`.perfil-pestanas`) como control segmentado de vidrio, con la activa en granate
    suave y brillo interior;
  - "Estadísticas" como 3 tarjetas de cifras (KPI) de vidrio, con icono en círculo de vidrio y el
    dato grande;
  - paneles `.panel-superficie` en `.vidrio-fuerte`;
  - diálogo de detalle de pedido en `.vidrio-fuerte` con fondo desenfocado a 6 px;
  - historial de pedidos sin desenfoque (es una lista).

## 7. Administración y gráfica suave

- **Panel (`admin-panel`):** rejilla bento de tarjetas `.admin-tarjeta` en `.vidrio`, con
  "Ver y gestionar pedidos" (`.destacada`) como tarjeta ancha. Mismos enlaces.
- **Resumen y gráfica en `admin-pedidos`** (solo si se aprueba):
  - **Datos:** solo los `pedidos` que la pantalla ya carga, respetando el filtro de estado activo
    (con el texto "según el filtro actual"). Sin llamadas nuevas a la API ni cambios en servicios.
    El cálculo va en el componente (getter o `computed`).
  - **Cifras:** 3 tarjetas KPI de vidrio con número de pedidos, importe total y ticket medio, en
    EUR con el pipe `currency` como el resto de la pantalla.
  - **Gráfica:** SVG en línea, sin librerías. Muestra la facturación por día de los últimos 30
    días, o por semana si hay pocos datos. La línea es una curva suave monótona (sin oscilaciones
    por debajo de cero) en granate de 2 px, con un área en degradado granate del ~28 % al 0 %,
    líneas guía horizontales finas y sin ejes recargados.
  - **Tooltip:** píldora de vidrio con fecha e importe, también con teclado (puntos enfocables).
  - **Accesibilidad:** `role="img"` con un `aria-label` que resuma la gráfica, más una tabla de
    datos `visually-hidden`.
  - **Animación:** la línea se dibuja una vez al cargar (`stroke-dashoffset`, ~900 ms) y no se
    anima con `prefers-reduced-motion`.
  - **Estado vacío** con menos de 2 puntos.
  - Su CSS en `admin-pedidos.component.css`, por debajo de 12 kB. Va en su propio commit para
    poder quitarlo solo. Con el interruptor de vidrio apagado se ve con superficies sólidas.
- Las listas y tablas del admin, sin desenfoque.

## 8. Notificaciones, modales, pie y páginas legales

- `.notification-banner` en `.vidrio-fuerte`, conservando el borde izquierdo de color de estado.
- `.modal-content` de Bootstrap y el acordeón de preguntas frecuentes en `.vidrio-fuerte`.
- **Pie:** el fondo arena y la banda granate de contacto siguen sólidos (texto largo). El botón de
  WhatsApp se convierte en píldora de vidrio claro sobre el granate y los iconos sociales en
  círculos de vidrio.
- **Páginas legales e informativas (`.pagina-info`):** como mucho `.vidrio-fuerte`. La comodidad
  de lectura manda.
- La franja `.aviso-demo` no cambia.

## 9. Rendimiento

- **Línea base actual** (`npm run build`): compila con un único aviso de presupuesto
  (`perfil-usuario.component.css`, 13,35 kB sobre 12 kB) más los avisos CommonJS de
  `jspdf`/`canvg`. El total inicial es de 849,89 kB.
  - Al terminar no debe haber **ningún aviso nuevo**.
  - `src/vidrio.css` debería quedar por debajo de ~15 kB.
- **Scroll fluido:** recorrer portada y catálogo a 390 px con la CPU ralentizada ×4 en DevTools,
  sin tirones visibles ni fotogramas largos de Paint/Composite en el panel Performance.
- **Lighthouse móvil:** Rendimiento y Accesibilidad no bajan más de 3 puntos frente a la línea
  base. Guardar las dos mediciones.

## 10. Verificación antes de entregar

1. `npm run build` sin errores ni avisos nuevos.
2. **Vista previa real:**
   - `ng serve` con un proxy de desarrollo temporal que redirija `/api_php` a
     `https://mundo-nomada-test.onrender.com`, enviando la cabecera `Origin` de ese dominio, y
     `runtime-config.js` local apuntando a `/api_php/`.
   - Los archivos del proxy y del `runtime-config.js` local **no se suben**.
3. **Recorrido** a 390, 768 y 1440 px, en modo claro y oscuro, **con y sin** `data-estilo="vidrio"`:
   - inicio (slides) → menú de Catálogo → catálogo → ficha → añadir al carrito → carrito →
     checkout hasta la página de Stripe, sin pagar;
   - panel lateral: abrir, navegar y cerrar con Escape y con el fondo;
   - login, registro y perfil (pestañas y diálogo);
   - admin y pedidos (gráfica);
   - páginas legales y notificaciones.
4. **Alternativas:**
   - En DevTools → Rendering, emular `prefers-reduced-transparency: reduce`, `forced-colors` y
     `prefers-reduced-motion`.
   - Probar en Firefox y en Safari de iOS si es posible.
5. **Contraste** medido en las superficies de vidrio de ambos temas, incluida la tarjeta de la
   portada sobre la foto más clara del carrusel.
6. **Capturas de antes y después** de las pantallas principales en `tmp/capturas-vidrio/`
   (ignorada por Git), para que la propietaria compare.
7. **Entrega:** lista de cambios por commit, decisiones tomadas, mediciones (build, Lighthouse,
   contraste) y cómo deshacer.

## 11. Cómo deshacer

- **Comparar sin tocar código:** abrir cualquier página con `?estilo=clasico` al final de la
  dirección (por ejemplo `/main?estilo=clasico`) muestra el estilo anterior en esa visita.
- **Al instante, para comparar:** quitar `data-estilo="vidrio"` de `<html>` en `src/index.html`.
  La web vuelve a su aspecto actual. Solo se quedaría el resumen de pedidos del admin, si se
  aprobó, y con estilo sólido.
- **Quitar la capa:** borrar la línea de `src/vidrio.css` en `angular.json` y el archivo.
- **Con Git:**
  - Mientras no se fusione, la web publicada no cambia: basta con no fusionar
    `feature/glassmorphism`.
  - Para quitar un solo bloque, `git revert <commit del bloque>`.
  - Si ya se fusionó, `git revert -m 1 <commit de fusión>` en `codex/render-deployment`, subir y
    hacer **Deploy latest commit** en Render, o pulsar **Rollback** al despliegue anterior en el
    panel de Render.
  - La etiqueta `pre-glassmorphism` marca el estado exacto anterior.
