/* =========================================================
   Inmersión · arranque y bucle
   Render bajo demanda: solo se dibuja cuando algo cambia
   (cámara, vuelo, hover, tamaño). Quieta, la ciudad no gasta
   GPU ni batería; en movimiento va al ritmo de la pantalla.
   Con ?fps en la URL aparece un contador.

   Módulos:
     escena.js      renderizador, luces, niebla, sombras
     ciudad.js      cuadrícula, entorno instanciado, proyectos
     camara.js      controles con inercia, teclado, vuelos
     interaccion.js raycasting, hover, clic
     hud.js         índice, ficha, etiqueta, controles del mapa
   ========================================================= */
import * as THREE from "three";
import { crearEscena } from "./escena.js";
import { crearCiudad } from "./ciudad.js";
import { crearControles } from "./camara.js";
import { crearInteraccion } from "./interaccion.js";
import { crearHud } from "./hud.js";

function hayWebGL() {
  try {
    const c = document.createElement("canvas");
    return !!(window.WebGL2RenderingContext && c.getContext("webgl2")) || !!c.getContext("webgl");
  } catch { return false; }
}

async function iniciar() {
  const lienzo = document.getElementById("ciudad");
  const respuesta = await fetch("/assets/js/inmersion/proyectos.json");
  const { proyectos: datos } = await respuesta.json();

  if (!hayWebGL()) {
    document.getElementById("sin-3d").hidden = false;
    document.getElementById("carga").remove();
    // El índice sigue funcionando: cada proyecto lleva a su página, si la tiene
    crearHud({
      proyectos: datos.map((d) => ({ datos: d })),
      alElegir: (p) => { if (p.datos.enlace) location.href = p.datos.enlace.href; },
      alCerrar() {}, alVistaGeneral() {}, alZoom() {},
    });
    return;
  }

  const { renderer, escena, camara } = crearEscena(lienzo);

  let sucio = true;
  const invalidar = () => { sucio = true; };

  const ciudad = crearCiudad(escena, datos);
  const vista = crearControles(camara, lienzo, invalidar);

  let seleccionado = null;
  function seleccionar(p) {
    if (seleccionado === p) return;
    seleccionado = p;
    interaccion.marcarSeleccion(p);
    vista.encuadrar(p.centro, p.alto);
    hud.abrir(p);
    cargarModelo(p);
  }
  function deseleccionar() {
    if (!seleccionado) return;
    seleccionado = null;
    interaccion.marcarSeleccion(null);
    hud.cerrar();
    vista.vistaGeneral();
  }

  const hud = crearHud({
    proyectos: ciudad.proyectos,
    alElegir: seleccionar,
    alCerrar: deseleccionar,
    alVistaGeneral: () => {
      if (seleccionado) deseleccionar();
      else vista.vistaGeneral();
    },
    alZoom: (f) => vista.zoom(f),
  });

  const interaccion = crearInteraccion({
    camara, lienzo, ciudad, renderer,
    alSeleccionar: seleccionar,
    alHover: (p, x, y) => hud.hover(p, x, y),
    invalidar,
  });

  /* Carga perezosa del modelo detallado de un proyecto (si proyectos.json
     trae "modelo": ruta a un .glb low-poly). El cargador tampoco se descarga
     hasta que hace falta. Sustituye al edificio genérico de su cuadra. */
  const modelosCargados = new Set();
  async function cargarModelo(p) {
    if (!p.datos.modelo || modelosCargados.has(p)) return;
    modelosCargados.add(p);
    try {
      const { GLTFLoader } = await import("three/addons/loaders/GLTFLoader.js");
      const gltf = await new GLTFLoader().loadAsync(p.datos.modelo);
      const modelo = gltf.scene;
      modelo.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      modelo.position.y = 0.9;
      const generico = p.elevable.children.find((c) => c.isGroup);
      if (generico) generico.visible = false;
      p.elevable.add(modelo);
      renderer.shadowMap.needsUpdate = true;
      invalidar();
    } catch (err) {
      modelosCargados.delete(p);
      console.warn("No se pudo cargar el modelo de", p.datos.id, err);
    }
  }

  /* ---------- Tamaño ---------- */
  function ajustar() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    camara.aspect = w / h;
    // En pantallas verticales se abre un poco el campo para que quepa la ciudad
    const vertical = w / h < 0.8;
    camara.fov = vertical ? 42 : 30;
    escena.fog.near = vertical ? 240 : 190;
    escena.fog.far = vertical ? 520 : 430;
    camara.updateProjectionMatrix();
    invalidar();
  }
  window.addEventListener("resize", ajustar);
  ajustar();

  /* ---------- Contador de FPS (?fps) ---------- */
  const fpsEl = document.getElementById("fps");
  const medirFps = new URLSearchParams(location.search).has("fps");
  if (medirFps) fpsEl.hidden = false;
  let cuadros = 0, desde = performance.now();

  /* ---------- Bucle ---------- */
  let anterior = performance.now();
  function bucle(ahora) {
    const dt = Math.min((ahora - anterior) / 1000, 0.1);
    anterior = ahora;
    if (vista.paso(ahora, dt)) sucio = true;
    if (interaccion.paso(dt)) sucio = true;
    if (sucio || medirFps) {
      sucio = false;
      renderer.render(escena, camara);
    }
    if (medirFps) {
      cuadros++;
      if (ahora - desde >= 500) {
        const info = renderer.info.render;
        fpsEl.textContent = `${Math.round((cuadros * 1000) / (ahora - desde))} fps · ${info.calls} llamadas · ${(info.triangles / 1000).toFixed(1)}k triángulos`;
        cuadros = 0; desde = ahora;
      }
    }
    requestAnimationFrame(bucle);
  }
  requestAnimationFrame(bucle);

  // Primer dibujo hecho: fuera el velo
  requestAnimationFrame(() => requestAnimationFrame(() => hud.listo()));

  // Para depurar desde la consola
  window.__inmersion = { THREE, renderer, escena, camara, ciudad, vista };
}

iniciar().catch((err) => {
  console.error(err);
  document.getElementById("sin-3d").hidden = false;
  document.getElementById("carga")?.remove();
});
