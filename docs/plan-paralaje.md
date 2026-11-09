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

## Landing + portafolio (2026-11-08)

- La portada pasa a ser una landing normal del estudio: portada con foto y paralaje suave, estudio, servicios, **portafolio**, proceso y contacto.
- El recorrido con scroll deja de ser la portada y se convierte en la página del proyecto **Casa Roble** (`/proyectos/casa-roble`): hero con la secuencia, capítulos por estancia, galería y cierre con llamada a contacto.
- Cada proyecto guarda su secuencia en `assets/proyectos/<nombre>/`; el canvas indica su carpeta con `data-base` y la sección hero su póster con `--poster` / `--poster-movil`. `main.js` y `styles.css` son compartidos.
- Portafolio: lista de tarjetas enlazadas. El primer proyecto va destacado (foto grande + texto al lado); los siguientes forman rejilla automática.
- Skills: impeccable (estructura, extensión del sistema visual actual) y emil-design-eng (hover solo con ratón, flecha que avanza 4 px, `:active` en la tarjeta).

## Landing sin fotos, paleta nueva y paralaje SVG (2026-11-08)

- La landing ya no usa imágenes ni fotogramas de los proyectos. Todo es SVG o CSS: escena de arcos por capas en la portada, plano que se dibuja en el manifiesto, muestrario de materiales en el estudio, iconos de línea en servicios, portada abstracta en la tarjeta del portafolio y arcos en contacto.
- Paleta «barro y oliva» (tokens en styles.css): hueso #f2ece3, lino, arena, tinta #1e1b18, terracota #a9502b como acento (4,6:1 sobre hueso), oliva #2f3a2e para contacto, ocre, roble y salvia en ilustraciones. Fuentes: Instrument Serif (títulos) y Hanken Grotesk (texto). Se aplican también a la página del proyecto.
- Paralaje: CSS scroll-driven (`scroll(root)` en las capas de la portada, `view()` en `.deriva`, el plano y el riel del proceso) que corre fuera del hilo principal; respaldo con un solo rAF en main.js. En la portada, además, profundidad con el ratón suavizada (lerp), solo con puntero fino y sin movimiento reducido.
- La escena se recorta por abajo: el borde inferior hace de suelo y las capas lejanas se hunden tras él.
- Skills: impeccable, ui-ux-pro-max (paleta y fuentes; su propuesta negro + dorado se descartó por fría), animate (capas, curvas, movimiento reducido).

## Cafetería Sostenible: recorrido por pasos (2026-11-08)

- El vídeo dura 2:40 y en 500-750vh de scroll la cámara corría demasiado. La página pasa a un **recorrido por pasos** (`.hero--pasos` + `assets/js/recorrido-pasos.js`): una pantalla fija con 9 paradas en el orden del vídeo (entrada, área de comida, comedor, terraza, bancos curvos, vegetación, reciclaje y luz, árboles solares, conjunto).
- Cada gesto (rueda, trackpad, dedo o teclado) avanza una parada; mientras la cámara viaja se ignoran los gestos. Un gesto es una ráfaga de eventos sin pausas de más de 220 ms, así que la inercia del trackpad no salta paradas.
- Viaje de cámara: rAF que recorre los fotogramas intermedios con la curva `--ease-in-out` (cubic-bezier 0.77, 0, 0.175, 1); dura entre 1,3 y 3,4 s según la distancia.
- Datos de la memoria de grado en una tarjeta por parada: salen en 450 ms al empezar el viaje y entran escalonados (80 ms, con un desenfoque de 4 px) al 72 % del viaje, cuando la cámara ya frena.
- En la última parada el siguiente gesto suelta el scroll normal (galería, ficha, cierre); al volver arriba del todo, el recorrido se retoma hacia atrás. El riel de la derecha permite saltar a cualquier parada, y hay un enlace "Saltar recorrido".
- Se quitan los capítulos a pantalla completa porque repetían lo que ahora cuenta el recorrido.
- Movimiento reducido: la cámara salta a la parada y los datos solo aparecen y desaparecen.
- Skills: animate, animation-performance, mobile-native.

