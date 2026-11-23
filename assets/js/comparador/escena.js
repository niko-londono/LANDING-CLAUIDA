/* =========================================================
   Comparador 3D · del plano al resultado
   Un mismo salón (sala, comedor y cocina en corte, sin techo)
   en dos escenas que comparten la geometría:
   · antes   → la etapa de trabajo: plano a línea, planta cerrada
               u obra gris con cotas, según el problema elegido.
   · después → el render: materiales, sol de tarde y sombras.
   Se dibujan con la misma cámara en un solo lienzo; la barra
   decide qué parte del ancho es de cada una (scissor).

   Rendimiento: se dibuja solo cuando algo cambia (barra, cámara,
   tamaño, luz de la página). Por material, todo el mobiliario
   se funde en una sola malla; las sombras se calculan una vez.
   ========================================================= */

import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { LineSegments2 } from "three/addons/lines/LineSegments2.js";
import { LineSegmentsGeometry } from "three/addons/lines/LineSegmentsGeometry.js";
import { LineMaterial } from "three/addons/lines/LineMaterial.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

const reducirMovimiento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const tactil = window.matchMedia("(pointer: coarse)").matches;

/* ---------- Paleta del sitio ---------- */
const C = {
  tinta: 0x1e1b18,
  terracota: 0xa9502b,
  ocre: 0xc8913a,
  roble: 0xb07c4f,
  salvia: 0x8e9a7e,
  oliva: 0x3a4637,
  lino: 0xe6dccd,
  arena: 0xd8c7b0,
  yeso: 0xebe3d6,
};

/* ---------- Curvas exactas del sitio (cubic-bezier) ---------- */
function bezier(x1, y1, x2, y2) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const sx = (t) => ((ax * t + bx) * t + cx) * t;
  const sy = (t) => ((ay * t + by) * t + cy) * t;
  const dx = (t) => (3 * ax * t + 2 * bx) * t + cx;
  return (x) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 8; i++) {
      const e = sx(t) - x;
      if (Math.abs(e) < 1e-6) return sy(t);
      const d = dx(t);
      if (Math.abs(d) < 1e-6) break;
      t -= e / d;
    }
    let lo = 0, hi = 1;
    t = x;
    for (let i = 0; i < 40; i++) {
      const v = sx(t);
      if (Math.abs(v - x) < 1e-6) break;
      if (x > v) lo = t; else hi = t;
      t = (lo + hi) / 2;
    }
    return sy(t);
  };
}
const easeOut = bezier(0.23, 1, 0.32, 1);
const easeInOut = bezier(0.77, 0, 0.175, 1);

/* ---------- Texturas pintadas en canvas ---------- */
function lienzo(ancho, alto) {
  const c = document.createElement("canvas");
  c.width = ancho;
  c.height = alto;
  return [c, c.getContext("2d")];
}
function textura(c, repetir = [1, 1]) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repetir[0], repetir[1]);
  t.anisotropy = 8;
  return t;
}
// Azar con semilla: la escena sale igual en cada visita
function azar(semilla) {
  let s = semilla >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

function texRoble() {
  const [c, x] = lienzo(1024, 1024);
  const r = azar(7);
  const tablas = 12;
  const alto = 1024 / tablas;
  for (let i = 0; i < tablas; i++) {
    // Tablas de largo variable, desplazadas como en una obra real
    let inicio = -r() * 600;
    while (inicio < 1024) {
      const largo = 520 + r() * 520;
      const tono = 0.93 + r() * 0.12;
      x.fillStyle = `rgb(${Math.round(176 * tono)}, ${Math.round(128 * tono)}, ${Math.round(86 * tono)})`;
      x.fillRect(inicio, i * alto, largo, alto);
      // Veta
      for (let v = 0; v < 14; v++) {
        const y = i * alto + r() * alto;
        x.strokeStyle = `rgba(${r() < 0.5 ? "90,58,32" : "214,170,122"}, ${0.08 + r() * 0.12})`;
        x.lineWidth = 0.6 + r() * 1.4;
        x.beginPath();
        x.moveTo(inicio, y);
        for (let p = 0; p <= largo; p += 40) x.lineTo(inicio + p, y + Math.sin((p + v * 37) * 0.02) * 2.2);
        x.stroke();
      }
      x.fillStyle = "rgba(60,38,20,0.55)";
      x.fillRect(inicio + largo - 1.5, i * alto, 1.5, alto);
      inicio += largo;
    }
    x.fillStyle = "rgba(60,38,20,0.5)";
    x.fillRect(0, i * alto, 1024, 2);
  }
  return textura(c);
}

function texTela(base, semilla) {
  const [c, x] = lienzo(256, 256);
  const r = azar(semilla);
  x.fillStyle = base;
  x.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 2600; i++) {
    x.fillStyle = `rgba(${r() < 0.5 ? "0,0,0" : "255,255,255"}, ${0.03 + r() * 0.05})`;
    x.fillRect(r() * 256, r() * 256, 1 + r() * 3, 1);
  }
  return textura(c, [3, 3]);
}

function texAlfombra() {
  const [c, x] = lienzo(512, 512);
  const r = azar(3);
  x.fillStyle = "#d9c8ae";
  x.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 9000; i++) {
    x.fillStyle = `rgba(${r() < 0.5 ? "120,96,70" : "250,240,225"}, ${0.05 + r() * 0.08})`;
    x.fillRect(r() * 512, r() * 512, 2, 2);
  }
  x.strokeStyle = "rgba(169,80,43,0.55)";
  x.lineWidth = 6;
  x.strokeRect(30, 30, 452, 452);
  x.strokeStyle = "rgba(47,58,46,0.35)";
  x.lineWidth = 2;
  x.strokeRect(46, 46, 420, 420);
  return textura(c);
}

