# LANDING-CLAUIDA
Landing page de diseño de interiores. Sitio estático (HTML, CSS y JS sin dependencias), publicado en Vercel.

## Estructura
```
index.html              Landing (portada, quién soy, servicios, portafolio, proceso, contacto)
quien-soy/index.html    Presentación personal de Claudia: recorrido con scroll por la casa de roble (/quien-soy)
proyectos/<nombre>/index.html   Página de cada proyecto, con su recorrido con scroll (/proyectos/<nombre>)
site.webmanifest        Manifiesto (iconos, colores)
favicon.ico             Favicon de respaldo
vercel.json             Configuración de Vercel (caché de assets)
assets/
  css/styles.css        Estilos compartidos por la landing y los proyectos
  css/landing.css       Solo la landing: composiciones SVG y paralaje por capas (sin fotos de proyectos)
  js/main.js            Menú, cabecera, revelados y recorrido con scroll (si la página tiene canvas)
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