## Cafetería Sostenible: vuelta al scroll libre (2026-11-08)

- Al usuario le gustaron las tarjetas de datos, pero no el scroll por secciones. Se vuelve a **scroll libre** y se conservan las 9 tarjetas.
- **360 fotogramas** (antes 240), uno cada 0,44 s de vídeo. Variantes: ordenador 1920 / 1280 / 960 y móvil 1080 / 800, WebP calidad 60. Pesan 17 MB (1280) y 13 MB (móvil 800); por eso la carga va de grueso a fino: paradas, 1 de cada 8, de 4, de 2 y el resto.
- Línea de tiempo con **pausas**: en cada parada la cámara se queda quieta 26 "unidades" de scroll (1 unidad = 1 fotograma de viaje) mientras su tarjeta está en pantalla. Sección de 1500vh.
- Fluidez: la vista sigue al scroll con inercia (suavizado exponencial de 110 ms, independiente de los Hz) y funde cada fotograma con el siguiente solo en el tramo central (smoothstep 0,3-0,7), para no dejar imagen doble.
- El riel de la derecha lleva a la pausa de cada parada con scroll suave.

## Cafetería Sostenible: sin pausas y sin tirones (2026-11-08)

- Las pausas en cada parada se sentían como "scroll por secciones". Se quitan: la cámara avanza siempre con el scroll (fotograma = progreso × 359) y cada tarjeta entra al llegar a su zona (desde `data-fotograma` − 3 hasta la siguiente zona o 40 fotogramas; la última entra 22 fotogramas antes del final). Sección de 1200vh (~30 fotogramas por pantalla).
- Los tirones venían de descomprimir cada WebP en el hilo principal al pintarlo: 10,7 ms de mediana y hasta 20 ms por fotograma nuevo (medido a 1280 px), dos por cuadro con el fundido. Ahora los fotogramas se descargan como Blob y solo los cercanos a la vista (14 por delante, 6 por detrás) se descomprimen con `createImageBitmap`, fuera del hilo principal: pintar cuesta 2,9 ms. Los lejanos se liberan (`close()`).
- Descarga: inicio de cada zona y 1 de cada 8 primero; después siempre el fotograma pendiente más cercano a la vista, con 6 descargas a la vez.
- Si un fotograma aún no está listo se pinta el listo más cercano, nunca se espera.

## CV de Claudia y «Quién soy» (2026-11-09)

- Textos de la landing reescritos con el CV real: bio (Lic. en Diseño e Interiorismo, PUCMM, Summa Cum Laude 2022), herramientas, idiomas, servicios (diseño interior y exterior, visualización 3D, interiorismo comercial), proceso (conversación, moodboard y concepto, modelado 3D, planos) y contacto (correo y teléfono). No se publican la dirección ni las referencias del CV.
- El recorrido de la casa de roble deja de ser un proyecto: pasa a `/quien-soy` como presentación personal (quién soy, formación, lo que hago, herramientas y trayectoria). `/proyectos/casa-roble` redirige ahí (vercel.json). Los fotogramas siguen en `assets/proyectos/casa-roble/`.
- En la landing, «Estudio» pasa a «Quién soy» con una ficha de datos y una tarjeta que lleva al recorrido; el portafolio queda solo con la Cafetería Sostenible.
- El formulario abre el correo de quien escribe con el mensaje listo para la dirección de Claudia (no hay servidor).
- Skills: ui-ux-pro-max:brand (textos), impeccable (estructura de la sección).

## Ideas de dos referencias, sin copiarlas (2026-11-09)

Referencias revisadas: cheshirepropertystudio.com y dbltakedesign.com. Se tomaron ideas de estructura, no su aspecto ni sus textos.