function texPiedra() {
  const [c, x] = lienzo(512, 512);
  const r = azar(11);
  x.fillStyle = "#e4d9c8";
  x.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 40; i++) {
    x.strokeStyle = `rgba(170,150,120,${0.08 + r() * 0.12})`;
    x.lineWidth = 1 + r() * 3;
    x.beginPath();
    const y = r() * 512;
    x.moveTo(0, y);
    x.bezierCurveTo(170, y + (r() - 0.5) * 60, 340, y + (r() - 0.5) * 60, 512, y + (r() - 0.5) * 40);
    x.stroke();
  }
  return textura(c);
}

function texHormigon() {
  const [c, x] = lienzo(512, 512);
  const r = azar(19);
  x.fillStyle = "#bdb7ae";
  x.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 7000; i++) {
    x.fillStyle = `rgba(${r() < 0.5 ? "70,66,60" : "235,230,222"}, ${0.04 + r() * 0.1})`;
    const t = 1 + r() * 2.5;
    x.fillRect(r() * 512, r() * 512, t, t);
  }
  // Juntas del encofrado
  x.strokeStyle = "rgba(80,75,68,0.25)";
  x.lineWidth = 2;
  for (let y = 128; y < 512; y += 128) { x.beginPath(); x.moveTo(0, y); x.lineTo(512, y); x.stroke(); }
  return textura(c, [2, 2]);
}

// La vista por la ventana: atardecer sobre el mar, con un cabo a la derecha
function texPaisaje() {
  const [c, x] = lienzo(1024, 576);
  const cielo = x.createLinearGradient(0, 0, 0, 330);
  cielo.addColorStop(0, "#9fb4bf");
  cielo.addColorStop(0.55, "#e9cfa6");
  cielo.addColorStop(1, "#f3b97c");
  x.fillStyle = cielo;
  x.fillRect(0, 0, 1024, 330);
  const sol = x.createRadialGradient(330, 300, 4, 330, 300, 190);
  sol.addColorStop(0, "rgba(255,236,196,1)");
  sol.addColorStop(0.12, "rgba(255,214,150,0.9)");
  sol.addColorStop(1, "rgba(255,200,140,0)");
  x.fillStyle = sol;
  x.fillRect(0, 100, 1024, 230);
  const mar = x.createLinearGradient(0, 330, 0, 576);
  mar.addColorStop(0, "#c99a72");
  mar.addColorStop(0.15, "#6f8a93");
  mar.addColorStop(1, "#3f5762");
  x.fillStyle = mar;
  x.fillRect(0, 330, 1024, 246);
  // Reflejo del sol
  const r = azar(5);
  for (let i = 0; i < 70; i++) {
    const y = 334 + i * 3.2;
    const ancho = 120 - i * 1.3 + r() * 30;
    x.fillStyle = `rgba(255,214,160,${0.5 - i * 0.006})`;
    x.fillRect(330 - ancho / 2 + (r() - 0.5) * 20, y, ancho, 1.4);
  }
  // Cabo
  x.fillStyle = "#3d4434";
  x.beginPath();
  x.moveTo(1024, 250);
  x.bezierCurveTo(900, 240, 820, 290, 700, 330);
  x.lineTo(1024, 340);
  x.closePath();
  x.fill();
  return textura(c);
}

// Cuadro del salón: el arco y el sol de la portada
function texCuadro() {
  const [c, x] = lienzo(256, 360);
  x.fillStyle = "#f4ede2";
  x.fillRect(0, 0, 256, 360);
  x.fillStyle = "#e3d3bd";
  x.beginPath();
  x.moveTo(40, 340); x.lineTo(40, 170); x.arc(128, 170, 88, Math.PI, 0); x.lineTo(216, 340); x.closePath();
  x.fill();
  x.fillStyle = "#a9502b";
  x.beginPath(); x.arc(168, 128, 30, 0, Math.PI * 2); x.fill();
  x.fillStyle = "#2f3a2e";
  x.beginPath();
  x.moveTo(98, 340); x.lineTo(98, 250); x.arc(128, 250, 30, Math.PI, 0); x.lineTo(158, 340); x.closePath();
  x.fill();
  return textura(c);
}

function rotulo(texto) {
  const [c, x] = lienzo(256, 72);
  x.font = '600 34px "Hanken Grotesk", system-ui, sans-serif';
  x.textAlign = "center";
  x.textBaseline = "middle";
  const ancho = x.measureText(texto).width + 28;
  x.fillStyle = "rgba(248,244,238,0.92)";
  x.fillRect(128 - ancho / 2, 10, ancho, 52);
  x.fillStyle = "#1e1b18";
  x.fillText(texto, 128, 37);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, toneMapped: false, depthTest: false }));
  s.scale.set(1.5, 0.42, 1);
  s.renderOrder = 10;
  return s;
}

/* =========================================================
   MODELO
   Cada malla lleva userData.tipo:
   suelo, muro, ventana, vidrio, paisaje, mueble, tabique
   ========================================================= */
