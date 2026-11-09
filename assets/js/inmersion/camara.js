/* =========================================================
   Inmersión · cámara
   - MapControls con inercia (damping): arrastrar mueve, rueda o
     pellizco acerca, botón derecho o dos dedos giran.
   - WASD / flechas para moverse, + / − para acercar.
   - Límites: la cámara no sale de la ciudad, no baja del
     horizonte ni se pone cenital del todo.
   - Vuelos: interpolación de posición y objetivo con la curva
     --ease-in-out del sitio (cubic-bezier 0.77, 0, 0.175, 1).
     Se pueden interrumpir: tocar la escena devuelve el control.
   ========================================================= */
import * as THREE from "three";
import { MapControls } from "three/addons/controls/MapControls.js";
import { LIMITE } from "./ciudad.js";

const reducirMovimiento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// cubic-bezier exacto (mismo método que los navegadores: Newton + bisección)
function bezier(x1, y1, x2, y2) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const sx = (t) => ((ax * t + bx) * t + cx) * t;
  const sy = (t) => ((ay * t + by) * t + cy) * t;
  const dx = (t) => (3 * ax * t + 2 * bx) * t + cx;
  return (x) => {
    let t = x;
    for (let i = 0; i < 8; i++) {
      const e = sx(t) - x;
      if (Math.abs(e) < 1e-6) return sy(t);
      const d = dx(t);
      if (Math.abs(d) < 1e-6) break;
      t -= e / d;
    }
    let lo = 0, hi = 1; t = x;
    while (lo < hi) {
      const v = sx(t);
      if (Math.abs(v - x) < 1e-6) break;
      if (x > v) lo = t; else hi = t;
      t = (lo + hi) / 2;
    }
    return sy(t);
  };
}
const easeInOut = bezier(0.77, 0, 0.175, 1);

export const VISTA_GENERAL = {
  objetivo: new THREE.Vector3(0, 0, 4),
  posicion: new THREE.Vector3(118, 128, 132),
};

// En pantallas verticales la vista general es más cenital y algo más lejana:
// la ciudad llena el alto de la pantalla en vez de quedarse en una franja
export const esVertical = () => window.innerWidth / window.innerHeight < 0.8;
function posicionGeneral() {
  const o = VISTA_GENERAL.objetivo;
  if (!esVertical()) return VISTA_GENERAL.posicion.clone();
  const az = Math.atan2(VISTA_GENERAL.posicion.x - o.x, VISTA_GENERAL.posicion.z - o.z);
  return new THREE.Vector3().setFromSphericalCoords(250, 0.62, az).add(o);
}

