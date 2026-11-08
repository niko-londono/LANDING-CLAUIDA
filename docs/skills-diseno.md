# Skills de diseño disponibles

Índice de las skills de diseño, animación y UI instaladas, con lo que hace cada una y cuándo conviene en esta página. Antes de cada cambio a la landing, Claude revisa esta lista y elige la skill (o la combinación) que mejor encaja con el pedido. Las reglas están en [CLAUDE.md](../CLAUDE.md).

**Stack de la página:** HTML, CSS y JS sin framework, con paralaje por scroll y una secuencia de fotogramas en canvas. Se publica en Vercel. Por eso las skills de React Native, Swift, shadcn/Tailwind o librerías de toasts casi nunca aplican.

---

## 1. Diseño general y criterio visual

| Skill | Para qué sirve | Cuándo usarla aquí |
|---|---|---|
| **impeccable** | Diseñar, rediseñar, criticar, auditar, pulir, simplificar o reforzar una interfaz. Cubre jerarquía, maquetación, tipografía, color, movimiento, textos de UX, accesibilidad, responsive y estados límite. También sirve para hacer más atrevida una UI sosa o más sobria una recargada | Es la puerta de entrada para cualquier pedido de diseño amplio: "mejora la página", "rediseña esta sección", "audita la UI", "ponla más elegante" |
| **ui-ux-pro-max:ui-ux-pro-max** | Base de datos de diseño que se puede consultar: estilos, paletas por tipo de producto, parejas de fuentes, pautas de UX, iconos, presets de GSAP y guías por stack | Para elegir con datos una paleta, una pareja de fuentes o un estilo nuevo, o para revisar la página contra pautas de UX |
| **emilkowalski-skills:emil-design-eng** | La filosofía de pulido de Emil Kowalski: detalles invisibles, curvas propias, estados `:active`, hover solo con ratón, nada de `transition: all` | Para pulir los detalles finos de botones, enlaces, tarjetas y transiciones |
| **emilkowalski-skills:apple-design** | El enfoque de Apple llevado a la web: profundidad por capas, materiales translúcidos, tipografía (tracking, interlineado), movimiento físico, movimiento reducido | Para profundidad, cristal translúcido, ajuste tipográfico de títulos y accesibilidad de movimiento |

## 2. Marca, identidad y sistema de diseño

| Skill | Para qué sirve | Cuándo usarla aquí |
|---|---|---|
| **ui-ux-pro-max:brand** | Voz de marca, identidad visual, mensajes, guía de estilo y coherencia | Para reescribir textos con un tono, definir la voz del estudio o comprobar la coherencia de marca |
| **ui-ux-pro-max:design-system** | Tokens en tres capas (primitivo → semántico → componente), variables CSS, escalas de espaciado y tipografía, fichas de componentes | Para ordenar los tokens de `styles.css` o crear un DESIGN.md |
| **ui-ux-pro-max:design** | La skill "paraguas": identidad, tokens, logos con IA, identidad corporativa, mockups, banners, iconos e imágenes para redes | Para pedir un logo, un favicon, iconos o imágenes para compartir la página (Open Graph, redes) |
| **ui-ux-pro-max:banner-design** | Banners para redes, anuncios, héroes de web e impresión, con varias direcciones de arte | Para crear un banner del hero, anuncios o piezas para promocionar la landing |
| **ui-ux-pro-max:ui-styling** | Interfaces con shadcn/ui, Radix y Tailwind; temas, modo oscuro y diseños en canvas | Poco aplicable, porque no usamos Tailwind ni React. Sí sirve como referencia para el modo oscuro o para piezas visuales en canvas |
| **ui-ux-pro-max:slides** | Presentaciones en HTML con Chart.js y tokens de diseño | Solo si se pide una presentación del proyecto o del estudio |

## 3. Animación y movimiento