function construirModelo() {
  const raiz = new THREE.Group();
  const M = {};
  const estandar = (o) => new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0, envMapIntensity: 0.55, ...o });
  M.roble = estandar({ map: texRoble(), roughness: 0.62 });
  M.robleMueble = estandar({ map: texRoble(), color: 0xe8d2bd, roughness: 0.6 });
  M.yeso = estandar({ color: C.yeso, roughness: 0.95 });
  M.canto = estandar({ color: 0xcfc4b4, roughness: 0.95 });
  M.lino = estandar({ map: texTela("#ddd2c1", 1), roughness: 1 });
  M.salvia = estandar({ map: texTela("#909c80", 2), roughness: 1 });
  M.terracota = estandar({ map: texTela("#b25a33", 4), roughness: 1 });
  M.ocre = estandar({ map: texTela("#c99543", 6), roughness: 1 });
  M.alfombra = estandar({ map: texAlfombra(), roughness: 1 });
  M.piedra = estandar({ map: texPiedra(), roughness: 0.4 });
  M.oliva = estandar({ color: C.oliva, roughness: 0.55 });
  M.metal = estandar({ color: 0x24211e, roughness: 0.45, metalness: 0.6 });
  M.laton = estandar({ color: 0xc19a5b, roughness: 0.3, metalness: 0.9 });
  M.hojas = estandar({ color: 0x75855f, roughness: 0.8, flatShading: true });
  M.barro = estandar({ color: 0xa9603c, roughness: 0.9 });
  M.pantalla = estandar({ color: 0xf1e3c8, roughness: 1, emissive: 0xffc77a, emissiveIntensity: 0.35, side: THREE.DoubleSide });
  M.cuadro = estandar({ map: texCuadro(), roughness: 0.9 });
  M.vidrio = new THREE.MeshStandardMaterial({ color: 0xdfe8e6, transparent: true, opacity: 0.12, roughness: 0.05, metalness: 0, envMapIntensity: 1, depthWrite: false });
  M.paisaje = new THREE.MeshBasicMaterial({ map: texPaisaje(), toneMapped: false });

  const H = 2.8;   // alto de los muros
  const G = 0.15;  // grosor de los muros

  const poner = (geo, mat, x, y, z, tipo, rot) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    if (rot) m.rotation.set(rot[0] || 0, rot[1] || 0, rot[2] || 0);
    m.userData.tipo = tipo;
    raiz.add(m);
    return m;
  };
  // Caja apoyada: y es la cota de la base
  const caja = (w, h, d, mat, x, y, z, tipo = "mueble", rot) => poner(new THREE.BoxGeometry(w, h, d), mat, x, y + h / 2, z, tipo, rot);
  // Piezas tapizadas: en el plano se dibujan como su caja (las aristas
  // redondeadas no superan el umbral de ángulo y no saldrían)
  const blanda = (w, h, d, radio, mat, x, y, z, rot) => {
    const m = poner(new RoundedBoxGeometry(w, h, d, 3, radio), mat, x, y + h / 2, z, "mueble", rot);
    m.userData.contorno = new THREE.BoxGeometry(w, h, d);
    return m;
  };
  const cilindro = (rArriba, rAbajo, h, mat, x, y, z, segmentos = 28, tipo = "mueble") =>
    poner(new THREE.CylinderGeometry(rArriba, rAbajo, h, segmentos), mat, x, y + h / 2, z, tipo);

  /* ----- Casco: losa, muros y ventana ----- */
  // Losa: tarima arriba, canto en los lados (un material por cara)
  const losa = new THREE.BoxGeometry(9 + G, 0.22, 7 + G);
  const robleLosa = M.roble.clone();
  robleLosa.map = M.roble.map.clone();
  robleLosa.map.repeat.set(9.15 / 2.4, 7.15 / 2.4);
  robleLosa.map.needsUpdate = true;
  const suelo = poner(losa, [M.canto, M.canto, robleLosa, M.canto, M.canto, M.canto], -G / 2, -0.11, -G / 2, "suelo");
  suelo.userData.multi = true;

  const zFondo = -3.5 - G / 2;
  // Muro del fondo con el ventanal (x de −1,6 a 2,2; y de 0,35 a 2,45)
  caja(-1.6 - (-4.5 - G), H, G, M.yeso, (-4.5 - G - 1.6) / 2, 0, zFondo, "muro");
  caja(4.5 - 2.2, H, G, M.yeso, (2.2 + 4.5) / 2, 0, zFondo, "muro");
  caja(3.8, 0.35, G, M.yeso, 0.3, 0, zFondo, "muro");
  caja(3.8, H - 2.45, G, M.yeso, 0.3, 2.45, zFondo, "muro");
  // Muro izquierdo, ciego
  caja(G, H, 7 + G, M.yeso, -4.5 - G / 2, 0, -G / 2, "muro");

  // Ventanal: marco, montantes y vidrio; detrás, la vista
  caja(3.8, 0.05, 0.2, M.metal, 0.3, 0.35, zFondo, "ventana");
  caja(3.8, 0.05, 0.2, M.metal, 0.3, 2.4, zFondo, "ventana");
  for (const xm of [-1.575, -0.33, 0.93, 2.175]) caja(0.05, 2.1, 0.2, M.metal, xm, 0.35, zFondo, "ventana");
  poner(new THREE.PlaneGeometry(3.8, 2.1), M.vidrio, 0.3, 1.4, zFondo + 0.02, "vidrio");
  poner(new THREE.PlaneGeometry(4.6, 2.5), M.paisaje, 0.3, 1.35, zFondo - 0.18, "paisaje");

  /* ----- Sala ----- */
  caja(3.0, 0.02, 2.6, M.alfombra, -2.45, 0, 0.5);
  // Sofá contra el muro, mirando a la sala
  blanda(0.95, 0.42, 2.6, 0.06, M.lino, -3.97, 0, 0.5);
  blanda(0.24, 0.44, 2.6, 0.08, M.lino, -4.32, 0.4, 0.5);
  blanda(0.95, 0.6, 0.2, 0.07, M.lino, -3.97, 0, -0.9);
  blanda(0.95, 0.6, 0.2, 0.07, M.lino, -3.97, 0, 1.9);
  blanda(0.72, 0.14, 1.18, 0.06, M.lino, -3.86, 0.42, -0.1);
  blanda(0.72, 0.14, 1.18, 0.06, M.lino, -3.86, 0.42, 1.1);
  blanda(0.16, 0.42, 0.42, 0.07, M.terracota, -4.12, 0.6, -0.45, [0, 0, -0.18]);
  blanda(0.16, 0.38, 0.38, 0.07, M.ocre, -4.12, 0.6, 1.45, [0, 0, -0.18]);
  // Mesa de centro redonda
  cilindro(0.52, 0.52, 0.04, M.robleMueble, -2.45, 0.38, 0.5, 40);
  cilindro(0.3, 0.36, 0.38, M.robleMueble, -2.45, 0, 0.5, 40);
  cilindro(0.09, 0.07, 0.16, M.barro, -2.3, 0.42, 0.35);
  // Butaca frente al sofá
  blanda(0.8, 0.4, 0.82, 0.08, M.salvia, -1.2, 0, 1.15);
  blanda(0.18, 0.42, 0.82, 0.07, M.salvia, -0.88, 0.4, 1.15);
  blanda(0.62, 0.2, 0.14, 0.05, M.salvia, -1.15, 0.4, 0.8);
  blanda(0.62, 0.2, 0.14, 0.05, M.salvia, -1.15, 0.4, 1.5);
  // Lámpara de pie
  cilindro(0.17, 0.17, 0.03, M.metal, -4.05, 0, -1.55);
  cilindro(0.015, 0.015, 1.5, M.metal, -4.05, 0.03, -1.55, 8);
  poner(new THREE.CylinderGeometry(0.17, 0.25, 0.32, 32, 1, true), M.pantalla, -4.05, 1.62, -1.55, "mueble");
  // Planta en maceta de barro
  cilindro(0.22, 0.17, 0.46, M.barro, -3.95, 0, 2.75);
  const r = azar(23);
  for (let i = 0; i < 7; i++) {
    const a = i * 0.9;
    poner(new THREE.IcosahedronGeometry(0.2 + r() * 0.12, 0), M.hojas, -3.95 + Math.cos(a) * 0.16, 0.72 + i * 0.1, 2.75 + Math.sin(a) * 0.16, "mueble", [r() * 3, r() * 3, 0]);
  }
  // Aparador bajo el muro del fondo, con espejo redondo
  caja(2.1, 0.56, 0.45, M.robleMueble, -3.2, 0.1, -3.5 + 0.225);
  for (const xp of [-3.85, -3.2, -2.55]) caja(0.04, 0.1, 0.4, M.metal, xp, 0, -3.5 + 0.225);
  poner(new THREE.CylinderGeometry(0.46, 0.46, 0.03, 48), M.laton, -3.2, 1.55, -3.5 + 0.015, "mueble", [Math.PI / 2, 0, 0]);
  cilindro(0.08, 0.12, 0.34, M.barro, -2.6, 0.66, -3.3);
  // Cuadro sobre el sofá
  caja(0.04, 1.1, 0.8, M.cuadro, -4.48, 1.15, 0.5);

  /* ----- Comedor ----- */
  const xm = 1.1, zm = -1.6;
  caja(2.0, 0.05, 0.95, M.robleMueble, xm, 0.72, zm);
  caja(0.07, 0.72, 0.75, M.robleMueble, xm - 0.78, 0, zm);
  caja(0.07, 0.72, 0.75, M.robleMueble, xm + 0.78, 0, zm);
  for (const lado of [-1, 1]) {
    for (const dx of [-0.65, 0, 0.65]) {
      const z = zm + lado * 0.68;
      caja(0.44, 0.05, 0.44, M.robleMueble, xm + dx, 0.44, z);
      caja(0.44, 0.4, 0.05, M.robleMueble, xm + dx, 0.49, z + lado * 0.2);
      for (const [px, pz] of [[-0.19, -0.19], [0.19, -0.19], [-0.19, 0.19], [0.19, 0.19]]) {
        cilindro(0.018, 0.018, 0.44, M.metal, xm + dx + px, 0, z + pz, 6);
      }
    }
  }
  // Lámpara lineal de latón
  poner(new THREE.CylinderGeometry(0.035, 0.035, 1.6, 16), M.laton, xm, 1.8, zm, "mueble", [0, 0, Math.PI / 2]);
  for (const dx of [-0.7, 0.7]) cilindro(0.004, 0.004, H - 1.8, M.metal, xm + dx, 1.8, zm, 4);
  cilindro(0.16, 0.16, 0.12, M.barro, xm, 0.77, zm);

  /* ----- Cocina ----- */
  const zb = -3.5 + 0.31;
  caja(2.1, 0.86, 0.62, M.oliva, 3.45, 0, zb);
  caja(2.14, 0.04, 0.65, M.piedra, 3.45, 0.86, zb);
  caja(2.0, 0.04, 0.3, M.robleMueble, 3.45, 1.55, -3.5 + 0.15);
  caja(2.0, 0.04, 0.3, M.robleMueble, 3.45, 1.95, -3.5 + 0.15);
  for (const [px, alto] of [[2.8, 0.2], [2.95, 0.26], [3.9, 0.18], [4.05, 0.22]]) cilindro(0.06, 0.06, alto, M.barro, px, 1.59, -3.38, 16);
  cilindro(0.05, 0.05, 0.3, M.metal, 3.5, 0.9, zb, 12);
  // Isla con taburetes
  caja(0.9, 0.86, 2.0, M.oliva, 3.4, 0, 0.5);
  caja(1.04, 0.04, 2.14, M.piedra, 3.45, 0.86, 0.5);
  for (const z of [-0.15, 0.5, 1.15]) {
    cilindro(0.18, 0.18, 0.05, M.robleMueble, 4.25, 0.68, z, 24);
    cilindro(0.02, 0.02, 0.68, M.metal, 4.25, 0, z, 8);
    cilindro(0.14, 0.14, 0.02, M.metal, 4.25, 0, z, 24);
  }
  const fuente = poner(new THREE.SphereGeometry(0.2, 24, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), M.robleMueble, 3.4, 1.1, 0.9, "mueble");
  fuente.scale.y = 0.5;

  /* ----- Tabiques de la planta cerrada (solo en el «antes») ----- */
  const T = 0.12;
  caja(T, H, 4.1, M.yeso, -0.15, 0, -1.45, "tabique");
  caja(0.7, H, T, M.yeso, 0.2, 0, 0.6, "tabique");
  caja(0.85, H, T, M.yeso, 1.875, 0, 0.6, "tabique");
  caja(T, H, 4.4, M.yeso, 2.3, 0, -1.3, "tabique");
  caja(T, H, 1.7, M.yeso, 2.3, 0, 2.65, "tabique");

  raiz.updateMatrixWorld(true);
  return { raiz, M };
}

