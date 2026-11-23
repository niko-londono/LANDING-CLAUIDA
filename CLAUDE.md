# Landing · reglas para Claude

## Antes de cada pedido sobre la página

1. Lee [docs/skills-diseno.md](docs/skills-diseno.md).
2. Elige la skill o skills que mejor resuelven el pedido. Usa la tabla "Cómo se eligen" como punto de partida, no como regla rígida.
3. Di en una línea qué skills vas a usar y por qué. Luego invócalas con la herramienta Skill, en el orden elegido, antes de tocar el código.
4. Si instalas o desinstalas skills de diseño, actualiza docs/skills-diseno.md.

## Proyecto

- Página estática: `index.html`, `assets/css/styles.css`, `assets/js/main.js`. No hay build ni framework.
- `index.html` es la landing del estudio. Cada proyecto del portafolio vive en `proyectos/<nombre>/index.html` con su recorrido con scroll; sus fotogramas en `assets/proyectos/<nombre>/`. Pasos para añadir uno: README.md.
- `quien-soy/index.html` es la presentación personal de Claudia (recorrido de la casa de roble); no es un proyecto del portafolio.
- `inmersion/index.html` es la ciudad 3D (Three.js 0.160 por importmap, sin build). Sus proyectos están en `assets/js/inmersion/proyectos.json`.
- En la landing, «¿Te suena alguno?» lleva un comparador 3D plano → resultado en `assets/js/comparador/` (Three.js por el mismo importmap, cargado solo al acercarse a la sección). Si cambias `escena.js`, sube su `?v=` en `arranque.js` y el de `arranque.js` en `index.html`.
- La portada de la landing vive dentro de la intro 3D de `assets/js/intro/` (la cámara se aleja de la pantalla del escritorio). Si cambias `escena.js`, sube su `?v=` en `intro/arranque.js` y el de `arranque.js` en `index.html`. Las olas entre secciones salen de `data-ola` y `data-ola-color` (main.js §12).
- Vista previa local: configuración `landing` en `.claude/launch.json` (python http.server, puerto 4173).
- Producción: Vercel despliega cada push a `main`. El dominio principal es https://landing-claudia.vercel.app; landing-clauida redirige ahí.
- Publicar (commit + push) solo cuando el usuario lo apruebe ("Yes, publish").
- Al cambiar `styles.css` o `main.js`, sube la versión `?v=AAAAMMDD` de sus enlaces en `index.html`.
- `docs/` y los `.md` no se publican (`.vercelignore`).
- Historial de decisiones de diseño: [docs/plan-paralaje.md](docs/plan-paralaje.md).
