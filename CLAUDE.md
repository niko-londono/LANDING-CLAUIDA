# Landing · reglas para Claude

## Antes de cada pedido sobre la página

1. Lee [docs/skills-diseno.md](docs/skills-diseno.md).
2. Elige la skill o skills que mejor resuelven el pedido. Usa la tabla "Cómo se eligen" como punto de partida, no como regla rígida.
3. Di en una línea qué skills vas a usar y por qué. Luego invócalas con la herramienta Skill, en el orden elegido, antes de tocar el código.
4. Si instalas o desinstalas skills de diseño, actualiza docs/skills-diseno.md.

## Proyecto

- Página estática: `index.html`, `assets/css/styles.css`, `assets/js/main.js`. No hay build ni framework.
- Vista previa local: configuración `landing` en `.claude/launch.json` (python http.server, puerto 4173).
- Producción: Vercel despliega cada push a `main`. El dominio principal es https://landing-claudia.vercel.app; landing-clauida redirige ahí.
- Publicar (commit + push) solo cuando el usuario lo apruebe ("Yes, publish").
- Al cambiar `styles.css` o `main.js`, sube la versión `?v=AAAAMMDD` de sus enlaces en `index.html`.
- `docs/` y los `.md` no se publican (`.vercelignore`).
- Historial de decisiones de diseño: [docs/plan-paralaje.md](docs/plan-paralaje.md).