/* ---------- Utilidades de geometría ---------- */
// Geometría en coordenadas del mundo, sin índice, con los atributos pedidos
function enMundo(malla, atributos) {
  let g = malla.geometry.clone();
  g.applyMatrix4(malla.matrixWorld);
  if (g.index) g = g.toNonIndexed();
  for (const nombre of Object.keys(g.attributes)) if (!atributos.includes(nombre)) g.deleteAttribute(nombre);
  g.clearGroups();
  return g;
}

// Aristas de varias mallas en una sola línea gruesa, ordenadas de abajo
// arriba para que el plano "se construya" al animar instanceCount
function lineasDe(mallas, material) {
  const segmentos = [];
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  for (const m of mallas) {
    const aristas = new THREE.EdgesGeometry(m.userData.contorno || m.geometry, 30);
    const p = aristas.attributes.position;
    for (let i = 0; i < p.count; i += 2) {
      a.fromBufferAttribute(p, i).applyMatrix4(m.matrixWorld);
      b.fromBufferAttribute(p, i + 1).applyMatrix4(m.matrixWorld);
      segmentos.push([a.x, a.y, a.z, b.x, b.y, b.z]);
    }
    aristas.dispose();
  }
  segmentos.sort((s, t) => Math.min(s[1], s[4]) - Math.min(t[1], t[4]));
  const g = new LineSegmentsGeometry();
  g.setPositions(segmentos.flat());
  const linea = new LineSegments2(g, material);
  linea.userData.total = segmentos.length;
  return linea;
}

