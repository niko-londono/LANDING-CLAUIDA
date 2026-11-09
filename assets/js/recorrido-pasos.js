/* =========================================================
   Recorrido con datos (páginas de proyecto con .hero--pasos)
   Scroll libre y continuo: la posición en la sección elige el fotograma,
   la cámara nunca se detiene y cada tarjeta de datos aparece mientras
   la cámara pasa por su zona (data-fotograma = donde empieza la zona).

   Fluidez:
   - Los fotogramas se descargan como Blob (comprimidos, poca memoria) y se
     descomprimen con createImageBitmap, fuera del hilo principal, solo los
     cercanos a la vista. Pintar un bitmap ya descomprimido no frena el scroll.
   - La vista sigue al scroll con inercia y funde fotogramas vecinos.
   - Descarga de grueso a fino y, después, primero lo más cercano a la vista.
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
  const reducir = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const conBitmap = "createImageBitmap" in window;

  // Bitmaps descomprimidos alrededor de la vista (en el sentido del movimiento hay más)
  const DELANTE = 14, DETRAS = 6, LIBERAR = 26;
  const SUAVIZADO_MS = 150;

  let secuencia, n = 0, rutas = [], blobs = [], imgs = [];
  const bitmaps = new Map(); // índice → ImageBitmap, o null mientras se descomprime
  let generacion = 0;        // invalida descargas y bitmaps de una secuencia anterior
  let zonas = [];            // tarjetas: { f, desde, hasta } en fotogramas (base 0)

  let objetivo = 0, mostrado = -1, direccion = 1;
  let animando = false, ultimoT = 0, pintadoClave = "";

  /* ---------- Zonas de las tarjetas ---------- */
  const construirZonas = () => {
    const fs = pasos.map((p) => Math.min(n - 1, parseInt(p.dataset.fotograma, 10) - 1));
    const desde = fs.map((f, i) => (i === fs.length - 1 ? f - 22 : f - 3)); // la última entra antes: es el final
    zonas = fs.map((f, i) => ({
      f,
      desde: desde[i],
      hasta: i === fs.length - 1 ? Infinity : Math.min(desde[i + 1] - 3, f + 40),
    }));
  };

  /* ---------- Descarga ---------- */
  const cargarSecuencia = () => {
    const vertical = window.innerWidth / window.innerHeight < 0.75;
    const nueva = window.SECUENCIAS[vertical ? "secuencia-movil" : "secuencia"];
    if (!nueva || nueva === secuencia) return;
    secuencia = nueva;
    n = secuencia.frames;
    construirZonas();

    const anchoNecesario = window.innerWidth * Math.min(window.devicePixelRatio || 1, 2);
    const variantes = [...secuencia.variantes].sort((a, b) => a.ancho - b.ancho);
    const variante = variantes.find((v) => v.ancho >= anchoNecesario) || variantes[variantes.length - 1];
    const base = `${raiz}/${vertical ? "movil" : "escritorio"}/${variante.carpeta}/`;
    rutas = Array.from({ length: n }, (_, i) => base + secuencia.patron.replace("{n}", String(i + 1).padStart(secuencia.cifras, "0")));

    const gen = ++generacion;
    bitmaps.forEach((bm) => bm && bm.close());
    bitmaps.clear();
    blobs = new Array(n);
    imgs = new Array(n);
    pintadoClave = "";

    // Primera pasada: inicio de cada zona y 1 de cada 8 (todo el recorrido usable enseguida).
    // Después, el resto, siempre el más cercano a la vista (un poco por delante).
    const cola = [...new Set([...zonas.map((z) => z.f), ...Array.from({ length: Math.ceil(n / 8) }, (_, k) => k * 8)])];
    const resto = new Set(Array.from({ length: n }, (_, i) => i).filter((i) => !cola.includes(i)));
    const siguiente = () => {
      if (cola.length) return cola.shift();
      if (!resto.size) return -1;
      const c = Math.max(0, Math.round(mostrado));
      let mejor = -1, mejorD = Infinity;
      resto.forEach((i) => {
        const d = (i - c) * direccion >= 0 ? Math.abs(i - c) : Math.abs(i - c) * 1.5;
        if (d < mejorD) { mejorD = d; mejor = i; }
      });
      resto.delete(mejor);
      return mejor;
    };

    const trabajador = async () => {
      for (let i = siguiente(); i >= 0; i = siguiente()) {
        if (gen !== generacion) return;
        try {
          const r = await fetch(rutas[i]);
          if (!r.ok) continue;
          const blob = await r.blob();
          if (gen !== generacion) return;
          blobs[i] = blob;
          if (!conBitmap) {
            const img = new Image();
            img.onload = () => { if (Math.abs(i - mostrado) < 12) pedirCuadro(true); };
            img.src = URL.createObjectURL(blob);
            imgs[i] = img;
          } else if (Math.abs(i - mostrado) <= DELANTE) {
            prepararVentana();
          }
        } catch (e) { /* un fotograma que falla se sustituye por el vecino */ }
      }
    };
    for (let k = 0; k < 6; k++) trabajador();
  };

  /* ---------- Bitmaps cerca de la vista ---------- */
  const prepararVentana = () => {
    if (!conBitmap || mostrado < 0) return;
    const c = Math.round(mostrado);
    const a = Math.max(0, c - (direccion > 0 ? DETRAS : DELANTE));
    const b = Math.min(n - 1, c + (direccion > 0 ? DELANTE : DETRAS));
    // Primero los más cercanos
    const indices = [];
    for (let i = a; i <= b; i++) indices.push(i);
    indices.sort((x, y) => Math.abs(x - c) - Math.abs(y - c));
    indices.forEach((i) => {
      if (!blobs[i] || bitmaps.has(i)) return;
      bitmaps.set(i, null);
      const gen = generacion;
      createImageBitmap(blobs[i]).then((bm) => {
        if (gen !== generacion || !bitmaps.has(i) || bitmaps.get(i)) { bm.close(); return; }
        bitmaps.set(i, bm);
        if (Math.abs(i - mostrado) < 2) pedirCuadro(true);
      }).catch(() => bitmaps.delete(i));
    });
    bitmaps.forEach((bm, i) => {
      if (Math.abs(i - c) > LIBERAR) { if (bm) bm.close(); bitmaps.delete(i); }
    });
  };

  /* ---------- Pintar ---------- */
  const dibujable = (i) => {
    if (i < 0 || i >= n) return null;
    if (conBitmap) return bitmaps.get(i) || null;
    const img = imgs[i];
    return img && img.complete && img.naturalWidth ? img : null;
  };
  // El fotograma listo más cercano a i (sin esperar ni descomprimir en el hilo principal)
  const cercana = (i) => {
    for (let d = 0; d < 48; d++) {
      if (dibujable(i - d)) return i - d;
      if (dibujable(i + d)) return i + d;
    }
    return -1;
  };

  const ajustarLienzo = () => {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    lienzo.width = Math.round(lienzo.clientWidth * ratio);
    lienzo.height = Math.round(lienzo.clientHeight * ratio);
    pintadoClave = "";
  };

  const pintar = (fuente, alfa) => {
    const { width: w, height: h } = lienzo;
    const fw = fuente.width || fuente.naturalWidth, fh = fuente.height || fuente.naturalHeight;
    const escala = Math.max(w / fw, h / fh);
    const dw = fw * escala, dh = fh * escala;
    ctx.globalAlpha = alfa;
    ctx.drawImage(fuente, (w - dw) / 2, (h - dh) / 2, dw, dh);
  };

  const dibujar = () => {
    const base = Math.floor(mostrado);
    const a = cercana(base);
    if (a < 0) return; // aún nada listo: se ve el póster de fondo
    // Fundido corto con el siguiente, solo en el tramo central (smoothstep 0,3-0,7)
    const t = reducir ? 0 : Math.min(1, Math.max(0, (mostrado - base - 0.3) / 0.4));
    const alfa = t * t * (3 - 2 * t);
    const b = alfa > 0.02 && a === base && dibujable(base + 1) ? base + 1 : -1;
    const clave = `${a}|${b}|${b < 0 ? 0 : alfa.toFixed(2)}`;
    if (clave === pintadoClave) return;
    pintar(dibujable(a), 1);
    if (b >= 0) pintar(dibujable(b), alfa);
    ctx.globalAlpha = 1;
    pintadoClave = clave;
  };

  /* ---------- Tarjetas, riel y contador ---------- */
  let activoPrevio = -2, alcanzadaPrevia = -1;
  const actualizarUI = (f, p) => {
    let activo = -1, alcanzada = 0;
    zonas.forEach((z, i) => {
      if (f >= z.desde && f <= z.hasta) activo = i;
      if (f >= z.desde) alcanzada = i;
    });
    if (activo !== activoPrevio) {
      pasos.forEach((el, i) => el.classList.toggle("activo", i === activo));
      activoPrevio = activo;
    }
    if (alcanzada !== alcanzadaPrevia) {
      botones.forEach((b, i) => (i === alcanzada ? b.setAttribute("aria-current", "step") : b.removeAttribute("aria-current")));
      if (contador) contador.textContent = String(alcanzada + 1).padStart(2, "0");
      hero.classList.toggle("al-final", alcanzada === zonas.length - 1);
      alcanzadaPrevia = alcanzada;
    }
    if (relleno) relleno.style.transform = `scaleY(${p.toFixed(4)})`;
    hero.classList.toggle("dentro", f > 12);
  };

  /* ---------- Bucle ---------- */
  const progreso = () => {
    const recorrido = hero.offsetHeight - window.innerHeight;
    return Math.min(1, Math.max(0, (window.scrollY - hero.offsetTop) / recorrido));
  };

  // La vista persigue al scroll; el suavizado no depende de los Hz de la pantalla
  const cuadro = (t) => {
    const dt = Math.min(64, t - (ultimoT || t - 16));
    ultimoT = t;
    const diferencia = objetivo - mostrado;
    if (diferencia) direccion = Math.sign(diferencia);
    if (reducir || Math.abs(diferencia) < 0.01) mostrado = objetivo;
    else mostrado += diferencia * (1 - Math.exp(-dt / SUAVIZADO_MS));
    prepararVentana();
    dibujar();
    if (mostrado !== objetivo) requestAnimationFrame(cuadro);
    else { animando = false; ultimoT = 0; }
  };

  const pedirCuadro = (forzar = false) => {
    if (forzar) pintadoClave = "";
    if (!animando) { animando = true; requestAnimationFrame(cuadro); }
  };

  const alHacerScroll = () => {
    const p = progreso();
    objetivo = p * (n - 1);
    if (mostrado < 0) mostrado = objetivo;
    actualizarUI(objetivo, p);
    pedirCuadro();
  };

  // Puntos del riel: llevan al inicio de la zona de cada tarjeta
  botones.forEach((b, i) => b.addEventListener("click", () => {
    const z = zonas[i];
    const recorrido = hero.offsetHeight - window.innerHeight;
    const f = Math.min(n - 1, Math.max(0, i === zonas.length - 1 ? n - 1 : z.f + 4));
    window.scrollTo({ top: hero.offsetTop + (f / (n - 1)) * recorrido, behavior: reducir ? "auto" : "smooth" });
  }));

  /* ---------- Arranque ---------- */
  cargarSecuencia();
  ajustarLienzo();
  alHacerScroll();
  // Un fotograma de espera para que el titular parta de su estado oculto
  requestAnimationFrame(() => requestAnimationFrame(() => {
    hero.classList.add("listo");
    activoPrevio = -2;
    alHacerScroll();
  }));

  window.addEventListener("scroll", alHacerScroll, { passive: true });
  window.addEventListener("resize", () => {
    cargarSecuencia();
    ajustarLienzo();
    alHacerScroll();
    pedirCuadro(true);
  });
})();