- **Principio con nombre propio** (como la "prueba de los diez años" de Cheshire, pero con el de Claudia): el manifiesto pasa a «Primero, cómo vives. Después, cómo se ve.» con un párrafo que explica qué cambia para el cliente.
- **Carta firmada** en Quién soy: cierre personal y firma en Instrument Serif cursiva, color terracota.
- **¿Te suena alguno?** (de DBL: hablar del problema antes que del servicio): tres frases del cliente con la respuesta de Claudia, en lista con líneas, sin tarjetas.
- **Servicios con "para quién"**: una línea por servicio (familias, constructoras, empresas).
- **Atajo a WhatsApp** (Cheshire): botón fijo en oliva; aparece al dejar la portada y se esconde en Contacto y en el cierre. En móvil solo el icono. También en Contacto.
- Descartado: ventanas emergentes de captación de correo y banners de cookies (interrumpen), testimonios inventados (hay que reunir reseñas reales), escaparates con desborde horizontal en móvil (fallo visto en DBL).
- Skills: impeccable, emil-design-eng.

## Inmersión: ciudad 3D de proyectos (2026-11-09)

- Página nueva `/inmersion`, enlazada desde el menú (junto a Portafolio) y con un bloque oscuro al final del portafolio (mini ciudad isométrica en SVG).
- Three.js 0.160 puro por importmap (jsDelivr, versión fija), sin build. Módulos en `assets/js/inmersion/`: escena, ciudad, cámara, interacción, HUD y arranque.
- Ciudad de 13×13 cuadras; las 7×7 centrales son navegables. Cada proyecto de `proyectos.json` ocupa una cuadra con un edificio low-poly según su `forma`, líneas de luz en las aristas (fundidas en una geometría por proyecto) y un marcador. La casa de roble (Quién soy) está en el centro, en ocre.
- Rendimiento: entorno con InstancedMesh (aceras, edificios, copas, troncos, postes, luces), frustum culling con esferas de instancias calculadas, raycasting contra 6 cajas invisibles, sombras de 1024 px (512 en táctil) que solo se recalculan cuando una cuadra se mueve, pixel ratio ≤ 2 (≤ 1,5 en táctil) y render bajo demanda. Medido en escritorio: 75 llamadas en la vista general, ~20 al acercarse, 22 mil triángulos, al ritmo de la pantalla.
- Cámara: MapControls con inercia y límites (no sale de la ciudad, no baja del horizonte); WASD/flechas y +/−. Vuelos con la curva --ease-in-out del sitio (bezier exacto), de 0,8 a 1,6 s, interrumpibles. En pantallas verticales la vista general es más cenital.
- HUD: índice de proyectos (fila de chips en móvil), leyenda y ayuda según el puntero, botones de acercar, alejar y vista general, etiqueta al pasar el ratón, ficha lateral (hoja inferior en móvil) con imágenes que se cargan al abrirla. Escape vuelve a la vista general.
- Carga perezosa: imágenes de cada ficha al abrirla; campo opcional `modelo` (.glb) que descarga GLTFLoader y el modelo solo al seleccionar la cuadra.
- Sin WebGL o sin JS: aviso y enlace al portafolio. Movimiento reducido: la cámara salta en lugar de volar.
- Los cuatro proyectos del CV sin imágenes muestran «se publicarán pronto» (no se inventan renders).
- Skills: impeccable, animate, animation-performance, mobile-native.

## Inmersión: calles vivas y rótulos de proyecto (2026-11-09)

- Decoración de calle, todo con InstancedMesh (una llamada por tipo): asfalto cálido, línea discontinua por tramos, pasos de cebra en cada cruce del centro, coches en los dos carriles (carrocería + cabina), personas en aceras, parques y delante de cada proyecto (cuerpo + cabeza), árboles de alineación redondos, bancos y flores en los parques, y un bosque en cuña a la derecha de la vista general.
- Rótulos fijos: un botón HTML sobre el marcador de cada proyecto, con rombo terracota (proyecto) u ocre (presentación) y una punta que señala la cuadra. Se recolocan solo cuando la escena se redibuja. Hover y selección los oscurecen. Así se distingue a simple vista con qué casas se puede interactuar. Sustituyen a la etiqueta que seguía al puntero.
- Coste medido en escritorio: 83 llamadas en la vista general, unos 116 mil triángulos (99 mil en táctil, con bosque menos denso), 60-63 llamadas de cerca.