function rellenoDe(mallas, material) {
  if (!mallas.length) return new THREE.Group();
  const g = mergeGeometries(mallas.map((m) => enMundo(m, ["position"])));
  return new THREE.Mesh(g, material);
}

/* =========================================================
   ESCENAS
   ========================================================= */
function escenaDespues(modelo) {
  const escena = new THREE.Scene();
  const porMaterial = new Map();
  for (const m of [...modelo.raiz.children]) {
    const tipo = m.userData.tipo;
    if (tipo === "tabique") continue;
    if (m.userData.multi || tipo === "paisaje" || tipo === "vidrio") {
      const copia = m.clone();
      copia.castShadow = tipo === "suelo";
      copia.receiveShadow = tipo === "suelo";
      escena.add(copia);
      continue;
    }
    if (!porMaterial.has(m.material)) porMaterial.set(m.material, []);
    porMaterial.get(m.material).push(m);
  }
  // Una malla por material: ~20 llamadas de dibujo para todo el salón
  for (const [material, mallas] of porMaterial) {
    const g = mergeGeometries(mallas.map((m) => enMundo(m, ["position", "normal", "uv"])));
    const fundida = new THREE.Mesh(g, material);
    fundida.castShadow = true;
    fundida.receiveShadow = true;
    escena.add(fundida);
  }
  // Sombra de la maqueta sobre la "mesa"
  const base = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.ShadowMaterial({ opacity: 0.16 }));
  base.rotation.x = -Math.PI / 2;
  base.position.y = -0.22;
  base.receiveShadow = true;
  escena.add(base);

  // Luz: sol bajo de tarde que entra por el ventanal, cielo suave y entorno
  const sol = new THREE.DirectionalLight(0xffd6a0, 2.8);
  sol.position.set(3.6, 6.2, -9);
  sol.castShadow = true;
  const tam = tactil ? 1024 : 2048;
  sol.shadow.mapSize.set(tam, tam);
  Object.assign(sol.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: 1, far: 30 });
  sol.shadow.bias = -0.0004;
  sol.shadow.normalBias = 0.02;
  escena.add(sol);
  escena.add(new THREE.HemisphereLight(0xf6ecdc, 0xb59a7f, 0.7));
  return escena;
}

