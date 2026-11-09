/* =========================================================
   Recorrido por pasos (páginas de proyecto con .hero--pasos)
   Cada gesto de scroll (rueda, trackpad, dedo o teclado) lleva a la
   siguiente parada del vídeo. Mientras la cámara viaja, los gestos se
   ignoran: aunque se haga scroll rápido, se avanza de una en una.
   En la última parada, el siguiente gesto suelta el scroll normal de la
   página; al volver arriba del todo, el recorrido se retoma hacia atrás.
   ========================================================= */
(() => {
  const hero = document.querySelector(".hero--pasos");
  if (!hero || !window.SECUENCIAS) return;

  const lienzo = hero.querySelector(".hero__lienzo");
  const ctx = lienzo.getContext("2d");
  const pasos = [...hero.querySelectorAll(".paso")];
  const botones = [...hero.querySelectorAll(".pasos-nav__punto")];
  const relleno = hero.querySelector(".pasos-nav__relleno");
  const contador = hero.querySelector(".pasos-contador__actual");
  const raiz = lienzo.dataset.base;
  const ultimo = pasos.length - 1;
  const reducir = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Fotogramas ---------- */
  let secuencia, imagenes = [];
  const esVertical = () => window.innerWidth / window.innerHeight < 0.75;
  const fotogramaDe = (i) => parseInt(pasos[i].dataset.fotograma, 10) - 1; // base 0

  const cargarSecuencia = () => {
    const vertical = esVertical();
    const nueva = window.SECUENCIAS[vertical ? "secuencia-movil" : "secuencia"];
    if (!nueva || nueva === secuencia) return;
    secuencia = nueva;
    const anchoNecesario = window.innerWidth * Math.min(window.devicePixelRatio || 1, 2);
    const variantes = [...secuencia.variantes].sort((a, b) => a.ancho - b.ancho);
    const variante = variantes.find((v) => v.ancho >= anchoNecesario) || variantes[variantes.length - 1];
    const base = `${raiz}/${vertical ? "movil" : "escritorio"}/${variante.carpeta}/`;
    const ruta = (i) => base + secuencia.patron.replace("{n}", String(i + 1).padStart(secuencia.cifras, "0"));

    imagenes = new Array(secuencia.frames);
    // Primero los fotogramas de las paradas (donde se detiene la vista), luego el resto en orden
    const orden = [...new Set([...pasos.map((_, i) => fotogramaDe(i)), ...imagenes.keys()])];
    orden.forEach((i) => {
      const img = new Image();
      img.decoding = "async";
      img.onload = () => { if (Math.round(posicion) === i) dibujar(true); };
      img.src = ruta(i);
      imagenes[i] = img;
    });
  };

  const ajustarLienzo = () => {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    lienzo.width = Math.round(lienzo.clientWidth * ratio);
    lienzo.height = Math.round(lienzo.clientHeight * ratio);
  };

  // Pinta el fotograma como object-fit: cover; si aún no cargó, usa el más cercano ya disponible
  let pintado = -1;
  const lista = (img) => img && img.complete && img.naturalWidth;
  const dibujar = (forzar = false) => {
    const i = Math.round(posicion);
    if (i === pintado && !forzar) return;
    let img = imagenes[i];
    for (let d = 1; !lista(img) && d < imagenes.length; d++) img = lista(imagenes[i - d]) ? imagenes[i - d] : imagenes[i + d];
    if (!lista(img)) return;
    const { width: w, height: h } = lienzo;
    const escala = Math.max(w / img.naturalWidth, h / img.naturalHeight);
    const dw = img.naturalWidth * escala, dh = img.naturalHeight * escala;
    ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
    pintado = i;
  };

  /* ---------- Curva del viaje de cámara ----------
     La misma --ease-in-out del CSS: cubic-bezier(0.77, 0, 0.175, 1) */
  const bezier = (x1, y1, x2, y2) => {
    const coord = (t, a, b) => 3 * a * t * (1 - t) ** 2 + 3 * b * t * t * (1 - t) + t ** 3;
    const deriv = (t, a, b) => 3 * a * (1 - t) ** 2 + 6 * (b - a) * t * (1 - t) + 3 * (1 - b) * t * t;
    return (x) => {
      if (x <= 0 || x >= 1) return Math.min(1, Math.max(0, x));
      let t = x;
      for (let k = 0; k < 8; k++) {
        const d = deriv(t, x1, x2);
        if (Math.abs(d) < 1e-6) break;
        t -= (coord(t, x1, x2) - x) / d;
      }
      // Respaldo por bisección si Newton se sale del intervalo
      if (t < 0 || t > 1) {
        let lo = 0, hi = 1; t = x;
        for (let k = 0; k < 20; k++) { coord(t, x1, x2) < x ? (lo = t) : (hi = t); t = (lo + hi) / 2; }
      }
      return coord(t, y1, y2);
    };
  };
  const curva = bezier(0.77, 0, 0.175, 1);

  /* ---------- Paradas ---------- */
  let indice = 0, posicion = 0, animando = false, temporizador;

  const marcar = (n) => {
    botones.forEach((b, i) => {
      if (i === n) b.setAttribute("aria-current", "step");
      else b.removeAttribute("aria-current");
    });
    if (relleno) relleno.style.transform = `scaleY(${(n / ultimo).toFixed(4)})`;
    if (contador) contador.textContent = String(n + 1).padStart(2, "0");
    hero.classList.toggle("dentro", n > 0);
    hero.classList.toggle("al-final", n === ultimo);
  };

  const mostrar = (n) => pasos.forEach((p, i) => p.classList.toggle("activo", i === n));

  const irA = (n) => {
    n = Math.max(0, Math.min(ultimo, n));
    if (n === indice || animando) return;
    const desde = posicion, hasta = fotogramaDe(n);
    const distancia = Math.abs(hasta - desde);
    // La cámara recorre todos los fotogramas intermedios; tramos largos tardan algo más
    const duracion = reducir ? 0 : Math.min(3400, Math.max(1300, 700 + distancia * 28));

    pasos[indice].classList.remove("activo");
    indice = n;
    marcar(n);

    if (!duracion) {
      posicion = hasta;
      dibujar(true);
      mostrar(n);
      return;
    }

    animando = true;
    hero.classList.add("viajando");
    // Los datos nuevos entran cuando la cámara ya está frenando
    clearTimeout(temporizador);
    temporizador = setTimeout(() => mostrar(indice), duracion * 0.72);

    const inicio = performance.now();
    const cuadro = (ahora) => {
      const t = Math.min(1, (ahora - inicio) / duracion);
      posicion = desde + (hasta - desde) * curva(t);
      dibujar();
      if (t < 1) requestAnimationFrame(cuadro);
      else {
        animando = false;
        hero.classList.remove("viajando");
      }
    };
    requestAnimationFrame(cuadro);
  };

  /* ---------- Gestos ---------- */
  // El recorrido manda solo cuando la página está arriba del todo
  const enRecorrido = () => window.scrollY <= 2 && !document.getElementById("menu")?.classList.contains("abierto");

  // ¿Este gesto lo maneja el navegador (scroll normal) o el recorrido?
  const esNativo = (dir) =>
    !enRecorrido() ||
    (!animando && dir > 0 && indice === ultimo) ||
    (!animando && dir < 0 && indice === 0);

  // Rueda y trackpad: un gesto es una ráfaga de eventos sin pausas de más de 220 ms
  // (incluida la inercia del trackpad). Cada gesto avanza como mucho una parada.
  let ultimoEvento = 0, acumulado = 0, gesto = null;
  window.addEventListener("wheel", (e) => {
    const ahora = performance.now();
    if (ahora - ultimoEvento > 220) gesto = null;
    ultimoEvento = ahora;
    const delta = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
    if (!delta || e.ctrlKey) return; // ctrl + rueda es zoom

    if (!gesto) {
      const dir = Math.sign(delta);
      gesto = { nativo: esNativo(dir), usado: animando };
      acumulado = 0;
    }
    if (gesto.nativo) return;
    e.preventDefault();
    acumulado += delta;
    if (!gesto.usado && !animando && Math.abs(acumulado) >= 24) {
      gesto.usado = true;
      irA(indice + Math.sign(acumulado));
    }
  }, { passive: false });

  // Dedo: se decide la dirección en el primer desplazamiento claro
  let toque = null;
  hero.addEventListener("touchstart", (e) => {
    if (e.touches.length !== 1) { toque = null; return; }
    toque = { y: e.touches[0].clientY, modo: null };
  }, { passive: true });
  hero.addEventListener("touchmove", (e) => {
    if (!toque) return;
    const dy = toque.y - e.touches[0].clientY; // > 0: el dedo sube, la página bajaría
    if (!toque.modo && Math.abs(dy) > 8) toque.modo = esNativo(Math.sign(dy)) ? "nativo" : "pasos";
    if (toque.modo === "pasos") e.preventDefault();
  }, { passive: false });
  hero.addEventListener("touchend", (e) => {
    if (!toque || toque.modo !== "pasos") { toque = null; return; }
    const dy = toque.y - e.changedTouches[0].clientY;
    if (Math.abs(dy) > 40) irA(indice + Math.sign(dy));
    toque = null;
  });

  // Teclado
  window.addEventListener("keydown", (e) => {
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.target.closest("input, textarea, select, [contenteditable]")) return;
    const abajo = ["ArrowDown", "PageDown", " "].includes(e.key) && !e.shiftKey;
    const arriba = ["ArrowUp", "PageUp"].includes(e.key) || (e.key === " " && e.shiftKey);
    if (!abajo && !arriba) return;
    const dir = abajo ? 1 : -1;
    if (esNativo(dir)) return;
    e.preventDefault();
    irA(indice + dir);
  });

  // Puntos del riel: saltar a una parada concreta
  botones.forEach((b, i) => b.addEventListener("click", () => {
    if (!enRecorrido()) window.scrollTo({ top: 0, behavior: "instant" });
    irA(i);
  }));

  /* ---------- Arranque ---------- */
  // Si la página se abre ya desplazada (recarga, enlace a #galeria), el recorrido queda al final
  if (window.scrollY > 2 || location.hash.length > 1) indice = ultimo;
  posicion = fotogramaDe(indice);
  marcar(indice);
  cargarSecuencia();
  ajustarLienzo();
  dibujar(true);
  // Un fotograma de espera para que el titular parta de su estado oculto
  requestAnimationFrame(() => requestAnimationFrame(() => {
    mostrar(indice);
    hero.classList.add("listo");
  }));

  window.addEventListener("resize", () => {
    cargarSecuencia();
    ajustarLienzo();
    dibujar(true);
  });
})();
