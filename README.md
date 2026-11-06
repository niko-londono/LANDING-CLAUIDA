# LANDING-CLAUIDA
Landing page de diseño de interiores. Sitio estático (HTML, CSS y JS sin dependencias), publicado en Vercel.

## Estructura
```
index.html              Página principal
site.webmanifest        Manifiesto (iconos, colores)
favicon.ico             Favicon de respaldo
vercel.json             Configuración de Vercel (caché de assets)
assets/
  css/styles.css        Estilos y variables de diseño (paleta, tipografía)
  js/main.js            Menú, cabecera y recorrido 3D con scroll
  img/favicon/          Favicon SVG y PNG (32, 180, 192, 512)
  img/proyectos/        Fotos de proyectos (pendiente)
  img/iconos/           Iconos (pendiente)
  fonts/                Tipografías propias (pendiente)
  secuencia/escritorio/ Recorrido 3D 16:9 (160 fotogramas, 960 y 1920 px)
  secuencia/movil/      Recorrido 3D 9:16 (160 fotogramas, 720 y 1080 px)
docs/                   Notas de diseño y contenido
2026-11-05 · casa minimalista/  Material fuente del recorrido 3D (no se publica)
```

## Desarrollo local
Abre `index.html` con cualquier servidor estático, por ejemplo:
```
npx serve .
```
