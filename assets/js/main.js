/* =========================================================
   Claudia · Diseño de interiores — comportamiento base
   1. Cabecera: fondo al bajar, se oculta al seguir bajando
   2. Menú móvil
   3. Recorrido 3D (páginas de proyecto): secuencia y riel ligados al scroll
   3b. Portada de la landing: entrada del titular
   4. Revelados al entrar en pantalla
   5. Paralaje de respaldo (si no hay animation-timeline)
   6. Sección actual en el menú
   7. Formulario (de momento solo de ejemplo)
   ========================================================= */

(() => {
  const reducirMovimiento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- 1. Cabecera ---------- */
  // Fondo translúcido al bajar; se oculta al seguir bajando y vuelve al subir.
  const cabecera = document.getElementById("cabecera");
  let ultimoY = window.scrollY;
  const actualizarCabecera = () => {
    const y = window.scrollY;
    const delta = y - ultimoY;
    cabecera.classList.toggle("con-fondo", y > 40);
    const menuAbierto = document.getElementById("menu")?.classList.contains("abierto");
    if (y < 80 || menuAbierto || cabecera.contains(document.activeElement)) {
      cabecera.classList.remove("oculta");
    } else if (delta > 6 && y > window.innerHeight * 0.5) {
      cabecera.classList.add("oculta");
    } else if (delta < -6) {
      cabecera.classList.remove("oculta");
    }
    if (Math.abs(delta) > 6) ultimoY = y;
  };
  window.addEventListener("scroll", actualizarCabecera, { passive: true });
  cabecera.addEventListener("focusin", () => cabecera.classList.remove("oculta"));
  actualizarCabecera();

  /* ---------- 2. Menú móvil ---------- */
  const menuBoton = document.querySelector(".menu-boton");
  const menu = document.getElementById("menu");
  const alternarMenu = (abrir) => {
    menu.classList.toggle("abierto", abrir);
    // El backdrop-filter de la cabecera encierra al menú fijo: se retira mientras está abierto
    cabecera.classList.toggle("menu-abierto", abrir);
    if (abrir) cabecera.classList.remove("oculta");
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
  const relleno = document.querySelector(".recorrido__relleno");
  const paradas = [...document.querySelectorAll(".recorrido__paradas li")];

  if (!reducirMovimiento && lienzo && hero && window.SECUENCIAS) {
    // Carpeta de la secuencia del proyecto (data-base en el canvas)
    const raiz = lienzo.dataset.base || "/assets/proyectos/casa-roble";
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
      base = `${raiz}/${vertical ? "movil" : "escritorio"}/${variante.carpeta}/`;

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

      // Riel: relleno ligado al scroll (sin transición) y estancia actual
      if (relleno) relleno.style.transform = `scaleY(${p.toFixed(4)})`;
      let actualParada = 0;
      paradas.forEach((li, i) => { if (p >= parseFloat(li.dataset.desde) - 0.001) actualParada = i; });
      paradas.forEach((li, i) => li.classList.toggle("actual", i === actualParada));
      hero.classList.toggle("dentro", p >= 0.2);
    };

    const pedirDibujo = () => {
      if (!pendiente) { pendiente = true; requestAnimationFrame(() => dibujar()); }
    };

    cargarSecuencia();
    ajustarLienzo();
    // Un fotograma de espera para que el titular parta de su estado oculto
    requestAnimationFrame(() => {
      dibujar(true);
      hero.classList.add("listo");
    });

    window.addEventListener("scroll", pedirDibujo, { passive: true });
    window.addEventListener("resize", () => {
      cargarSecuencia();
      ajustarLienzo();
      dibujar(true);
    });
  } else {
    textos[0]?.classList.add("visible");
  }

  /* ---------- 3b. Portada de la landing ---------- */
  const portada = document.querySelector(".portada");
  if (portada) requestAnimationFrame(() => requestAnimationFrame(() => portada.classList.add("lista")));

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
        marco: el.closest(".foto, .capitulo__fondo, .contacto__fondo, .portada__fondo"),
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
      // Landing: muestras, portada de proyecto y arco de contacto (--v en px)
      ...[...document.querySelectorAll(".deriva")].map((el) => ({
        el,
        marco: el,
        viaje: parseFloat(el.style.getPropertyValue("--v")) || 0,
        unidad: "px",
        propiedad: "translate",
        invertir: true,
      })),
      // Landing: capas de la portada, ligadas a la primera pantalla de scroll
      ...[...document.querySelectorAll(".capa")].map((el) => ({
        el,
        marco: el.closest(".portada"),
        viaje: parseFloat(el.style.getPropertyValue("--v")) || 0,
        tipo: "portada",
      })),
      // Landing: el plano se dibuja y el riel del proceso se rellena
      ...[...document.querySelectorAll(".plano")].map((el) => ({ el, marco: el, tipo: "plano" })),
      ...[...document.querySelectorAll(".proceso__relleno")].map((el) => ({ el, marco: el.parentElement, tipo: "relleno" })),
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
        const limitar = (x) => Math.min(1, Math.max(0, x));
        if (c.tipo === "portada") {
          c.el.style.translate = `0 ${(limitar(window.scrollY / alto) * c.viaje).toFixed(2)}px`;
          return;
        }
        if (c.tipo === "plano") {
          c.el.style.strokeDashoffset = (1 - limitar((p - 0.08) / 0.42)).toFixed(4);
          return;
        }
        if (c.tipo === "relleno") {
          c.el.style.transform = `scaleX(${limitar((p - 0.05) / 0.45).toFixed(4)})`;
          return;
        }
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

  /* ---------- 5b. Portada: profundidad con el ratón ---------- */
  // Cada capa se desplaza según su profundidad --p. El valor sigue al puntero
  // con un suavizado (lerp) para que el movimiento sea fluido, y el bucle se
  // detiene en cuanto las capas llegan a su sitio.
  const escena = document.querySelector(".escena");
  const conRaton = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  if (escena && portada && conRaton && !reducirMovimiento) {
    const capasRaton = [...escena.querySelectorAll(".capa")].map((el) => ({
      el,
      p: parseFloat(el.style.getPropertyValue("--p")) || 0,
    }));
    const objetivo = { x: 0, y: 0 };
    const actual = { x: 0, y: 0 };
    let animando = false;

    const paso = () => {
      actual.x += (objetivo.x - actual.x) * 0.08;
      actual.y += (objetivo.y - actual.y) * 0.08;
      capasRaton.forEach(({ el, p }) => {
        el.style.transform = `translate3d(${(actual.x * p * 16).toFixed(2)}px, ${(actual.y * p * 10).toFixed(2)}px, 0)`;
      });
      if (Math.abs(objetivo.x - actual.x) > 0.001 || Math.abs(objetivo.y - actual.y) > 0.001) {
        requestAnimationFrame(paso);
      } else {
        animando = false;
      }
    };
    const mover = () => { if (!animando) { animando = true; requestAnimationFrame(paso); } };

    portada.addEventListener("pointermove", (e) => {
      objetivo.x = (e.clientX / window.innerWidth) * 2 - 1;
      objetivo.y = (e.clientY / window.innerHeight) * 2 - 1;
      mover();
    });
    portada.addEventListener("pointerleave", () => { objetivo.x = 0; objetivo.y = 0; mover(); });
  }

  /* ---------- 6. Sección actual en el menú ---------- */
  const enlacesMenu = new Map(
    [...document.querySelectorAll('.menu a[href^="#"]')].map((a) => [a.getAttribute("href").slice(1), a])
  );
  if ("IntersectionObserver" in window) {
    const marcar = (id) => enlacesMenu.forEach((a, clave) => {
      if (clave === id) a.setAttribute("aria-current", "true");
      else a.removeAttribute("aria-current");
    });
    const secciones = ["inicio", ...enlacesMenu.keys()].map((id) => document.getElementById(id)).filter(Boolean);
    const vigiaSecciones = new IntersectionObserver((entradas) => {
      entradas.forEach((e) => { if (e.isIntersecting) marcar(e.target.id); });
    }, { rootMargin: "-45% 0px -50% 0px" });
    secciones.forEach((s) => vigiaSecciones.observe(s));
  }

  /* ---------- 7. Formulario ---------- */
  // Base sin envío real: se conectará a un servicio (Formspree, Resend, etc.) más adelante.
  const formulario = document.getElementById("formulario");
  formulario?.addEventListener("submit", (e) => {
    e.preventDefault();
    const aviso = formulario.querySelector(".formulario__aviso");
    aviso.textContent = "¡Gracias! Este formulario aún es de ejemplo; pronto estará conectado.";
    aviso.classList.add("visible");
    formulario.reset();
  });

  /* ---------- Año del pie ---------- */
  const anio = document.getElementById("anio");
  if (anio) anio.textContent = new Date().getFullYear();
})();