export function crearControles(camara, lienzo, invalidar) {
  camara.position.copy(posicionGeneral());

  const controles = new MapControls(camara, lienzo);
  controles.target.copy(VISTA_GENERAL.objetivo);
  controles.enableDamping = true;
  controles.dampingFactor = 0.075;
  controles.screenSpacePanning = false;
  controles.minDistance = 26;
  controles.maxDistance = 360;
  controles.minPolarAngle = 0.3;
  controles.maxPolarAngle = 1.18;
  controles.rotateSpeed = 0.55;
  controles.zoomSpeed = 0.9;
  controles.zoomToCursor = true;
  controles.update();

  // Mantener el objetivo dentro de la ciudad (la cámara lo sigue)
  const desplazamiento = new THREE.Vector3();
  controles.addEventListener("change", () => {
    const t = controles.target;
    const x = THREE.MathUtils.clamp(t.x, -LIMITE, LIMITE);
    const z = THREE.MathUtils.clamp(t.z, -LIMITE, LIMITE);
    if (x !== t.x || z !== t.z || t.y !== 0) {
      desplazamiento.set(x - t.x, -t.y, z - t.z);
      t.add(desplazamiento);
      camara.position.add(desplazamiento);
    }
    invalidar();
  });

  /* ---------- Teclado ---------- */
  const teclas = new Set();
  const MOVIMIENTO = { KeyW: [0, 1], ArrowUp: [0, 1], KeyS: [0, -1], ArrowDown: [0, -1], KeyA: [-1, 0], ArrowLeft: [-1, 0], KeyD: [1, 0], ArrowRight: [1, 0] };
  const enCampo = (e) => e.target.closest("input, textarea, select, [contenteditable]");
  window.addEventListener("keydown", (e) => {
    if (enCampo(e) || e.metaKey || e.ctrlKey || e.altKey) return;
    if (MOVIMIENTO[e.code]) {
      teclas.add(e.code);
      cancelarVuelo();
      if (e.code.startsWith("Arrow")) e.preventDefault();
      invalidar();
    } else if (e.key === "+" || e.key === "=") { zoom(0.8); }
    else if (e.key === "-" || e.key === "_") { zoom(1.25); }
  });
  window.addEventListener("keyup", (e) => teclas.delete(e.code));
  window.addEventListener("blur", () => teclas.clear());

  const adelante = new THREE.Vector3();
  const derecha = new THREE.Vector3();
  function moverConTeclas(dt) {
    if (!teclas.size) return false;
    let fx = 0, fz = 0;
    for (const k of teclas) { fx += MOVIMIENTO[k][0]; fz += MOVIMIENTO[k][1]; }
    if (!fx && !fz) return false;
    camara.getWorldDirection(adelante);
    adelante.y = 0; adelante.normalize();
    derecha.crossVectors(adelante, camara.up).normalize();
    // La velocidad crece con la distancia: lejos se cruza la ciudad, cerca se afina
    const v = camara.position.distanceTo(controles.target) * 0.9 * dt;
    desplazamiento.copy(adelante).multiplyScalar(fz * v).addScaledVector(derecha, fx * v);
    controles.target.add(desplazamiento);
    camara.position.add(desplazamiento);
    controles.dispatchEvent({ type: "change" });
    return true;
  }

  /* ---------- Zoom con botones o teclas ---------- */
  function zoom(factor) {
    const dir = desplazamiento.subVectors(camara.position, controles.target);
    const d = THREE.MathUtils.clamp(dir.length() * factor, controles.minDistance, controles.maxDistance);
    dir.setLength(d);
    volar(controles.target.clone().add(dir), controles.target.clone(), 420);
  }

  /* ---------- Vuelos ---------- */
  let vuelo = null;
  function volar(posicion, objetivo, duracion) {
    if (reducirMovimiento) {
      camara.position.copy(posicion);
      controles.target.copy(objetivo);
      controles.update();
      invalidar();
      return;
    }
    const distancia = camara.position.distanceTo(posicion) + controles.target.distanceTo(objetivo);
    vuelo = {
      desdeP: camara.position.clone(), haciaP: posicion,
      desdeO: controles.target.clone(), haciaO: objetivo,
      inicio: performance.now(),
      // Recorridos largos duran más, pero nunca más de 1,6 s
      duracion: duracion ?? THREE.MathUtils.clamp(700 + distancia * 4.5, 800, 1600),
    };
    controles.enabled = false;
    invalidar();
  }
  function cancelarVuelo() {
    if (!vuelo) return;
    vuelo = null;
    controles.enabled = true;
  }
  // Tocar la escena durante un vuelo devuelve el control al instante
  lienzo.addEventListener("pointerdown", cancelarVuelo);
  lienzo.addEventListener("wheel", cancelarVuelo, { passive: true });

  function actualizarVuelo(ahora) {
    if (!vuelo) return false;
    const t = Math.min((ahora - vuelo.inicio) / vuelo.duracion, 1);
    const k = easeInOut(t);
    camara.position.lerpVectors(vuelo.desdeP, vuelo.haciaP, k);
    controles.target.lerpVectors(vuelo.desdeO, vuelo.haciaO, k);
    camara.lookAt(controles.target);
    if (t === 1) {
      vuelo = null;
      controles.enabled = true;
      controles.update();
    }
    return true;
  }

  // Encuadre de un proyecto: misma orientación que ahora, más cerca y algo más cenital.
  // En pantallas anchas el objetivo se desplaza para que el edificio quede a la
  // izquierda de la ficha (lado derecho), entre ella y el índice.
  function encuadrar(centro, alto) {
    const actual = desplazamiento.subVectors(camara.position, controles.target);
    const azimut = Math.atan2(actual.x, actual.z);
    const polar = 0.95;
    const r = 56 + alto * 2;
    // El objetivo se queda en el suelo (y = 0), como exigen los límites: así
    // no hay salto al devolver el control a MapControls al final del vuelo
    const objetivo = centro.clone().setY(0);
    if (esVertical()) {
      // Móvil: la ficha cubre la mitad baja; el objetivo se acerca a la cámara
      // para que el edificio quede en la mitad alta, a la vista
      objetivo.x += Math.sin(azimut) * r * 0.32;
      objetivo.z += Math.cos(azimut) * r * 0.32;
    } else if (window.innerWidth >= 900) {
      // vector «derecha» de la cámara en el plano del suelo
      objetivo.x += Math.cos(azimut) * r * 0.06;
      objetivo.z -= Math.sin(azimut) * r * 0.06;
    }
    const posicion = new THREE.Vector3(
      objetivo.x + Math.sin(azimut) * Math.sin(polar) * r,
      objetivo.y + Math.cos(polar) * r,
      objetivo.z + Math.cos(azimut) * Math.sin(polar) * r
    );
    volar(posicion, objetivo);
  }

  function vistaGeneral() {
    volar(posicionGeneral(), VISTA_GENERAL.objetivo.clone());
  }

  /* Un paso del bucle. Devuelve true si la cámara se movió (hay que redibujar). */
  function paso(ahora, dt) {
    let movio = actualizarVuelo(ahora);
    if (!vuelo) {
      movio = moverConTeclas(dt) || movio;
      // update() aplica la inercia; devuelve true mientras la cámara siga deslizando
      movio = controles.update() || movio;
    }
    return movio;
  }

  return { controles, paso, encuadrar, vistaGeneral, zoom, cancelarVuelo };
}