| Skill | Para qué sirve | Cuándo usarla aquí |
|---|---|---|
| **parallax-con-claude** | Crea las imágenes de una web parallax o de scrollytelling: entrevista, storyboard, escena 3D (Three.js) o 2D por capas, o un vídeo del usuario convertido en WebP para ordenador y móvil, con póster y manifiesto | Para crear o rehacer la secuencia de fotogramas del hero, un nuevo recorrido de cámara o pasar un vídeo a fotogramas |
| **emilkowalski-skills:animate** | Construye una animación desde cero decidiendo en orden: si debe animarse, su propósito, herramienta, propiedades, curva, duración, interrupción y salida. Escribe el código | Cuando se pide animar algo concreto: "haz que esto aparezca", "añade una transición" |
| **emilkowalski-skills:find-animation-opportunities** | Busca dónde falta movimiento y descarta lo que no debe moverse. Solo propone, con valores exactos | "¿Qué más podría animarse?", "dale más vida a la página" |
| **emilkowalski-skills:improve-animations** | Audita el movimiento que ya existe y deja planes de mejora priorizados. Solo planifica | "Revisa las animaciones", "audita el movimiento" |
| **emilkowalski-skills:animation-performance** | Mantiene las animaciones dentro del presupuesto de cada fotograma: propiedades que solo componen, CSS vs JS, `will-change`, coste del blur | Cuando algo va a tirones, para el paralaje y el canvas, o antes de añadir efectos pesados |
| **emilkowalski-skills:animation-vocabulary** | Glosario: convierte "eso que rebota cuando…" en el término exacto | Cuando el usuario describe un efecto sin saber cómo se llama |

## 4. Móvil, robustez y calidad

| Skill | Para qué sirve | Cuándo usarla aquí |
|---|---|---|
| **emilkowalski-skills:mobile-native** | Hace que una web se sienta nativa en el móvil: hover pegado, destello al tocar, el bug de `100vh`, zoom en inputs, notch, barra de estado | Cualquier pedido sobre cómo se ve o se siente en el móvil |
| **emilkowalski-skills:break-ui** | Intenta romper la UI con datos extremos (nombres larguísimos, textos vacíos, otros idiomas, emoji) y muestra qué se rompe | Si se añaden contenidos variables (formulario real, proyectos cargados, traducciones) |

## 5. Herramientas de apoyo (no son de diseño, pero se combinan)

| Skill | Para qué sirve | Cuándo usarla aquí |
|---|---|---|
| **run** | Lanza la app y comprueba el cambio funcionando | Para verificar en el navegador después de cada cambio visual |
| **dataviz** | Gráficos y visualizaciones de datos coherentes y accesibles | Solo si la página llega a mostrar cifras o gráficos |
| **code-review / simplify** | Revisión de errores y limpieza del código cambiado | Antes de publicar cambios grandes |

## Fuera de alcance para esta página

- **emilkowalski-skills:animate-expo**: animación en React Native / Expo.
- **emilkowalski-skills:write-swift**: código Swift.
- **emilkowalski-skills:ask-sonner**: librería de toasts para React.

---

## Cómo se eligen (guía rápida)

| Si el pedido es… | Skills, en este orden |
|---|---|
| Rediseñar o "hacer más profesional" una sección | impeccable → ui-ux-pro-max → emil-design-eng |
| Cambiar colores o fuentes | ui-ux-pro-max (paletas y parejas de fuentes) → design-system → impeccable |
| Añadir una animación concreta | animate → animation-performance → mobile-native |
| "Dale más vida" | find-animation-opportunities → animate |
| Revisar las animaciones actuales | improve-animations → animate |
| Algo va lento o a tirones | animation-performance |
| Arreglos en el móvil | mobile-native → apple-design (si toca movimiento o materiales) |
| Nuevo recorrido 3D, nuevas fotos de secuencia o vídeo | parallax-con-claude |
| Logo, favicon, imagen para compartir o banner | ui-ux-pro-max:design / banner-design → brand |
| Textos, tono, mensajes | ui-ux-pro-max:brand → impeccable (textos de UX) |
| Profundidad, cristal o tipografía fina | apple-design → emil-design-eng |
| Contenido nuevo variable | break-ui |

Después de cualquier cambio visual: verificar en la vista previa local y publicar solo cuando el usuario diga "Yes, publish".
