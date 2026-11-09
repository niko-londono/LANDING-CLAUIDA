/* =========================================================
   Inmersión · HUD
   Capa HTML sobre el lienzo: índice de proyectos, etiqueta
   bajo el puntero, ficha del proyecto y controles del mapa.
   La ficha carga sus imágenes (y su modelo, si lo tiene) solo
   cuando se abre: la ciudad arranca ligera.
   ========================================================= */

const $ = (id) => document.getElementById(id);

const CATEGORIAS = {
  presentacion: "Presentación",
  residencial: "Residencial",
  comercial: "Comercial",
  exterior: "Exterior",
};

const escapar = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export function crearHud({ proyectos, alElegir, alCerrar, alVistaGeneral, alZoom }) {
  const indice = $("indice");
  const ficha = $("ficha");
  const contenido = $("ficha-contenido");
  const etiqueta = $("etiqueta");

  /* ---------- Índice ---------- */
  const botones = new Map();
  for (const p of proyectos) {
    const li = document.createElement("li");
    const b = document.createElement("button");
    b.type = "button";
    b.className = "indice__boton";
    b.dataset.categoria = p.datos.categoria;
    b.innerHTML = `<span class="indice__punto" aria-hidden="true"></span><span>${escapar(p.datos.nombre)}</span>`;
    b.addEventListener("click", () => alElegir(p));
    li.append(b);
    indice.append(li);
    botones.set(p, b);
  }

  /* ---------- Etiqueta bajo el puntero ---------- */
  let etiquetaDe = null;
  function hover(p, x, y) {
    if (p !== etiquetaDe) {
      etiquetaDe = p;
      if (p) etiqueta.textContent = p.datos.nombre;
      etiqueta.classList.toggle("visible", !!p);
      for (const [q, b] of botones) b.classList.toggle("sobre", q === p);
    }
    if (x !== undefined) etiqueta.style.transform = `translate(${x + 16}px, ${y + 14}px)`;
  }

  /* ---------- Ficha ---------- */
  let abierto = null;
  function abrir(p) {
    const d = p.datos;
    abierto = p;
    hover(null); // la cámara va a volar: la etiqueta quedaría fuera de sitio
    for (const [q, b] of botones) b.setAttribute("aria-current", q === p ? "true" : "false");

    const meta = (d.meta || []).map(escapar).join(" · ");
    const entregables = (d.entregables || []).map((e) => `<li>${escapar(e)}</li>`).join("");
    const enlace = d.enlace
      ? `<a class="boton boton--acento ficha__enlace" href="${escapar(d.enlace.href)}">${escapar(d.enlace.texto)}</a>`
      : "";
    contenido.innerHTML = `
      <p class="ficha__tipo"><span class="ficha__punto" data-categoria="${escapar(d.categoria)}" aria-hidden="true"></span>${escapar(CATEGORIAS[d.categoria] || "")} · ${escapar(d.tipo)}</p>
      <h2 class="ficha__titulo" id="ficha-titulo" tabindex="-1">${escapar(d.nombre)}</h2>
      ${meta ? `<p class="ficha__meta">${meta}</p>` : ""}
      <p class="ficha__concepto">${escapar(d.concepto)}</p>
      <div class="ficha__galeria" id="ficha-galeria"></div>
      <h3 class="ficha__subtitulo">Qué se entregó</h3>
      <ul class="ficha__entregables">${entregables}</ul>
      ${enlace}
    `;
    cargarDetalle(d);

    ficha.hidden = false;
    // Un fotograma para que la transición parta del estado cerrado
    requestAnimationFrame(() => requestAnimationFrame(() => ficha.classList.add("abierta")));
    contenido.scrollTop = 0;
    $("ficha-titulo").focus({ preventScroll: true });
  }

  // Carga perezosa: imágenes (y modelo detallado, si existe) solo al abrir
  function cargarDetalle(d) {
    const galeria = $("ficha-galeria");
    if (!d.imagenes || !d.imagenes.length) {
      galeria.innerHTML = `<p class="ficha__sin-imagen">Los renders y planos de este proyecto se publicarán pronto.</p>`;
      return;
    }
    for (const [i, img] of d.imagenes.entries()) {
      const fig = document.createElement("figure");
      fig.className = "ficha__imagen" + (i === 0 ? " ficha__imagen--principal" : "");
      const el = new Image();
      el.decoding = "async";
      el.loading = i === 0 ? "eager" : "lazy";
      el.width = 960; el.height = 540;
      el.alt = img.alt || "";
      el.addEventListener("load", () => fig.classList.add("lista"), { once: true });
      el.src = img.src;
      fig.append(el);
      galeria.append(fig);
    }
  }

  function cerrar({ silencioso = false } = {}) {
    if (!abierto) return;
    const p = abierto;
    abierto = null;
    for (const b of botones.values()) b.setAttribute("aria-current", "false");
    ficha.classList.remove("abierta");
    const fin = () => { if (!abierto) { ficha.hidden = true; contenido.innerHTML = ""; } };
    ficha.addEventListener("transitionend", fin, { once: true });
    setTimeout(fin, 500); // por si no hay transición (movimiento reducido)
    if (!silencioso) botones.get(p)?.focus({ preventScroll: true });
  }

  $("ficha-cerrar").addEventListener("click", () => alCerrar());
  $("vista-general").addEventListener("click", () => alVistaGeneral());
  $("acercar").addEventListener("click", () => alZoom(0.7));
  $("alejar").addEventListener("click", () => alZoom(1.4));
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && abierto) alCerrar();
  });

  function listo() {
    const carga = $("carga");
    carga.classList.add("oculta");
    setTimeout(() => carga.remove(), 600);
  }

  return { hover, abrir, cerrar, listo, abierto: () => abierto };
}
