/* =========================================================
   Claudia · Diseño de interiores — comportamiento base
   1. Cabecera con fondo al hacer scroll
   2. Menú móvil
   3. Recorrido 3D: secuencia de fotogramas ligada al scroll
   4. Formulario (de momento solo de ejemplo)
   ========================================================= */

(() => {
  const reducirMovimiento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- 1. Cabecera ---------- */
  const cabecera = document.getElementById("cabecera");
  const actualizarCabecera = () => cabecera.classList.toggle("con-fondo", window.scrollY > 40);
  window.addEventListener("scroll", actualizarCabecera, { passive: true });
  actualizarCabecera();

  /* ---------- 2. Menú móvil ---------- */
  const menuBoton = document.querySelector(".menu-boton");
  const menu = document.getElementById("menu");
  const alternarMenu = (abrir) => {
    menu.classList.toggle("abierto", abrir);
    menuBoton.setAttribute("aria-expanded", String(abrir));
    menuBoton.setAttribute("aria-label", abrir ? "Cerrar menú" : "Abrir menú");
    document.body.style.overflow = abrir ? "hidden" : "";
  };
  menuBoton.addEventListener("click", () => alternarMenu(!menu.classList.contains("abierto")));
  menu.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => alternarMenu(false)));

  /* ---------- 3. Recorrido con scroll ---------- */
  const hero = document.querySelector(".hero");
  const lienzo = document.getElementById("lienzo");
  const textos = [...document.querySelectorAll(".hero__texto")];

  if (!reducirMovimiento && lienzo && window.SECUENCIAS) {
    const ctx = lienzo.getContext("2d");
    const esVertical = () => window.innerWidth / window.innerHeight < 0.75;

    let secuencia, base, imagenes = [], actual = -1, pendiente = false;

    const cargarSecuencia = () => {
      const vertical = esVertical();
      const clave = vertical ? "secuencia-movil" : "secuencia";
      const nueva = window.SECUENCIAS[clave];
      if (nueva === secuencia) return;
      secuencia = nueva;

      // Variante según el ancho real de pantalla
      const anchoNecesario = window.innerWidth * Math.min(window.devicePixelRatio || 1, 2);
      const variantes = [...secuencia.variantes].sort((a, b) => a.ancho - b.ancho);
      const variante = variantes.find((v) => v.ancho >= anchoNecesario) || variantes[variantes.length - 1];
      base = `/assets/secuencia/${vertical ? "movil" : "escritorio"}/${variante.carpeta}/`;

      imagenes = Array.from({ length: secuencia.frames }, (_, i) => {
        const img = new Image();
        img.decoding = "async";
        img.src = base + secuencia.patron.replace("{n}", String(i + 1).padStart(secuencia.cifras, "0"));
        img.onload = () => { if (i === actual || actual === -1) dibujar(true); };
        return img;
      });
      actual = -1;
    };

    const ajustarLienzo = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      lienzo.width = Math.round(lienzo.clientWidth * ratio);
      lienzo.height = Math.round(lienzo.clientHeight * ratio);
    };

    const progreso = () => {
      const recorrido = hero.offsetHeight - window.innerHeight;
      const p = (window.scrollY - hero.offsetTop) / recorrido;
      return Math.min(1, Math.max(0, p));
    };

    // Dibuja la imagen cubriendo el lienzo (como object-fit: cover)
    const pintar = (img) => {
      const { width: w, height: h } = lienzo;
      const escala = Math.max(w / img.naturalWidth, h / img.naturalHeight);
      const dw = img.naturalWidth * escala, dh = img.naturalHeight * escala;
      ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
    };

    const dibujar = (forzar = false) => {
      pendiente = false;
      const p = progreso();
      const indice = Math.round(p * (secuencia.frames - 1));

      if (indice !== actual || forzar) {
        // Si el fotograma aún no ha cargado, usa el más cercano ya disponible
        let img = imagenes[indice];
        for (let d = 1; !(img && img.complete && img.naturalWidth) && d < secuencia.frames; d++) {
          img = imagenes[indice - d] || imagenes[indice + d];
        }
        if (img && img.complete && img.naturalWidth) {
          pintar(img);
          actual = indice;
        }
      }

      textos.forEach((t) => {
        const desde = parseFloat(t.dataset.desde), hasta = parseFloat(t.dataset.hasta);
        t.classList.toggle("visible", p >= desde && p < hasta);
      });
    };

    const pedirDibujo = () => {
      if (!pendiente) { pendiente = true; requestAnimationFrame(() => dibujar()); }
    };

    cargarSecuencia();
    ajustarLienzo();
    dibujar(true);

    window.addEventListener("scroll", pedirDibujo, { passive: true });
    window.addEventListener("resize", () => {
      cargarSecuencia();
      ajustarLienzo();
      dibujar(true);
    });
  } else {
    textos[0]?.classList.add("visible");
  }

  /* ---------- 4. Formulario ---------- */
  // Base sin envío real: se conectará a un servicio (Formspree, Resend, etc.) más adelante.
  const formulario = document.getElementById("formulario");
  formulario?.addEventListener("submit", (e) => {
    e.preventDefault();
    formulario.querySelector(".formulario__aviso").textContent =
      "¡Gracias! Este formulario aún es de ejemplo; pronto estará conectado.";
    formulario.reset();
  });

  /* ---------- Año del pie ---------- */
  const anio = document.getElementById("anio");
  if (anio) anio.textContent = new Date().getFullYear();
})();
