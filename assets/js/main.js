/* =========================================================
   Claudia · Diseño de interiores — comportamiento base
   1. Cabecera: fondo al bajar, se oculta al seguir bajando
   2. Menú móvil
   3. Recorrido 3D (páginas de proyecto): secuencia y riel ligados al scroll
   3b. Portada de la landing: entrada del titular
   4. Revelados al entrar en pantalla
   5. Paralaje de respaldo (si no hay animation-timeline)
   6. Sección actual en el menú
   7. Formulario: abre el correo; el sobre entra al buzón
   8. Atajo a WhatsApp
   9. Luz de día o de tarde (cordón de la lámpara)
   10. Hora y clima de Santo Domingo
   11. Lectura palabra a palabra del manifiesto
   12. Olas entre secciones de distinto color
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
        marco: el.closest(".foto, .capitulo__fondo, .contacto__fondo, .proyecto__portada"),
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
  // Sin servidor: abre el correo de quien escribe con el mensaje ya redactado
  // para la dirección de data-correo.
  const formulario = document.getElementById("formulario");
  formulario?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const datos = new FormData(formulario);
    const asunto = `Proyecto de ${datos.get("nombre")}`;
    const cuerpo = `${datos.get("mensaje")}

${datos.get("nombre")} · ${datos.get("correo")}`;
    // El sobre del botón se cuela por la ranura y luego se abre el correo
    const sobre = formulario.querySelector(".sobre");
    if (sobre && !reducirMovimiento && sobre.animate) {
      await sobre.animate(
        [{ transform: "translateX(0)" }, { transform: "translateX(115%)" }],
        { duration: 380, easing: "cubic-bezier(0.77, 0, 0.175, 1)" }
      ).finished.catch(() => {});
      sobre.animate(
        [{ transform: "translateX(-115%)" }, { transform: "translateX(0)" }],
        { duration: 320, delay: 500, easing: "cubic-bezier(0.23, 1, 0.32, 1)", fill: "backwards" }
      );
    }
    window.location.href = `mailto:${formulario.dataset.correo}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`;
    const aviso = formulario.querySelector(".formulario__aviso");
    aviso.textContent = "Se abrió tu correo con el mensaje listo. Solo falta enviarlo.";
    aviso.classList.add("visible");
  });

  /* ---------- 8. Atajo a WhatsApp ---------- */
  // Visible tras dejar la primera pantalla; se oculta cuando el contacto o
  // el cierre están a la vista (ya hay una llamada a la acción ahí).
  const whatsapp = document.querySelector(".whatsapp");
  if (whatsapp) {
    const finales = document.querySelectorAll("#contacto, #cierre");
    let finalVisible = false;
    const actualizar = () => {
      whatsapp.classList.toggle("visible", window.scrollY > window.innerHeight * 0.6 && !finalVisible);
    };
    if ("IntersectionObserver" in window && finales.length) {
      new IntersectionObserver((entradas) => {
        finalVisible = entradas.some((e) => e.isIntersecting);
        actualizar();
      }, { threshold: 0.15 }).observe(finales[0]);
      if (finales[1]) new IntersectionObserver((e) => { finalVisible = e[0].isIntersecting; actualizar(); }, { threshold: 0.15 }).observe(finales[1]);
    }
    window.addEventListener("scroll", actualizar, { passive: true });
    actualizar();
  }

  /* ---------- 9. Luz de día o de tarde (cordón de la lámpara) ---------- */
  const lampara = document.querySelector(".lampara");
  if (lampara) {
    const raiz = document.documentElement;
    const texto = lampara.querySelector(".lampara__texto");
    const cordon = lampara.querySelector(".lampara__cordon");
    const colorTema = document.querySelector('meta[name="theme-color"]');
    const pintar = (tarde) => {
      if (tarde) raiz.dataset.luz = "tarde"; else delete raiz.dataset.luz;
      lampara.setAttribute("aria-pressed", String(tarde));
      texto.textContent = tarde ? "Tira para volver al día" : "Tira para la luz de tarde";
      colorTema?.setAttribute("content", tarde ? "#ecdcc5" : "#f2ece3");
    };
    pintar(raiz.dataset.luz === "tarde");
    lampara.addEventListener("click", () => {
      const tarde = raiz.dataset.luz !== "tarde";
      try { localStorage.setItem("luz", tarde ? "tarde" : "dia"); } catch (e) {}
      if (!reducirMovimiento && cordon.animate) {
        // Tirón: baja, rebota un poco por encima y se asienta
        cordon.animate([
          { transform: "translateY(0)" },
          { transform: "translateY(18px)", offset: 0.3 },
          { transform: "translateY(-4px)", offset: 0.65 },
          { transform: "translateY(0)" }
        ], { duration: 560, easing: "cubic-bezier(0.23, 1, 0.32, 1)" });
      }
      if (document.startViewTransition) document.startViewTransition(() => pintar(tarde));
      else pintar(tarde);
    });
  }

  /* ---------- 10. Hora y clima de Santo Domingo ---------- */
  const ahora = document.getElementById("ahora");
  if (ahora) {
    const hora = document.getElementById("ahora-hora");
    const clima = document.getElementById("ahora-clima");
    const formato = new Intl.DateTimeFormat("es-DO", { hour: "numeric", minute: "2-digit", timeZone: "America/Santo_Domingo" });
    const ponerHora = () => {
      const d = new Date();
      hora.textContent = formato.format(d);
      hora.dateTime = d.toISOString();
    };
    ponerHora();
    ahora.hidden = false;
    // Se actualiza al cambiar el minuto, no cada segundo
    setTimeout(() => { ponerHora(); setInterval(ponerHora, 60000); }, (60 - new Date().getSeconds()) * 1000);

    const describir = (c) =>
      c === 0 ? "despejado" : c <= 2 ? "algo nublado" : c === 3 ? "nublado" :
      c <= 48 ? "niebla" : c <= 57 ? "llovizna" : c <= 67 ? "lluvia" :
      c <= 82 ? "chubascos" : c >= 95 ? "tormenta" : "";
    const ponerClima = ({ t, c }) => {
      const palabra = describir(c);
      clima.textContent = ` · ${Math.round(t)} °C${palabra ? `, ${palabra}` : ""}`;
    };
    let guardado = null;
    try { guardado = JSON.parse(sessionStorage.getItem("clima-sd")); } catch (e) {}
    if (guardado && Date.now() - guardado.cuando < 30 * 60000) ponerClima(guardado);
    else if ("fetch" in window) {
      const corte = "AbortController" in window ? new AbortController() : null;
      if (corte) setTimeout(() => corte.abort(), 5000);
      fetch("https://api.open-meteo.com/v1/forecast?latitude=18.4861&longitude=-69.9312&current=temperature_2m,weather_code", { signal: corte?.signal })
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then((d) => {
          const dato = { t: d.current.temperature_2m, c: d.current.weather_code, cuando: Date.now() };
          if (typeof dato.t !== "number") return;
          ponerClima(dato);
          try { sessionStorage.setItem("clima-sd", JSON.stringify(dato)); } catch (e) {}
        })
        .catch(() => {}); // Sin clima se queda solo la hora
    }
  }

  /* ---------- 11. Lectura palabra a palabra del manifiesto ---------- */
  const bajada = document.querySelector(".manifiesto__bajada");
  if (bajada && !reducirMovimiento && "IntersectionObserver" in window) {
    const textos = bajada.textContent.trim().split(/\s+/);
    bajada.textContent = "";
    const palabras = textos.map((t, i) => {
      const span = document.createElement("span");
      span.className = "palabra-lectura";
      span.textContent = t;
      bajada.append(span);
      if (i < textos.length - 1) bajada.append(" ");
      return span;
    });
    bajada.classList.add("lectura");
    let leidas = 0;
    let pedido = false;
    const leer = () => {
      pedido = false;
      const r = bajada.getBoundingClientRect();
      const alto = window.innerHeight || 1;
      // Empieza cuando el párrafo asoma al 85 % de la pantalla y
      // termina cuando su final pasa por el 55 %
      const inicio = alto * 0.85;
      const recorrido = r.height + alto * 0.3;
      const p = Math.min(1, Math.max(0, (inicio - r.top) / recorrido));
      const n = Math.round(p * palabras.length);
      if (n === leidas) return;
      const [desde, hasta] = n > leidas ? [leidas, n] : [n, leidas];
      for (let i = desde; i < hasta; i++) palabras[i].classList.toggle("leida", i < n);
      palabras[leidas - 1]?.classList.remove("cursor");
      if (n > 0 && n < palabras.length) palabras[n - 1].classList.add("cursor");
      leidas = n;
    };
    const pedirLectura = () => { if (!pedido) { pedido = true; requestAnimationFrame(leer); } };
    new IntersectionObserver((entradas) => {
      if (entradas[0].isIntersecting) { window.addEventListener("scroll", pedirLectura, { passive: true }); pedirLectura(); }
      else { window.removeEventListener("scroll", pedirLectura); leer(); }
    }).observe(bajada);
  }

  /* ---------- 12. Olas entre secciones ---------- */
  // Antes de cada [data-ola] va una campana del color de esa sección, con una
  // línea fina en su borde. Cuando la sección asoma por abajo la campana está
  // alta; se aplana mientras sube hasta quedar como línea divisoria recta.
  // data-ola dice dónde nace la cresta (izquierda, centro o derecha).
  const seccionesOla = [...document.querySelectorAll("[data-ola]")];
  if (seccionesOla.length) {
    document.documentElement.classList.add("con-olas");
    const nacimiento = { izquierda: 380, centro: 500, derecha: 620 };
    const svgNS = "http://www.w3.org/2000/svg";
    const olas = seccionesOla.map((seccion) => {
      const borde = document.createElement("div");
      borde.className = "ola";
      borde.setAttribute("aria-hidden", "true");
      const color = seccion.dataset.olaColor || "hueso";
      borde.style.color = `var(--${color})`;
      if (color === "oliva") borde.classList.add("ola--oscura");
      const svg = document.createElementNS(svgNS, "svg");
      svg.setAttribute("viewBox", "0 0 1000 100");
      svg.setAttribute("preserveAspectRatio", "none");
      const relleno = document.createElementNS(svgNS, "path");
      relleno.setAttribute("class", "ola__relleno");
      const linea = document.createElementNS(svgNS, "path");
      linea.setAttribute("class", "ola__linea");
      svg.append(relleno, linea);
      borde.append(svg);
      seccion.before(borde);
      return { borde, relleno, linea, base: nacimiento[seccion.dataset.ola] ?? 500, alto: -1 };
    });

    const trazar = (o, a) => {
      // a: 0 plana, 1 cresta completa. La cresta va hacia el centro al aplanarse.
      const alto = Math.round(a * 1000) / 10;
      if (alto === o.alto) return;
      o.alto = alto;
      const x = o.base + (500 - o.base) * (1 - a);
      const y = (100 - alto).toFixed(1);
      const curva = `M0 100C${(x * 0.5).toFixed(1)} 100 ${(x - 160).toFixed(1)} ${y} ${x.toFixed(1)} ${y}C${(x + 160).toFixed(1)} ${y} ${(x + (1000 - x) * 0.5).toFixed(1)} 100 1000 100`;
      o.linea.setAttribute("d", curva);
      o.relleno.setAttribute("d", `${curva}V103H0Z`);
    };

    if (reducirMovimiento || !("IntersectionObserver" in window)) {
      olas.forEach((o) => trazar(o, 0));
    } else {
      const olasVisibles = new Set();
      let pendienteOla = false;
      const moverOlas = () => {
        pendienteOla = false;
        const alto = window.innerHeight;
        olasVisibles.forEach((o) => {
          const t = Math.min(1, Math.max(0, (o.borde.getBoundingClientRect().top / alto - 0.15) / 0.85));
          trazar(o, t * t * (3 - 2 * t));
        });
      };
      const pedirOlas = () => {
        if (!pendienteOla) { pendienteOla = true; requestAnimationFrame(moverOlas); }
      };
      const vigiaOlas = new IntersectionObserver((entradas) => {
        entradas.forEach((e) => {
          const o = olas.find((x) => x.borde === e.target);
          if (e.isIntersecting) olasVisibles.add(o);
          else {
            olasVisibles.delete(o);
            // Fuera de la vista: plana si ya quedó arriba, alta si está por llegar
            trazar(o, e.boundingClientRect.top < 0 ? 0 : 1);
          }
        });
        pedirOlas();
      }, { rootMargin: "20% 0px" });
      olas.forEach((o) => vigiaOlas.observe(o.borde));
      window.addEventListener("scroll", pedirOlas, { passive: true });
      window.addEventListener("resize", pedirOlas);
    }
  }

  /* ---------- Año del pie ---------- */
  const anio = document.getElementById("anio");
  if (anio) anio.textContent = new Date().getFullYear();
})();