function escenaAntes(modelo) {
  const escena = new THREE.Scene();
  const de = (...tipos) => modelo.raiz.children.filter((m) => tipos.includes(m.userData.tipo));
  const tinta = new LineMaterial({ color: C.tinta, linewidth: 1.1, toneMapped: false });
  const tintaSuave = new LineMaterial({ color: C.tinta, linewidth: 1, transparent: true, opacity: 0.72, toneMapped: false });
  const papel = new THREE.MeshBasicMaterial({ color: 0xfaf7f1, toneMapped: false, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
  const materialesLinea = [tinta, tintaSuave];

  const capa = (nombre, ...hijos) => {
    const g = new THREE.Group();
    g.name = nombre;
    hijos.forEach((h) => g.add(h));
    escena.add(g);
    return g;
  };

  const lineas = [];
  const conLineas = (mallas, material) => { const l = lineasDe(mallas, material); lineas.push(l); return l; };

  // Plano a línea (y planta): casco, ventana, muebles, tabiques
  const capas = {
    casco: capa("casco", rellenoDe(de("suelo", "muro"), papel), conLineas(de("suelo", "muro"), tinta)),
    ventana: capa("ventana", rellenoDe(de("ventana"), papel), conLineas(de("ventana"), tinta)),
    muebles: capa("muebles", rellenoDe(de("mueble"), papel), conLineas(de("mueble"), tintaSuave)),
    tabiques: capa("tabiques", rellenoDe(de("tabique"), papel), conLineas(de("tabique"), tinta)),
  };

  // Cuadrícula de dibujo bajo la maqueta
  const reticula = new THREE.GridHelper(40, 80, C.tinta, C.tinta);
  reticula.material.transparent = true;
  reticula.material.opacity = 0.07;
  reticula.material.toneMapped = false;
  reticula.position.y = -0.225;
  escena.add(reticula);

  // Obra gris: casco de hormigón con luz propia, replanteo y cotas
  const hormigon = new THREE.MeshStandardMaterial({ map: texHormigon(), roughness: 1 });
  const obra = capa("obra");
  for (const m of de("suelo", "muro")) {
    const copia = new THREE.Mesh(m.geometry, hormigon);
    copia.applyMatrix4(m.matrixWorld);
    obra.add(copia);
  }
  obra.add(conLineas(de("suelo", "muro"), tintaSuave));
  const luzObra = new THREE.DirectionalLight(0xffffff, 1.6);
  luzObra.position.set(-4, 8, 6);
  obra.add(luzObra, new THREE.HemisphereLight(0xffffff, 0x8c8478, 1.1));

  // Replanteo: la huella de cada mueble en discontinua terracota
  const replanteo = new LineMaterial({ color: C.terracota, linewidth: 1.4, dashed: true, dashSize: 0.12, gapSize: 0.08, toneMapped: false });
  materialesLinea.push(replanteo);
  const huellas = [];
  const caja3 = new THREE.Box3();
  for (const m of de("mueble")) {
    caja3.setFromObject(m);
    const t = caja3.getSize(new THREE.Vector3());
    if (caja3.min.y > 0.5 || t.x < 0.3 || t.z < 0.3) continue; // solo lo que pisa el suelo
    const y = 0.015;
    const [x0, x1, z0, z1] = [caja3.min.x, caja3.max.x, caja3.min.z, caja3.max.z];
    huellas.push(x0, y, z0, x1, y, z0, x1, y, z0, x1, y, z1, x1, y, z1, x0, y, z1, x0, y, z1, x0, y, z0);
  }
  const gHuellas = new LineSegmentsGeometry();
  gHuellas.setPositions(huellas);
  const lHuellas = new LineSegments2(gHuellas, replanteo);
  lHuellas.computeLineDistances();
  lHuellas.userData.total = huellas.length / 6;
  lineas.push(lHuellas);
  obra.add(lHuellas);

  // Cotas: línea, testigos y rótulo con la medida
  const cotaMat = new LineMaterial({ color: C.tinta, linewidth: 1, toneMapped: false });
  materialesLinea.push(cotaMat);
  const cota = (a, b, desvio, texto) => {
    const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), D = new THREE.Vector3(...desvio);
    const A2 = A.clone().add(D), B2 = B.clone().add(D);
    const dir = B2.clone().sub(A2).normalize();
    const n = D.clone().normalize().multiplyScalar(0.12);
    const tick = dir.clone().multiplyScalar(0.1).add(n);
    const p = [
      ...A2.toArray(), ...B2.toArray(),
      ...A.clone().add(D.clone().multiplyScalar(0.2)).toArray(), ...A2.clone().add(D.clone().normalize().multiplyScalar(0.12)).toArray(),
      ...B.clone().add(D.clone().multiplyScalar(0.2)).toArray(), ...B2.clone().add(D.clone().normalize().multiplyScalar(0.12)).toArray(),
      ...A2.clone().sub(tick).toArray(), ...A2.clone().add(tick).toArray(),
      ...B2.clone().sub(tick).toArray(), ...B2.clone().add(tick).toArray(),
    ];
    const g = new LineSegmentsGeometry();
    g.setPositions(p);
    const l = new LineSegments2(g, cotaMat);
    l.userData.total = 5;
    lineas.push(l);
    const r = rotulo(texto);
    r.position.copy(A2).add(B2).multiplyScalar(0.5).add(D.clone().normalize().multiplyScalar(0.28));
    obra.add(l, r);
  };
  cota([-4.5, 0, 3.5], [4.5, 0, 3.5], [0, 0, 0.7], "9,00 m");
  cota([4.5, 0, -3.5], [4.5, 0, 3.5], [0.7, 0, 0], "7,00 m");
  cota([-4.65, 0, 3.5], [-4.65, 2.8, 3.5], [-0.45, 0, 0.45], "2,80 m");
  cota([-1.6, 2.8, -3.65], [2.2, 2.8, -3.65], [0, 0.55, 0], "3,80 m");
  return { escena, capas, obra, lineas, materialesLinea };
}

/* =========================================================
   CÁMARAS POR MODO
   ========================================================= */
const VISTAS = {
  render: { pos: [7.6, 6.3, 8.8], mira: [-0.2, 0.6, -0.5] },
  planta: { pos: [-0.1, 19.5, 0.7], mira: [-0.1, 0, 0.25] },
  obra: { pos: [6.4, 8.6, 9.4], mira: [-0.5, 0.3, -0.2] },
};

/* =========================================================
   ARRANQUE
   ========================================================= */
export async function iniciar(seccion, figura) {
  const escenario = figura.querySelector(".comparador__escenario");
  const lienzoEl = figura.querySelector(".comparador__lienzo");
  const control = figura.querySelector(".comparador__control");
  const barra = figura.querySelector(".comparador__barra");
  const estado = figura.querySelector(".comparador__estado");
  const etiquetaAntes = figura.querySelector(".comparador__etiqueta--antes");
  const etiquetaDespues = figura.querySelector(".comparador__etiqueta--despues");
  const pieAntes = figura.querySelector(".comparador__pie-antes");
  const pieDespues = figura.querySelector(".comparador__pie-despues");
  const botones = [...seccion.querySelectorAll(".problema")];

  // Los rótulos de las cotas usan la tipografía del sitio
  if (document.fonts?.ready) await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1500))]);

  const renderer = new THREE.WebGLRenderer({ canvas: lienzoEl, antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, tactil ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false; // nada se mueve: una sola pasada de sombras
  renderer.shadowMap.needsUpdate = true;

  const modelo = construirModelo();
  const despues = escenaDespues(modelo);
  const antes = escenaAntes(modelo);

  const pmrem = new THREE.PMREMGenerator(renderer);
  despues.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;
  pmrem.dispose();

  // El fondo de las dos escenas es el de la página (día o tarde)
  const ponerFondo = () => {
    const fondo = new THREE.Color().setStyle(getComputedStyle(document.body).backgroundColor);
    despues.background = fondo;
    antes.escena.background = fondo;
  };
  ponerFondo();

  const camara = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  const mira = new THREE.Vector3();

  /* ----- Estado ----- */
  let modo = "render";
  let posBarra = reducirMovimiento ? 0.5 : 1; // 0 = todo resultado, 1 = todo etapa
  let ancho = 1, alto = 1;
  let pedido = false;
  let progresoLineas = reducirMovimiento ? 1 : 0;

  const aplicarModo = () => {
    const c = antes.capas;
    const linea = modo !== "obra";
    c.casco.visible = linea;
    c.ventana.visible = linea;
    c.muebles.visible = linea;
    c.tabiques.visible = modo === "planta";
    antes.obra.visible = modo === "obra";
  };

  // Aleja la cámara en pantallas estrechas para que quepa la maqueta
  const vistaDe = (m) => {
    const v = VISTAS[m];
    const factor = 1.22 * Math.max(1, 1.3 / Math.max(camara.aspect, 0.4));
    const p = new THREE.Vector3(...v.pos);
    const t = new THREE.Vector3(...v.mira);
    return { pos: t.clone().add(p.sub(t).multiplyScalar(factor)), mira: t };
  };
  const colocarCamara = (m) => {
    const v = vistaDe(m);
    camara.position.copy(v.pos);
    mira.copy(v.mira);
    camara.lookAt(mira);
  };

  const ponerLineas = (p) => {
    for (const l of antes.lineas) l.geometry.instanceCount = Math.ceil(l.userData.total * p);
  };

  /* ----- Dibujo bajo demanda ----- */
  const dibujar = () => {
    pedido = false;
    const x = Math.round(ancho * posBarra);
    renderer.setScissorTest(true);
    renderer.setViewport(0, 0, ancho, alto);
    if (x > 0) {
      renderer.setScissor(0, 0, x, alto);
      renderer.render(antes.escena, camara);
    }
    if (x < ancho) {
      renderer.setScissor(x, 0, ancho - x, alto);
      renderer.render(despues, camara);
    }
    renderer.setScissorTest(false);
  };
  const pedirDibujo = () => {
    if (!pedido) {
      pedido = true;
      requestAnimationFrame(dibujar);
    }
  };

  // La barra y las etiquetas se mueven por transform/opacity, sin esperar al lienzo
  const ponerBarra = (p, desdeControl = false) => {
    posBarra = Math.min(1, Math.max(0, p));
    barra.style.transform = `translateX(${(posBarra * ancho).toFixed(1)}px)`;
    etiquetaAntes.style.opacity = posBarra > 0.16 ? "1" : "0";
    etiquetaDespues.style.opacity = posBarra < 0.84 ? "1" : "0";
    const valor = Math.round(posBarra * 100);
    if (!desdeControl) control.value = String(valor);
    control.setAttribute("aria-valuetext", `${100 - valor} % del resultado a la vista`);
    pedirDibujo();
  };

  const medir = () => {
    const r = escenario.getBoundingClientRect();
    ancho = Math.max(1, Math.round(r.width));
    alto = Math.max(1, Math.round(r.height));
    renderer.setSize(ancho, alto, false);
    camara.aspect = ancho / alto;
    camara.updateProjectionMatrix();
    for (const m of antes.materialesLinea) m.resolution.set(ancho, alto);
    if (!tween) colocarCamara(modo);
    ponerBarra(posBarra);
  };

  /* ----- Animaciones: una sola rAF que se apaga al terminar ----- */
  let tween = null;   // cámara
  let barrido = null; // barra automática de la entrada
  let lineasAnim = null;
  let bucle = 0;
  const animar = (ahora) => {
    bucle = 0;
    let sigue = false;
    if (lineasAnim) {
      const t = Math.min(1, (ahora - lineasAnim.inicio) / lineasAnim.dur);
      progresoLineas = easeOut(t);
      ponerLineas(progresoLineas);
      if (t < 1) sigue = true; else lineasAnim = null;
    }
    if (barrido) {
      const t = (ahora - barrido.inicio) / barrido.dur;
      if (t >= 0) {
        const k = easeInOut(Math.min(1, t));
        ponerBarra(barrido.desde + (barrido.hasta - barrido.desde) * k);
        if (t >= 1) barrido = null;
      }
      if (barrido) sigue = true;
    }
    if (tween) {
      const t = Math.min(1, (ahora - tween.inicio) / tween.dur);
      const k = easeInOut(t);
      camara.position.lerpVectors(tween.desde.pos, tween.hasta.pos, k);
      mira.lerpVectors(tween.desde.mira, tween.hasta.mira, k);
      camara.lookAt(mira);
      if (t < 1) sigue = true; else tween = null;
    }
    dibujar();
    if (sigue) bucle = requestAnimationFrame(animar);
  };
  const arrancarBucle = () => { if (!bucle) bucle = requestAnimationFrame(animar); };

  /* ----- Barra: arrastre con puntero y control accesible ----- */
  let arrastrando = false;
  const desdePuntero = (e) => {
    const r = escenario.getBoundingClientRect();
    ponerBarra((e.clientX - r.left) / r.width);
  };
  escenario.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    barrido = null;
    arrastrando = true;
    escenario.setPointerCapture(e.pointerId);
    escenario.classList.add("arrastrando");
    desdePuntero(e);
  });
  escenario.addEventListener("pointermove", (e) => { if (arrastrando) desdePuntero(e); });
  const soltar = () => { arrastrando = false; escenario.classList.remove("arrastrando"); };
  escenario.addEventListener("pointerup", soltar);
  escenario.addEventListener("pointercancel", soltar);
  control.addEventListener("input", () => { barrido = null; ponerBarra(Number(control.value) / 100, true); });

  /* ----- Problemas: cambian la etapa y la cámara ----- */
  const elegir = (boton) => {
    const nuevo = boton.dataset.modo;
    botones.forEach((b) => b.setAttribute("aria-pressed", String(b === boton)));
    etiquetaAntes.textContent = boton.dataset.antes;
    etiquetaDespues.textContent = boton.dataset.despues;
    pieAntes.textContent = boton.dataset.pieAntes;
    pieDespues.textContent = boton.dataset.pieDespues;
    if (nuevo === modo) return;
    modo = nuevo;
    aplicarModo();
    // Si la etapa no se ve, se abre un poco para que el cambio se note
    if (posBarra < 0.25) ponerBarra(0.5);
    if (reducirMovimiento) {
      colocarCamara(modo);
      pedirDibujo();
      return;
    }
    tween = {
      inicio: performance.now(),
      dur: 1200,
      desde: { pos: camara.position.clone(), mira: mira.clone() },
      hasta: vistaDe(modo),
    };
    arrancarBucle();
  };
  botones.forEach((b) => b.addEventListener("click", () => elegir(b)));

  /* ----- Luz de día o de tarde de la página ----- */
  new MutationObserver(() => { ponerFondo(); pedirDibujo(); })
    .observe(document.documentElement, { attributes: true, attributeFilter: ["data-luz"] });

  /* ----- Primer dibujo ----- */
  aplicarModo();
  ponerLineas(progresoLineas);
  new ResizeObserver(medir).observe(escenario);
  medir();
  dibujar();
  figura.classList.add("lista");
  estado.textContent = "";

  // Entrada: el plano se dibuja de abajo arriba y la barra descubre el render
  if (!reducirMovimiento) {
    const vigia = new IntersectionObserver((entradas) => {
      if (!entradas[0].isIntersecting) return;
      vigia.disconnect();
      const ahora = performance.now();
      lineasAnim = { inicio: ahora, dur: 1800 };
      if (!arrastrando && posBarra === 1) barrido = { inicio: ahora + 1300, dur: 1400, desde: 1, hasta: 0.45 };
      arrancarBucle();
    }, { threshold: 0.45 });
    vigia.observe(escenario);
  }
}
