/* =========================================================
   Inmersión · interacción
   Raycasting contra las cajas invisibles de los proyectos.
   - pointermove solo guarda la posición; el rayo se lanza una
     vez por fotograma como mucho, dentro del bucle.
   - Un clic es un toque corto que apenas se mueve: arrastrar
     para navegar no selecciona nada.
   - Hover: la cuadra sube 0,6 y sus líneas de luz se encienden,
     con suavizado exponencial (independiente de los Hz).
   ========================================================= */
import * as THREE from "three";

const ELEVACION = 0.6;
const TAU_HOVER = 0.11; // s: constante de tiempo del suavizado

export function crearInteraccion({ camara, lienzo, ciudad, renderer, alSeleccionar, alHover, invalidar }) {
  const rayo = new THREE.Raycaster();
  const puntero = new THREE.Vector2();
  let pendiente = false;
  let dentro = false;
  let sobre = null;        // proyecto bajo el puntero
  let seleccionado = null; // proyecto abierto
  let inicio = null;
  const porId = new Map(ciudad.proyectos.map((p) => [p.datos.id, p]));

  function aNdc(e) {
    const r = lienzo.getBoundingClientRect();
    puntero.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  }
  function lanzar() {
    rayo.setFromCamera(puntero, camara);
    const hit = rayo.intersectObjects(ciudad.cajas, false)[0];
    return hit ? porId.get(hit.object.userData.id) : null;
  }

  lienzo.addEventListener("pointermove", (e) => {
    if (e.pointerType !== "mouse") return; // en táctil no hay hover
    aNdc(e);
    dentro = true;
    pendiente = true;
    alHover(sobre, e.clientX, e.clientY);
    invalidar();
  });
  lienzo.addEventListener("pointerleave", () => {
    dentro = false;
    pendiente = true;
    invalidar();
  });
  lienzo.addEventListener("pointerdown", (e) => {
    inicio = { x: e.clientX, y: e.clientY, t: performance.now() };
  });
  lienzo.addEventListener("pointerup", (e) => {
    if (!inicio) return;
    const movio = Math.hypot(e.clientX - inicio.x, e.clientY - inicio.y);
    const duro = performance.now() - inicio.t;
    inicio = null;
    if (movio > 6 || duro > 500 || e.button !== 0) return;
    aNdc(e);
    const p = lanzar();
    if (p) alSeleccionar(p);
  });

  function marcarSeleccion(p) {
    seleccionado = p;
    invalidar();
  }

  /* Un paso del bucle: rayo pendiente + animación de elevación. Devuelve true si algo cambió. */
  function paso(dt) {
    let cambio = false;
    if (pendiente) {
      pendiente = false;
      const nuevo = dentro ? lanzar() : null;
      if (nuevo !== sobre) {
        sobre = nuevo;
        lienzo.style.cursor = sobre ? "pointer" : "";
        alHover(sobre);
      }
    }
    const k = 1 - Math.exp(-dt / TAU_HOVER);
    for (const p of ciudad.proyectos) {
      const activo = p === sobre || p === seleccionado;
      const meta = activo ? ELEVACION : 0;
      const d = meta - p.elevacion;
      if (Math.abs(d) > 0.001) {
        p.elevacion += d * k;
        if (Math.abs(meta - p.elevacion) < 0.001) p.elevacion = meta;
        p.elevable.position.y = p.elevacion;
        p.bordes.opacity = 0.45 + (p.elevacion / ELEVACION) * 0.55;
        cambio = true;
      }
    }
    // Las sombras solo se recalculan cuando una cuadra se mueve
    if (cambio) renderer.shadowMap.needsUpdate = true;
    return cambio;
  }

  return { paso, marcarSeleccion, porId };
}
