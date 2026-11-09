/* =========================================================
   Recorrido con datos (páginas de proyecto con .hero--pasos)
   El scroll es libre: la posición en la sección elige el fotograma.
   - En cada parada (data-fotograma) la cámara se queda quieta un tramo
     de scroll mientras su tarjeta de datos está en pantalla.
   - Entre paradas, la cámara viaja por todos los fotogramas intermedios.
   - Para que se vea fluido: la vista sigue al scroll con inercia y funde
     cada fotograma con el siguiente.
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

  /* ---------- Línea de tiempo ----------
     Se mide en "unidades": un fotograma de viaje = 1 unidad; cada parada
     añade PAUSA unidades en las que la cámara no se mueve. */
  const PAUSA = 26;
  let paradas = [], total = 1;
  const construirTiempo = (frames) => {
    let u = 0, anterior = 0;
    paradas = pasos.map((p) => {
      const f = Math.min(frames - 1, parseInt(p.dataset.fotograma, 10) - 1);
      u += f - anterior;            // viaje desde la parada anterior
      anterior = f;
      const parada = { f, desde: u, hasta: u + PAUSA };
      u += PAUSA;
      return parada;
    });
    total = u;
  };
  // Unidades → fotograma (con decimales)
  const fotogramaEn = (u) => {
    let f = 0;
    for (const p of paradas) {
      if (u < p.desde) return f + (u - (p.desde - (p.f - f)));
      if (u <= p.hasta) return p.f;
      f = p.f;
    }
    return f;
  };

  /* ---------- Fotogramas ---------- */
  let secuencia, imagenes = [];
  const esVertical = () => window.innerWidth / window.innerHeight < 0.75;

  const cargarSecuencia = () => {
    const vertical = esVertical();
    const nueva = window.SECUENCIAS[vertical ? "secuencia-movil" : "secuencia"];
    if (!nueva || nueva === secuencia) return;
    secuencia = nueva;
    construirTiempo(secuencia.frames);
    const anchoNecesario = window.innerWidth * Math.min(window.devicePixelRatio || 1, 2);
    const variantes = [...secuencia.variantes].sort((a, b) => a.ancho - b.ancho);
    const variante = variantes.find((v) => v.ancho >= anchoNecesario) || variantes[variantes.length - 1];
    const base = `${raiz}/${vertical ? "movil" : "escritorio"}/${variante.carpeta}/`;
    const ruta = (i) => base + secuencia.patron.replace("{n}", String(i + 1).padStart(secuencia.cifras, "0"));

    // De grueso a fino: paradas, luego 1 de cada 8, 1 de cada 4, 1 de cada 2 y el resto.
    // Así el recorrido entero se puede usar enseguida y va ganando fluidez mientras carga.
    const n = secuencia.frames;
    const orden = new Set(paradas.map((p) => p.f));
    [8, 4, 2, 1].forEach((paso) => { for (let i = 0; i < n; i += paso) orden.add(i); });
    imagenes = new Array(n);
    orden.forEach((i) => {
      const img = new Image();
      img.decoding = "async";
      img.onload = () => { if (Math.abs(i - mostrado) < 9) pedirDibujo(true); };
      img.src = ruta(i);
      imagenes[i] = img;
    });
  };

  const ajustarLienzo = () => {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    lienzo.width = Math.round(lienzo.clientWidth * ratio);
    lienzo.height = Math.round(lienzo.clientHeight * ratio);
  };

  const lista = (img) => img && img.complete && img.naturalWidth;
  // El fotograma cargado más cercano a i, mirando primero hacia atrás
  const cercana = (i) => {
    for (let d = 0; d < imagenes.length; d++) {
      if (lista(imagenes[i - d])) return i - d;
      if (lista(imagenes[i + d])) return i + d;
    }
    return -1;
  };
  const pintar = (img, alfa) => {
    const { width: w, height: h } = lienzo;
    const escala = Math.max(w / img.naturalWidth, h / img.naturalHeight);
    const dw = img.naturalWidth * escala, dh = img.naturalHeight * escala;
    ctx.globalAlpha = alfa;
    ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
  };

  /* ---------- Bucle de dibujo ---------- */
  let objetivo = 0, mostrado = -1, pintadoClave = "", animando = false, ultimoT = 0;

  const progreso = () => {
    const recorrido = hero.offsetHeight - window.innerHeight;
    return Math.min(1, Math.max(0, (window.scrollY - hero.offsetTop) / recorrido));
  };

  const dibujar = (forzar) => {
    const base = Math.floor(mostrado);
    const fraccion = reducir ? 0 : mostrado - base;
    const a = cercana(base);
    if (a < 0) return;
    // Fundido corto con el siguiente: solo en el tramo central entre los dos
    // (smoothstep de 0,3 a 0,7), para suavizar el salto sin dejar una imagen doble
    const t = Math.min(1, Math.max(0, (fraccion - 0.3) / 0.4));
    const alfa = t * t * (3 - 2 * t);
    // Solo se funde si los dos son vecinos de verdad (ya cargados)
    const b = alfa > 0.02 && a === base && lista(imagenes[base + 1]) ? base + 1 : -1;
    const clave = `${a}|${b}|${b < 0 ? 0 : alfa.toFixed(2)}|${lienzo.width}`;
    if (clave === pintadoClave && !forzar) return;
    pintar(imagenes[a], 1);
    if (b >= 0) pintar(imagenes[b], alfa);
    ctx.globalAlpha = 1;
    pintadoClave = clave;
  };

  const actualizarUI = (u) => {
    // Tarjeta activa: la de la parada en la que está la cámara (con un margen antes y después)
    let activo = -1;
    paradas.forEach((p, i) => { if (u >= p.desde - 6 && u <= p.hasta + 10) activo = i; });
    pasos.forEach((p, i) => p.classList.toggle("activo", i === activo));
    // Riel: la última parada alcanzada
    let alcanzada = 0;
    paradas.forEach((p, i) => { if (u >= p.desde - 6) alcanzada = i; });
    botones.forEach((b, i) => (i === alcanzada ? b.setAttribute("aria-current", "step") : b.removeAttribute("aria-current")));
    if (relleno) relleno.style.transform = `scaleY(${(u / total).toFixed(4)})`;
    if (contador) contador.textContent = String(alcanzada + 1).padStart(2, "0");
    hero.classList.toggle("dentro", u > PAUSA);
    hero.classList.toggle("al-final", alcanzada === paradas.length - 1);
  };

  // La vista persigue al scroll con un suavizado que no depende de los Hz de la pantalla
  const cuadro = (t) => {
    const dt = Math.min(64, t - (ultimoT || t));
    ultimoT = t;
    const diferencia = objetivo - mostrado;
    if (reducir || Math.abs(diferencia) < 0.01) mostrado = objetivo;
    else mostrado += diferencia * (1 - Math.exp(-dt / 110));
    dibujar(false);
    if (mostrado !== objetivo) requestAnimationFrame(cuadro);
    else { animando = false; ultimoT = 0; }
  };

  const pedirDibujo = (forzar = false) => {
    const u = progreso() * total;
    objetivo = fotogramaEn(u);
    if (mostrado < 0) mostrado = objetivo;
    actualizarUI(u);
    if (forzar) dibujar(true);
    if (!animando) { animando = true; requestAnimationFrame(cuadro); }
  };

  // Puntos del riel: llevan a la pausa de esa parada
  botones.forEach((b, i) => b.addEventListener("click", () => {
    const p = paradas[i];
    const recorrido = hero.offsetHeight - window.innerHeight;
    const u = (p.desde + p.hasta) / 2;
    window.scrollTo({ top: hero.offsetTop + (u / total) * recorrido, behavior: reducir ? "auto" : "smooth" });
  }));

  /* ---------- Arranque ---------- */
  cargarSecuencia();
  ajustarLienzo();
  pedirDibujo(true);
  // Un fotograma de espera para que el titular parta de su estado oculto
  requestAnimationFrame(() => requestAnimationFrame(() => {
    hero.classList.add("listo");
    pedirDibujo(true);
  }));

  window.addEventListener("scroll", () => pedirDibujo(), { passive: true });
  window.addEventListener("resize", () => {
    cargarSecuencia();
    ajustarLienzo();
    pedirDibujo(true);
  });
})();
