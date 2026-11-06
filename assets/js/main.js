/* =========================================================
   Claudia · Diseño de interiores — comportamiento base
   1. Cabecera con fondo al hacer scroll
   2. Menú móvil
   3. Recorrido 3D: secuencia de fotogramas ligada al scroll
   4. Revelados al entrar en pantalla
   5. Paralaje de respaldo (si no hay animation-timeline)
   6. Formulario (de momento solo de ejemplo)
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

  /* ---------- 4. Revelados al entrar en pantalla ---------- */
  // Se disparan una sola vez. Los que entran juntos se escalonan 60 ms.
  const porRevelar = document.querySelectorAll(".revelar, .aparecer");
  if ("IntersectionObserver" in window) {
    // Las fotos empiezan recortadas al 100 % con clip-path, y Chrome descuenta
    // ese recorte de la intersección: se observa su contenedor, que no lo está.
    const objetivo = new Map();
    porRevelar.forEach((el) => {
      objetivo.set(el.classList.contains("revelar") ? el.parentElement : el, el);
    });
    const observador = new IntersectionObserver((entradas) => {
      entradas
        .filter((e) => e.isIntersecting)
        .map((e) => e.target)
        .sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1))
        .forEach((vigilado, i) => {
          const el = objetivo.get(vigilado);
          el.style.setProperty("--retraso", `${Math.min(i, 4) * 60}ms`);
          el.classList.add("visible");
          observador.unobserve(vigilado);
        });
    }, { rootMargin: "0px 0px -12% 0px", threshold: 0.12 });
    objetivo.forEach((_, vigilado) => observador.observe(vigilado));
  } else {
    porRevelar.forEach((el) => el.classList.add("visible"));
  }

  /* ---------- 5. Paralaje de respaldo ---------- */
  // Si el navegador soporta animation-timeline, el CSS hace todo fuera del hilo
  // principal. Si no, un único rAF escribe transform solo en lo que está visible.
  const paralajeCSS = window.CSS && CSS.supports("animation-timeline: view()");
  if (!paralajeCSS && !reducirMovimiento && "IntersectionObserver" in window) {
    const capas = [
      ...[...document.querySelectorAll(".paralaje")].map((el) => ({
        el,
        marco: el.closest(".foto, .capitulo__fondo, .contacto__fondo"),
        viaje: el.classList.contains("paralaje--fuerte") ? 14 : 9.5,
        unidad: "%",
        propiedad: "transform",
      })),
      ...[...document.querySelectorAll(".flota-lenta, .flota-media, .flota-rapida")].map((el) => ({
        el,
        marco: el,
        viaje: el.classList.contains("flota-rapida") ? 96 : el.classList.contains("flota-media") ? 56 : 24,
        unidad: "px",
        propiedad: "translate",
        invertir: true,
      })),
    ];

    const visibles = new Set();
    const vigia = new IntersectionObserver((entradas) => {
      entradas.forEach((e) => {
        capas.filter((c) => c.marco === e.target).forEach((c) => {
          e.isIntersecting ? visibles.add(c) : visibles.delete(c);
        });
      });
      pedirParalaje();
    }, { rootMargin: "10% 0px" });
    new Set(capas.map((c) => c.marco)).forEach((m) => vigia.observe(m));

    let pendienteParalaje = false;
    const moverCapas = () => {
      pendienteParalaje = false;
      const alto = window.innerHeight;
      visibles.forEach((c) => {
        const r = c.marco.getBoundingClientRect();
        // 0 cuando el marco asoma por abajo, 1 cuando sale por arriba
        const p = Math.min(1, Math.max(0, (alto - r.top) / (alto + r.height)));
        let v = (p * 2 - 1) * c.viaje;
        if (c.invertir) v = -v;
        if (c.propiedad === "translate") c.el.style.translate = `0 ${v.toFixed(2)}${c.unidad}`;
        else c.el.style.transform = `translate3d(0, ${v.toFixed(2)}${c.unidad}, 0)`;
      });
    };
    const pedirParalaje = () => {
      if (!pendienteParalaje) { pendienteParalaje = true; requestAnimationFrame(moverCapas); }
    };
    window.addEventListener("scroll", pedirParalaje, { passive: true });
    window.addEventListener("resize", pedirParalaje);
  }

  /* ---------- 6. Formulario ---------- */
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
