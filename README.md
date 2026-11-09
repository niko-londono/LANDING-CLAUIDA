# LANDING-CLAUIDA
Landing page de diseño de interiores. Sitio estático (HTML, CSS y JS sin dependencias), publicado en Vercel.

## Estructura
```
index.html              Landing (portada, quién soy, servicios, portafolio, proceso, contacto)
quien-soy/index.html    Presentación personal de Claudia: recorrido con scroll por la casa de roble (/quien-soy)
inmersion/index.html    Inmersión: ciudad 3D (Three.js) donde cada cuadra es un proyecto (/inmersion)
proyectos/<nombre>/index.html   Página de cada proyecto, con su recorrido con scroll (/proyectos/<nombre>)
site.webmanifest        Manifiesto (iconos, colores)
favicon.ico             Favicon de respaldo
vercel.json             Configuración de Vercel (caché de assets)
assets/
  css/styles.css        Estilos compartidos por la landing y los proyectos
  css/landing.css       Solo la landing: composiciones SVG y paralaje por capas (sin fotos de proyectos)
  js/main.js            Menú, cabecera, revelados y recorrido con scroll (si la página tiene canvas)
  js/inmersion/         Ciudad 3D: app.js (bucle), escena.js, ciudad.js, camara.js, interaccion.js, hud.js
  js/inmersion/proyectos.json   Proyectos de la ciudad (celda, forma, textos, imágenes)
  css/inmersion.css     Solo la página Inmersión
  img/favicon/          Favicon SVG y PNG (32, 180, 192, 512)
  proyectos/<nombre>/escritorio/  Secuencia 16:9 del proyecto (fotogramas, manifiesto y póster)
  proyectos/<nombre>/movil/       Secuencia 9:16 del proyecto
docs/                   Notas de diseño y contenido
2026-11-05 · casa minimalista/  Material fuente del recorrido 3D (no se publica)
```

## Añadir un proyecto al portafolio
1. Exporta su secuencia con la skill parallax-con-claude a `assets/proyectos/<nombre>/escritorio` y `/movil`.
   Si después rehaces los fotogramas, ponlos en una carpeta nueva (`assets/proyectos/<nombre>/v2/`, `v3/`…)
   y cambia las rutas: Vercel guarda `assets/proyectos/` en caché un año como inmutable, y con los
   mismos nombres quien ya visitó la página seguiría viendo los fotogramas viejos.
2. Copia `proyectos/cafeteria-sostenible/index.html` (o `quien-soy/index.html` como base de scroll libre) a `proyectos/<nombre>/index.html` y cambia textos, rutas,
   `data-base` del canvas, `--poster` / `--poster-movil` de la sección hero y los `data-desde` de las paradas.
3. Añade un `<li class="proyecto">` en la sección Portafolio de `index.html`. El primero lleva
   `proyecto--destacado` (ocupa toda la fila); el resto forma una rejilla.
   La portada de la tarjeta es un fotograma del propio proyecto (la única foto de proyecto
   en la landing); el resto de la landing es SVG.

## Desarrollo local
Abre `index.html` con cualquier servidor estático, por ejemplo:
```
npx serve .
```

## Añadir un proyecto a la ciudad (Inmersión)
Añade una entrada en `assets/js/inmersion/proyectos.json`: `celda` libre en la cuadrícula
de -3 a 3, una `forma` de las que hay en `ciudad.js` (casa, casa-l, oficina, pabellon,
dos-casas, piscina), textos, `imagenes` (se cargan solo al abrir la ficha) y, si existe,
`enlace` a su página. Opcional: `modelo` con la ruta a un `.glb` low-poly; se descarga
solo al seleccionar la cuadra y sustituye al edificio genérico.
Con `?fps` en la URL aparece un contador de FPS, llamadas de dibujo y triángulos.
