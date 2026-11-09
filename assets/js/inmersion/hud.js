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
  const capaRotulos = $("rotulos");

  /* ---------- Rótulos fijos sobre cada proyecto ----------
     Distinguen las cuadras con las que se puede interactuar de las demás.
     Son botones HTML (nítidos, accesibles, clicables) que se colocan
     sobre el marcador de cada edificio solo cuando la escena se redibuja:
     6 transform por fotograma, nada más. */
  const rotulos = new Map();
  for (const p of proyectos) {
    if (!p.centro || !capaRotulos) break; // sin 3D no hay rótulos
    const r = document.createElement("button");
    r.type = "button";
    r.className = "rotulo";
    r.dataset.categoria = p.datos.categoria;
    r.tabIndex = -1; // el índice ya da el acceso con teclado; evita duplicar paradas
    r.setAttribute("aria-hidden", "true");
    r.innerHTML = `<span class="rotulo__texto"><span class="rotulo__punto"></span>${escapar(p.datos.nombre)}</span>`;
    r.addEventListener("click", () => alElegir(p));
    capaRotulos.append(r);
    rotulos.set(p, r);
  }
  let vector = null;
  function actualizarRotulos(camara, ancho, alto) {
    if (!rotulos.size) return;
    vector ??= proyectos[0].centro.clone(); // un Vector3 reutilizable, sin importar three aquí
    for (const [p, r] of rotulos) {
      vector.set(p.centro.x, p.alto + p.elevacion + 4.3, p.centro.z).project(camara);
      const fuera = vector.z > 1 || Math.abs(vector.x) > 1.1 || Math.abs(vector.y) > 1.1;
      r.classList.toggle("oculto", fuera);
      if (fuera) continue;
      const x = (vector.x * 0.5 + 0.5) * ancho;
      const y = (-vector.y * 0.5 + 0.5) * alto;
      r.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
      // Los lejanos quedan detrás de los cercanos
      r.style.zIndex = String(Math.round((1 - vector.z) * 10000));
    }
  }

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

  /* ---------- Hover: resalta el rótulo y la entrada del índice ---------- */
  let sobre = null;
  function hover(p) {
    if (p === sobre) return;
    sobre = p;
    for (const [q, b] of botones) b.classList.toggle("sobre", q === p);
    for (const [q, r] of rotulos) r.classList.toggle("sobre", q === p);
  }

  /* ---------- Ficha ---------- */
  let abierto = null;
  function abrir(p) {
    const d = p.datos;
    abierto = p;
    for (const [q, b] of botones) b.setAttribute("aria-current", q === p ? "true" : "false");
    for (const [q, r] of rotulos) r.classList.toggle("activo", q === p);

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
    for (const r of rotulos.values()) r.classList.remove("activo");
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
    if (!carga) return;
    carga.classList.add("oculta");
    setTimeout(() => carga.remove(), 600);
  }

  return { hover, abrir, cerrar, listo, actualizarRotulos, abierto: () => abierto };
}
