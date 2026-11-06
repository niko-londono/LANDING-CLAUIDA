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
