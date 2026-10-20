# Prompt: rediseño visual y de experiencia de usuario de Mundo Nómada

> Usar tal cual como encargo. Solo se cambia la capa visual (HTML de plantillas, CSS y
> comportamiento de interfaz). La funcionalidad, los servicios, las rutas y el backend no se tocan.

---

## Contexto

Mundo Nómada es una tienda online pequeña de moda y complementos de Baena (Córdoba), con
Instagram [@mundonomadaa](https://www.instagram.com/mundonomadaa/). El logo es un ojo con rayos
de trazo único y las letras "MUNDO NÓMADA" deformadas, en granate. La mayoría de las compras se
harán desde **móvil**, seguidas de tablet y escritorio.

Stack: Angular 19 con componentes standalone en `frontend/mundo-nomada`, Bootstrap 5.3, la fuente
Montserrat e iconos de Bootstrap Icons y Font Awesome. Los estilos globales están en
`src/styles.css` y cada componente tiene su propio `.css`.

**Identidad visual de la marca (según su Instagram):**

- **Tono:** boutique de moda femenina cercana, con estética cálida y otoñal.
- **Colores de producto y fotografía:** marrones, camel, verde oliva, crema y granate.
  Fotos de tienda con madera y luz cálida.
- **Fotografía:** vertical (4:5), sobre modelo o en contexto, con formatos tipo "cómo se ve en
  tienda vs. puesto".
- **Rótulos:** editoriales y limpios. Los "destacados" de Instagram son círculos granates con
  iconos blancos de línea fina, el mismo trazo que el logo.
- **Referencia de estilo:** la web debe sentirse como una extensión de ese Instagram, es decir,
  cálida, editorial y cuidada, y no como una plantilla genérica de Bootstrap. Las fotos de
  producto son las protagonistas: la interfaz las enmarca con aire, fondos neutros cálidos y
  detalles granates.
- **Recursos gráficos:** usar el motivo de los rayos del ojo del logo como recurso gráfico sutil
  (separadores, insignias, iconos circulares de categoría al estilo de los destacados).

**Objetivo:** que la web parezca diseñada por un estudio profesional de e-commerce. Tiene que ser
coherente, limpia, rápida, accesible y agradable en cualquier dispositivo, sin cambiar lo que hace.

## Reglas obligatorias

1. **Sin cambios funcionales.** No modificar servicios (`src/app/services`), modelos, rutas
   (`app.routes.ts`), guards, llamadas HTTP, validaciones de formularios, el flujo de checkout con
   Stripe ni nada de `backend/`. La lógica TypeScript de los componentes solo se toca para la
   interfaz: abrir y cerrar el panel lateral, el estado del tema y las clases o estados visuales.
2. **Se mantienen** la fuente Montserrat, los iconos (Bootstrap Icons y Font Awesome) y la paleta
   actual (`--color-primario #791515`, `--color-secundario #f7f7f7`, `--color-texto #333333`,
   `--color-hover #9a1a1a`). Se pueden **añadir** tonos derivados de la misma paleta (superficies,
   bordes, versión para modo oscuro), definidos como variables CSS.
3. **Se mantienen** todos los textos e información visibles. Se pueden reorganizar y jerarquizar,
   pero no eliminar.
4. **Rama aparte.** Todo el trabajo va en `feature/rediseno-visual`, con una etiqueta Git
   `pre-rediseno-visual` en el punto de partida. Nada se fusiona en `codex/render-deployment`
   (la rama que publica Render) hasta que la propietaria lo apruebe.
5. Commits pequeños y por bloques (base, menú, catálogo, ficha, carrito/checkout, cuenta, admin,
   footer/legales), para poder deshacer bloques sueltos.

## Decisiones de la propietaria (rellenar antes de ejecutar)

- [x] **Fondo cálido:** cambiar `--color-secundario` de `#f7f7f7` (gris frío) a un crema cálido
  `#f6f1eb` y añadir `--color-arena #ece3d9` para secciones alternas. El texto y el granate
  quedan igual. Si no se aprueba, se mantiene `#f7f7f7`.
- [x] **Enlace a WhatsApp:** botón de contacto con el número de pedidos de la biografía de
  Instagram (en el footer y en Contacto). Es un enlace nuevo, no una funcionalidad: solo si se
  aprueba.

## 1. Base del sistema de diseño (`src/styles.css`)

- **Tokens de diseño en `:root`:**
  - Colores de marca y derivados: `--color-primario-suave` (fondo granate al 8 %),
    `--color-superficie`, `--color-borde`, `--color-texto-suave`.
  - Espaciado (escala de 4/8 px), radios, sombras (3 niveles suaves), duraciones y curvas de animación.
  - Tamaños de fuente fluidos con `clamp()` para títulos y textos.
- **Botones:** unificar en `.btn-primario`, `.btn-secundario` y `.btn-fantasma`, con estados
  hover, active, focus-visible y disabled. Sustituir los estilos duplicados por componente
  (`.btn-custom` repetido en varios `.css`) por las clases globales, manteniendo los nombres
  existentes como alias para no romper plantillas.
- **Formularios:** inputs con altura táctil mínima de 44–48 px, foco visible con anillo granate,
  errores claros y `font-size` de 16 px como mínimo en móvil (evita el zoom automático de iOS).
- **Tarjetas, insignias, alertas y toasts:** con el mismo lenguaje visual. Las notificaciones
  (`.notification-banner`) no deben tapar el menú ni salirse de la pantalla en móvil.
- **Accesibilidad:**
  - Contraste AA en todo.
  - `:focus-visible` en todos los elementos interactivos.
  - `prefers-reduced-motion` desactiva animaciones.
  - Áreas táctiles de 44 px como mínimo.
- **Ajustes globales:**
  - `scroll-behavior: smooth`.
  - `-webkit-tap-highlight-color: transparent`.
  - Soporte de `env(safe-area-inset-*)` para el notch.
  - Eliminar el `padding-top: 74px` fijo y usar una variable de altura de cabecera.

## 2. Modo oscuro (problema actual en móvil)

La web no tiene modo oscuro: el navegador del móvil la oscurece automáticamente y el logo
(`public/img/logo.jpg`, fondo blanco) aparece como un recuadro claro.

- **Modo oscuro propio:**
  - Implementarlo con `@media (prefers-color-scheme: dark)`, redefiniendo los tokens.
  - Fondo granate muy oscuro casi negro (p. ej. `#141010`), superficies `#1d1717`, texto `#ece6e3`.
  - Granate aclarado para enlaces y acentos sobre fondo oscuro (p. ej. `#d0605f`), con contraste AA.
- **Etiqueta de esquema de color:** añadir `<meta name="color-scheme" content="light dark">` en
  `index.html` y `color-scheme` en CSS. Así los navegadores usan nuestro tema y no fuerzan el suyo.
- **Logo en modo claro y oscuro:**
  - Generar una versión del logo **con fondo transparente** a partir de `logo.jpg`. Lo ideal es un
    SVG vectorizado de un solo color que use `currentColor`; si no, un PNG transparente.
  - En modo claro va en granate y en modo oscuro en blanco o crema.
  - Mantener `logo.jpg` y `logo_black.jpeg` sin borrar.
- **Imágenes de producto:** que no se vean "quemadas" en modo oscuro (fondo de tarjeta neutro y
  sin inversión).
- **Revisión completa:** todas las pantallas en ambos modos, incluidos formularios, tablas del
  admin, alertas de Bootstrap y el recibo del checkout.

## 3. Cabecera y menú lateral (sustituye a los desplegables)

Archivo: `src/app/componentes/menu/`.

- **Cabecera fija** (`position: sticky`):
  - Compacta en móvil (56–64 px) y más amplia en escritorio.
  - Fondo con ligera transparencia y `backdrop-filter: blur` al hacer scroll.
  - Sombra que aparece solo al desplazarse.
- **Móvil y tablet (< 992 px):**
  - Logo a la izquierda; a la derecha el carrito con contador y el botón hamburguesa.
  - La hamburguesa abre un **panel lateral (off-canvas) desde la derecha**:
    - Ancho de 85 % con un máximo de 360 px, fondo de la superficie y overlay oscuro detrás.
    - Animación `transform` suave (250–300 ms, ease-out).
    - Se cierra al tocar el overlay, con la tecla Escape, con el botón ✕ y al navegar a otra ruta.
    - Bloquea el scroll del `body` mientras está abierto.
    - Focus trap y `aria-modal`, con el foco devuelto al botón al cerrar.
  - Contenido del panel:
    1. Saludo o acceso a la cuenta (Iniciar sesión / Mi perfil).
    2. Inicio.
    3. **Catálogo** como lista de categorías visible o acordeón dentro del panel (no un dropdown
       flotante), con "Ver todo".
    4. Contacto.
    5. Admin (solo si es admin).
    6. Cerrar sesión.
    7. Enlace a Instagram al pie.
- **Escritorio (≥ 992 px):**
  - Navegación horizontal limpia.
  - "Catálogo" como menú amplio o panel desplegable elegante, o bien abriendo el mismo panel
    lateral. Hay que elegir lo más profesional y coherente.
  - Menú de usuario accesible.
- **Contador del carrito:** usa el color de marca (no `bg-danger`) con una animación sutil al cambiar.
- **Bootstrap JS:** quitar la dependencia de los `data-bs-toggle` del menú y controlar el
  panel con Angular (signals o estado del componente).

## 4. Páginas

Revisar cada una en **360, 390, 768, 1024, 1280 y 1440 px**:

- **Inicio (`main`):**
  - Portada con identidad de marca (logo, lema y botón "Ver catálogo").
  - Secciones con aire y ritmo vertical consistente.
  - Imágenes con `object-fit` y relación de aspecto fija.
- **Catálogo (`mostrar-products`):**
  - Rejilla de 2 columnas en móvil, 3 en tablet y 4 en escritorio.
  - Tarjetas con imagen 4:5, nombre, precio destacado y estado de stock.
  - Botón de añadir al carrito accesible con el pulgar.
  - Filtros de categoría como chips desplazables horizontalmente en móvil.
  - Estados vacío y de carga con skeletons.
  - `loading="lazy"` en imágenes.
- **Ficha (`detalle-producto`):**
  - Imagen grande.
  - En móvil, barra inferior fija con precio y "Añadir al carrito".
  - Selector de cantidad grande.
  - Información de envío y devoluciones en bloques plegables.
- **Carrito (`carrito`):**
  - Líneas en formato tarjeta en móvil, con controles de cantidad táctiles.
  - Resumen de totales fijo abajo en móvil y lateral pegajoso en escritorio.
  - Estado vacío atractivo.
- **Checkout (`checkout`):**
  - Formulario en una columna en móvil, con `autocomplete` correcto (`given-name`,
    `family-name`, `street-address`, `postal-code`, `address-level2`, `address-level1`,
    `tel`, `email`) y `inputmode` numérico en código postal y teléfono.
  - Resumen plegable arriba en móvil.
  - Botón "Pagar con tarjeta" fijo abajo en móvil.
  - Sellos de confianza (pago seguro con Stripe).
  - Recibo legible y apto para imprimir.
- **Login, registro y perfil:**
  - Tarjeta centrada, cómoda en móvil y con buen ritmo visual.
  - Pestañas del perfil desplazables en móvil.
- **Contacto y páginas legales del footer:**
  - Tipografía de lectura (ancho máximo ~70 caracteres, interlineado 1.6–1.7).
  - Índice ancla en las páginas largas.
- **Footer:** columnas en escritorio y acordeón o pila ordenada en móvil, con Instagram visible.
- **Admin** (panel, pedidos, productos, categorías, usuarios):
  - Limpio y funcional.
  - Tablas que en móvil se convierten en tarjetas o tienen scroll horizontal controlado.
  - No requiere el mismo nivel de pulido que la tienda.

## 5. Rendimiento y limpieza

- **Una sola copia de Bootstrap.** Ahora mismo se carga varias veces: CSS por CDN y por
  `angular.json`, el bundle JS 5.3.3 dos veces, y además Popper y Bootstrap 5.1.3. Dejar
  únicamente la versión de `node_modules` declarada en `angular.json` y comprobar que no se rompe
  nada que use JS de Bootstrap.
- **Iconos y fuentes sin duplicados.** Eliminar los enlaces repetidos de Bootstrap Icons. Quitar
  Material Icons y Material Symbols solo si no se usan en ninguna plantilla (comprobar con búsqueda).
  Cargar Montserrat solo con los pesos usados.
- **Imágenes:** con `width`/`height` o `aspect-ratio` para evitar saltos de diseño.
- **Animaciones:** solo con `transform` y `opacity`.
- **Presupuesto:** el build no debe crecer de forma notable. Ejecutar `npm run build` sin errores
  nuevos.

## 6. Verificación antes de entregar

1. **Compilación:** `npm run build` sin errores.
2. **Vista previa real:**
   - Usar `ng serve` con un proxy de desarrollo (`proxy.conf.json`) que redirija `/api_php` a
     `https://mundo-nomada-test.onrender.com`, enviando la cabecera `Origin` de ese dominio, y
     `runtime-config.js` local apuntando a `/api_php/`.
   - Los archivos del proxy son solo de desarrollo y no deben afectar al build de producción.
3. **Recorrido completo** en móvil (390 px), tablet (768 px) y escritorio (1440 px), en modo
   claro y oscuro:
   - inicio → catálogo → ficha → añadir al carrito → carrito → checkout (hasta la página de Stripe, sin pagar)
   - login, registro y perfil
   - panel lateral: abrir, navegar y cerrar con Escape y con el overlay
   - admin
4. **Capturas** de antes y después de las pantallas principales para que la propietaria compare.
5. **Lista de cambios** y forma de deshacerlos.

## 7. Cómo deshacer

- Mientras no se fusione, la web publicada no cambia: basta con no fusionar
  `feature/rediseno-visual`.
- Si ya se fusionó, `git revert` del commit de fusión en `codex/render-deployment`, subir y hacer
  **Deploy latest commit** en Render. También se puede pulsar **Rollback** al despliegue anterior en
  el panel de Render.
- La etiqueta `pre-rediseno-visual` marca el estado exacto anterior.
