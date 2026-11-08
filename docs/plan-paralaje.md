# Plan · Página con paralaje profesional

## Auditoría de skills de UI

| Skill | ¿Se usa? | Para qué |
|---|---|---|
| emil-design-eng | Sí · 1.º | Criterio general: curvas propias, `:active`, hover con media query, nada de `transition: all` |
| apple-design | Sí · 2.º | Profundidad por capas, materiales translúcidos, tracking negativo en títulos, movimiento reducido y transparencia reducida |
| animate | Sí · 3.º | Orden de decisión (¿debe animarse?, propósito, herramienta, propiedades, curva) y receta de "scroll reveal" |
| animation-performance | Sí · 4.º | Solo `transform`/`opacity`/`clip-path`, paralaje fuera del hilo principal cuando se pueda, sin variables CSS animadas en contenedores |
| mobile-native | Sí · 5.º | `svh`, zonas seguras, tap highlight, `touch-action`, hover solo con ratón |
| find-animation-opportunities / improve-animations | No | Solo auditan y proponen; aquí construimos |
| break-ui | No | El contenido es fijo, no hay datos variables que estresar |
| animate-expo, write-swift, ask-sonner, animation-vocabulary | No | React Native, Swift, toasts y glosario: no aplican |

## Decisiones (skill animate)

- **¿Animar?** Sí: página de marketing que se visita pocas veces → presupuesto de "delight".
- **Propósito:** explicación (recorrer la casa) y profundidad espacial.
- **Herramienta:** CSS scroll-driven animations (`animation-timeline: view()`), que corren fuera del hilo principal. Si el navegador no las soporta, un único bucle `requestAnimationFrame` que escribe `transform` directamente en cada imagen visible.
- **Propiedades:** `transform` (paralaje), `clip-path` (revelado de fotos), `opacity` (textos).
- **Curvas:** `--ease-out: cubic-bezier(0.23, 1, 0.32, 1)` y `--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1)`. Paralaje en `linear` porque está atado al scroll.
- **Duraciones:** botones 140 ms; revelado de fotos 600 ms (receta "scroll reveal"); textos 600 ms con escalonado de 60 ms. Se disparan una sola vez.

## Fotos

Las 9 claves del recorrido (`trabajo/claves`) ya existen en WebP dentro de la secuencia: fotogramas 1, 22, 33, 52, 73, 90, 106, 128 y 160. Se usan con `<picture>`: horizontal (960/1920) en escritorio y vertical (720/1080) en móvil.

## Estructura nueva

1. **Hero:** se mantiene el recorrido 3D con canvas.
2. **Estudio:** texto y foto del umbral (22) con paralaje dentro del marco.
3. **Capítulos a pantalla completa:** salón (52), comedor (73), cocina (90) y dormitorio (128). Fondo a velocidad lenta y tarjeta de texto translúcida a velocidad normal.
4. **Servicios:** tarjetas con entrada escalonada.
5. **Proyectos:** galería en mosaico con tres profundidades distintas (exterior 1, salón 33, cocina 106).
6. **Proceso.**
7. **Contacto:** sobre el ventanal final (160) con velo oscuro.

## Accesibilidad y móvil

- `prefers-reduced-motion`: sin paralaje ni revelados con movimiento; solo fundidos.
- `prefers-reduced-transparency`: cabecera y tarjetas opacas.
- `viewport-fit=cover` con `env(safe-area-inset-*)` en la cabecera, `-webkit-tap-highlight-color: transparent`, `touch-action: manipulation` en controles y hover solo con `(hover: hover) and (pointer: fine)`.
- Comprobar en un móvil real: el escritorio no reproduce la barra de URL ni el tacto.

---

## Segunda pasada · pulido (find-animation-opportunities + emil-design-eng)

### Oportunidades que pasan el filtro

| # | Dónde | Hoy | Propósito | Frecuencia | Movimiento |
|---|---|---|---|---|---|
| 1 | Hero `h1` | El título aparece de golpe y se cruza con el tejado | Delight (primera visita) | Rara | Palabras que suben desde una máscara: `translateY(105%)` → 0, 900 ms `--ease-out`, escalonado 50 ms. Velo lateral detrás del texto |
| 2 | Hero, recorrido | No se sabe cuánto falta ni en qué estancia estás | Indicación de estado | Ocasional | Riel con 4 paradas; relleno con `scaleY(progreso)` escrito en el mismo rAF del canvas, sin transición |
| 3 | Cabecera | Siempre tapa la parte alta de las fotos | Evitar un cambio brusco | Ocasional | Se oculta al bajar y vuelve al subir: `translateY(-100%)`, 300 ms `--ease-out` |
| 4 | Menú móvil | Los enlaces aparecen todos a la vez | Consistencia espacial | Ocasional | `opacity` + `translateY(8px)`, 300 ms `--ease-out`, escalonado 40 ms solo al abrir |
| 5 | Menú escritorio | No marca la sección actual | Indicación de estado | Ocasional | Subrayado `scaleX(0→1)` desde la izquierda, 200 ms `--ease-out` |
| 6 | Aviso del formulario | El mensaje aparece de golpe | Evitar un cambio brusco | Rara | `opacity` + `translateY(4px)`, 250 ms `--ease-out` |

### Descartadas

- **Paralaje en los textos:** es contenido que se lee; moverlo por estilo estorba (función).
- **Inclinación 3D de tarjetas al pasar el ratón:** decorativo en algo que se ve decenas de veces (frecuencia).
- **Cursor personalizado:** decoración que entorpece la navegación (función).
- **Indicador de scroll que rebota en bucle:** bucle lento cerca de 0,2 Hz, mal para el sistema vestibular (apple-design §14); lo sustituye el riel del recorrido.

### Antes / después

| Antes | Después | Por qué |
|---|---|---|
| `h1` aparece entero con un fundido | Palabras que suben desde una máscara | La entrada se lee como diseño editorial y solo ocurre una vez |
| Texto del hero sobre el tejado | Velo degradado bajo el texto | Legibilidad sin tapar la casa |
| Cabecera fija siempre visible | Se oculta al bajar, vuelve al subir | Las fotos a pantalla completa respiran |
| Menú sin estado activo | Subrayado en la sección actual | El usuario sabe dónde está |
| Enlaces del menú móvil de golpe | Entrada escalonada 40 ms | Cascada natural sin bloquear |
| Menú móvil encerrado en la cabecera tras hacer scroll | Sin `backdrop-filter` ni `transform` mientras está abierto | Ambos crean un bloque contenedor para elementos `fixed` |
| Logo oculto con el menú móvil abierto | `z-index` sobre el menú | El usuario sigue sabiendo dónde está |
