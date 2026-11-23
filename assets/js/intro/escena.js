/* =========================================================
   Intro «dentro de la pantalla» · escena
   El estudio de Claudia hecho en Three.js, sin modelos externos:
   escritorio de roble con estantería de libros y muestras, el
   dispositivo (monitor en horizontal, teléfono en un soporte de
   roble en vertical) y un ventanal al Caribe de la tarde.

   La portada es HTML de verdad: cada fotograma se proyectan las
   cuatro esquinas de la pantalla 3D y la portada se deforma con
   matrix3d (homografía) para encajar en ellas. Con el scroll en 0
   la pantalla llena exactamente la ventana y la transformación es
   la identidad: la portada se ve como siempre.
   Se dibuja bajo demanda: solo cuando cambia el scroll, el tamaño
   o la luz, y solo mientras la intro está en pantalla.
   ========================================================= */

import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

const FOV = 35;
const TAN = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
const CUBIERTA = 0.775; // altura de la cara superior del escritorio (m)

const limitar = (x) => Math.min(1, Math.max(0, x));
const lerp = (a, b, t) => a + (b - a) * t;
const suave = (t) => t * t * (3 - 2 * t);

const azar = (semilla) => {
  let s = semilla >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
};

const textura = (w, h, dibujar) => {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  dibujar(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
};

/* ---------- Texturas pintadas ---------- */

// Vista del ventanal: cielo de tarde, el sol sobre el mar Caribe,
// la ciudad baja en el horizonte, uvas de playa y palmeras.
function pintarPaisaje(ctx, w, h) {
  const r = azar(11);
  const hor = h * 0.64;
  let g = ctx.createLinearGradient(0, 0, 0, hor);
  g.addColorStop(0, "#86a9bf");
  g.addColorStop(0.55, "#cbd3c9");
  g.addColorStop(1, "#f4cf9c");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, hor);

  const sx = w * 0.64;
  const sy = hor - h * 0.085;
  g = ctx.createRadialGradient(sx, sy, 0, sx, sy, h * 0.5);
  g.addColorStop(0, "rgba(255, 236, 196, 0.95)");
  g.addColorStop(0.14, "rgba(255, 214, 160, 0.5)");
  g.addColorStop(1, "rgba(255, 200, 140, 0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // Nubes alargadas, más cálidas cerca del sol
  for (let i = 0; i < 30; i++) {
    const x = r() * w;
    const y = h * (0.06 + r() * 0.46);
    const cerca = 1 - Math.min(1, Math.hypot(x - sx, (y - sy) * 2) / (w * 0.55));
    ctx.fillStyle = `rgba(255, ${Math.round(228 + 18 * cerca)}, ${Math.round(204 + 30 * cerca)}, ${(0.2 + 0.35 * r()).toFixed(2)})`;
    ctx.beginPath();
    ctx.ellipse(x, y, w * (0.04 + r() * 0.1), h * (0.006 + r() * 0.013), 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "#fff6e4";
  ctx.beginPath();
  ctx.arc(sx, sy, h * 0.026, 0, Math.PI * 2);
  ctx.fill();

  // Mar con el reflejo del sol
  g = ctx.createLinearGradient(0, hor, 0, h);
  g.addColorStop(0, "#a2b3ad");
  g.addColorStop(0.25, "#6f8f97");
  g.addColorStop(1, "#4d6d77");
  ctx.fillStyle = g;
  ctx.fillRect(0, hor, w, h - hor);
  for (let i = 0; i < 520; i++) {
    const t = Math.pow(r(), 1.7);
    const y = hor + t * (h - hor);
    const x = sx + (r() - 0.5) * w * (0.04 + t * 0.5);
    ctx.fillStyle = `rgba(255, 228, 184, ${((0.55 - t * 0.4) * r()).toFixed(2)})`;
    ctx.fillRect(x, y, w * (0.004 + r() * 0.014) * (1 - t * 0.5) + 2, 1.5 + t * 2.5);
  }

  // Ciudad baja a la derecha, entre bruma
  ctx.fillStyle = "rgba(146, 136, 132, 0.7)";
  ctx.beginPath();
  ctx.moveTo(w * 0.46, hor);
  for (let x = w * 0.46; x <= w; x += w * 0.007) {
    const t = (x - w * 0.46) / (w * 0.54);
    const alto = h * (0.003 + 0.032 * t * t) * (0.35 + r() * 0.9);
    ctx.lineTo(x, hor - alto);
    ctx.lineTo(x + w * 0.007, hor - alto);
  }
  ctx.lineTo(w, hor);
  ctx.closePath();
  ctx.fill();
  g = ctx.createLinearGradient(0, hor - h * 0.045, 0, hor + h * 0.02);
  g.addColorStop(0, "rgba(250, 214, 168, 0)");
  g.addColorStop(0.7, "rgba(250, 214, 168, 0.5)");
  g.addColorStop(1, "rgba(250, 214, 168, 0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, hor - h * 0.045, w, h * 0.065);

  // Uvas de playa en primer plano
  const verdes = ["#33402f", "#3e4c36", "#2a3528", "#4a5a3c", "#56643f"];
  for (let i = 0; i < 190; i++) {
    const x = r() * w;
    const y = h * (0.87 + r() * 0.15);
    const rr = h * (0.022 + r() * 0.05);
    ctx.fillStyle = verdes[i % verdes.length];
    ctx.beginPath();
    ctx.ellipse(x, y, rr * 1.4, rr, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  pintarPalmera(ctx, w * 0.08, h * 1.02, h * 0.8, -0.16, r);
  pintarPalmera(ctx, w * 0.18, h * 1.02, h * 0.6, 0.12, r);
  pintarPalmera(ctx, w * 0.93, h * 1.02, h * 0.72, 0.18, r);
}

function pintarPalmera(ctx, x, y, alto, curva, r) {
  const tx = x + curva * alto;
  const ty = y - alto;
  ctx.lineCap = "round";
  ctx.strokeStyle = "#3b3229";
  ctx.lineWidth = alto * 0.032;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + curva * alto * 0.15, y - alto * 0.6, tx, ty);
  ctx.stroke();
  ctx.strokeStyle = "#2b3627";
  for (let i = 0; i < 10; i++) {
    const ang = -Math.PI / 2 + (i / 9 - 0.5) * Math.PI * 1.75 + (r() - 0.5) * 0.2;
    const largo = alto * (0.3 + r() * 0.12);
    const cx = tx + Math.cos(ang) * largo * 0.5;
    const cy = ty + Math.sin(ang) * largo * 0.5 - largo * 0.1;
    const ex = tx + Math.cos(ang) * largo;
    const ey = ty + Math.sin(ang) * largo * 0.55 + largo * 0.35;
    ctx.lineWidth = alto * 0.008;
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.quadraticCurveTo(cx, cy, ex, ey);
    ctx.stroke();
    ctx.lineWidth = alto * 0.0055;
    for (let k = 1; k <= 15; k++) {
      const t = k / 16;
      const px = (1 - t) * (1 - t) * tx + 2 * (1 - t) * t * cx + t * t * ex;
      const py = (1 - t) * (1 - t) * ty + 2 * (1 - t) * t * cy + t * t * ey;
      const l = largo * 0.17 * (1 - t * 0.6);
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px + Math.cos(ang + 1.3) * l * 0.6, py + l);
      ctx.moveTo(px, py);
      ctx.lineTo(px + Math.cos(ang - 1.3) * l * 0.6, py + l * 0.9);
      ctx.stroke();
    }
  }
}

// Roble: vetas largas a lo largo de la tabla
function pintarRoble(ctx, w, h) {
  const r = azar(5);
  ctx.fillStyle = "#b07c4f";
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 240; i++) {
    const y0 = r() * h;
    ctx.strokeStyle = r() < 0.55 ? `rgba(92, 56, 30, ${(0.06 + r() * 0.14).toFixed(2)})` : `rgba(222, 178, 128, ${(0.06 + r() * 0.12).toFixed(2)})`;
    ctx.lineWidth = 0.6 + r() * 1.8;
    ctx.beginPath();
    ctx.moveTo(0, y0);
    const fase = r() * 6;
    for (let x = 0; x <= w; x += 24) ctx.lineTo(x, y0 + Math.sin(x * 0.008 + fase) * 4 + (r() - 0.5) * 1.2);
    ctx.stroke();
  }
}

/* ---------- Homografía: rectángulo → cuadrilátero ---------- */
// Resuelve los 8 coeficientes que llevan las cuatro esquinas de origen a las
// de destino y los devuelve como matrix3d de CSS (por columnas).
function homografia(origen, destino) {
  const A = [];
  const b = [];
  for (let i = 0; i < 4; i++) {
    const [x, y] = origen[i];
    const [u, v] = destino[i];
    A.push([x, y, 1, 0, 0, 0, -x * u, -y * u]);
    b.push(u);
    A.push([0, 0, 0, x, y, 1, -x * v, -y * v]);
    b.push(v);
  }
  for (let c = 0; c < 8; c++) {
    let pivote = c;
    for (let f = c + 1; f < 8; f++) if (Math.abs(A[f][c]) > Math.abs(A[pivote][c])) pivote = f;
    [A[c], A[pivote]] = [A[pivote], A[c]];
    [b[c], b[pivote]] = [b[pivote], b[c]];
    for (let f = c + 1; f < 8; f++) {
      const k = A[f][c] / A[c][c];
      for (let j = c; j < 8; j++) A[f][j] -= k * A[c][j];
      b[f] -= k * b[c];
    }
  }
  const h = new Array(8);
  for (let f = 7; f >= 0; f--) {
    let s = b[f];
    for (let j = f + 1; j < 8; j++) s -= A[f][j] * h[j];
    h[f] = s / A[f][f];
  }
  const n = (x) => x.toFixed(10);
  return `matrix3d(${n(h[0])},${n(h[3])},0,${n(h[6])},${n(h[1])},${n(h[4])},0,${n(h[7])},0,0,1,0,${n(h[2])},${n(h[5])},0,1)`;
}

/* ---------- Escena ---------- */

function construir(escena, tactil) {
  const robleTex = textura(1024, 512, pintarRoble);
  robleTex.wrapS = robleTex.wrapT = THREE.RepeatWrapping;
  robleTex.repeat.set(2.2, 1);

  const mat = {
    roble: new THREE.MeshStandardMaterial({ map: robleTex, roughness: 0.55 }),
    robleOscuro: new THREE.MeshStandardMaterial({ map: robleTex, color: "#9a8270", roughness: 0.7 }),
    muro: new THREE.MeshStandardMaterial({ color: "#e6dccd", roughness: 0.95 }),
    suelo: new THREE.MeshStandardMaterial({ color: "#8c6b4d", roughness: 0.8 }),
    marco: new THREE.MeshStandardMaterial({ color: "#2a241f", roughness: 0.5 }),
    negro: new THREE.MeshStandardMaterial({ color: "#151311", roughness: 0.32 }),
    plata: new THREE.MeshStandardMaterial({ color: "#d4d0c9", metalness: 0.25, roughness: 0.35 }),
    pantalla: new THREE.MeshBasicMaterial({ color: "#0e0d0c" }),
    claro: new THREE.MeshStandardMaterial({ color: "#efeae2", roughness: 0.6 }),
    ceramica: new THREE.MeshStandardMaterial({ color: "#f4efe7", roughness: 0.4 }),
    barro: new THREE.MeshStandardMaterial({ color: "#a9502b", roughness: 0.85 }),
    piedra: new THREE.MeshStandardMaterial({ color: "#b9b2a6", roughness: 0.9 }),
    salvia: new THREE.MeshStandardMaterial({ color: "#8e9a7e", roughness: 0.85 }),
    papel: new THREE.MeshStandardMaterial({ color: "#faf7f1", roughness: 0.9 }),
  };

  const caja = (w, h, d, material, x, y, z, radio = 0) => {
    const geo = radio > 0 ? new RoundedBoxGeometry(w, h, d, 2, radio) : new THREE.BoxGeometry(w, h, d);
    const m = new THREE.Mesh(geo, material);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  };

  // Paisaje lejos, para que se desplace con la cámara (paralaje real)
  const paisajeTex = textura(2048, 1152, pintarPaisaje);
  const cielo = new THREE.MeshBasicMaterial({ map: paisajeTex, toneMapped: false });
  const paisaje = new THREE.Mesh(new THREE.PlaneGeometry(17, 9.56), cielo);
  paisaje.position.set(0.4, 2.75, -6.5);
  escena.add(paisaje);

  // Ventanal de tres hojas: marco oscuro y fino
  const zv = -0.9;
  escena.add(caja(6.4, 0.05, 0.08, mat.marco, 0, 0.8, zv));
  escena.add(caja(6.4, 0.06, 0.08, mat.marco, 0, 2.8, zv));
  [-1.55, 1.55].forEach((x) => escena.add(caja(0.045, 2.0, 0.07, mat.marco, x, 1.8, zv)));
  [-3.25, 3.25].forEach((x) => escena.add(caja(0.12, 2.1, 0.1, mat.marco, x, 1.8, zv)));
  escena.add(caja(14, 1.4, 0.1, mat.muro, 0, 3.53, zv - 0.02));
  [-5.3, 5.3].forEach((x) => escena.add(caja(4, 3.0, 0.1, mat.muro, x, 1.5, zv - 0.02)));
  escena.add(caja(14, 0.82, 0.1, mat.muro, 0, 0.4, zv - 0.02));

  // Suelo
  const suelo = new THREE.Mesh(new THREE.PlaneGeometry(14, 8), mat.suelo);
  suelo.rotation.x = -Math.PI / 2;
  suelo.position.set(0, 0, 2);
  suelo.receiveShadow = true;
  escena.add(suelo);

  // Escritorio y estantería abierta bajo él
  escena.add(caja(4.6, 0.045, 0.86, mat.roble, 0, CUBIERTA - 0.0225, -0.45, 0.008));
  escena.add(caja(4.5, 0.73, 0.02, mat.robleOscuro, 0, 0.365, -0.86));
  escena.add(caja(4.5, 0.03, 0.8, mat.roble, 0, 0.015, -0.45));
  escena.add(caja(4.5, 0.025, 0.8, mat.roble, 0, 0.37, -0.45));
  [-2.24, -1.12, 0, 1.12, 2.24].forEach((x) => escena.add(caja(0.03, 0.73, 0.8, mat.roble, x, 0.365, -0.45)));

  // Libros y muestras en la estantería: un InstancedMesh con color por instancia
  const r = azar(23);
  const colores = ["#e6dccd", "#d8c7b0", "#a9502b", "#2f3a2e", "#8e9a7e", "#c8913a", "#f8f4ee", "#1e1b18", "#b9b2a6", "#5c534a"];
  const libros = [];
  const fila = (x0, x1, y0, desdeDerecha) => {
    let x = desdeDerecha ? x1 : x0;
    const limite = (x1 - x0) * (0.45 + r() * 0.3);
    let usado = 0;
    while (usado < limite) {
      const ancho = 0.022 + r() * 0.03;
      const alto = 0.2 + r() * 0.1;
      const fondo = 0.17 + r() * 0.06;
      libros.push({ x: desdeDerecha ? x - ancho / 2 : x + ancho / 2, y: y0 + alto / 2, z: -0.72 + fondo / 2, w: ancho * 0.96, h: alto, d: fondo, c: colores[Math.floor(r() * colores.length)] });
      x += desdeDerecha ? -ancho : ancho;
      usado += ancho;
    }
    // Un par de libros tumbados al final de la fila
    for (let k = 0; k < 2; k++) {
      const alto = 0.03;
      libros.push({ x: desdeDerecha ? x - 0.14 : x + 0.14, y: y0 + alto / 2 + k * alto, z: -0.62, w: 0.22, h: alto * 0.95, d: 0.16, c: colores[Math.floor(r() * colores.length)] });
    }
  };
  [[-2.22, -1.14], [-1.1, -0.02], [0.02, 1.1], [1.14, 2.22]].forEach(([a, b], i) => {
    fila(a + 0.02, b - 0.02, 0.03, i % 2 === 0);
    fila(a + 0.02, b - 0.02, 0.3825, i % 2 === 1);
  });
  const geoLibro = new THREE.BoxGeometry(1, 1, 1);
  const estante = new THREE.InstancedMesh(geoLibro, new THREE.MeshStandardMaterial({ roughness: 0.8 }), libros.length);
  const m4 = new THREE.Matrix4();
  libros.forEach((l, i) => {
    m4.makeScale(l.w, l.h, l.d).setPosition(l.x, l.y, l.z);
    estante.setMatrixAt(i, m4);
    estante.setColorAt(i, new THREE.Color(l.c));
  });
  estante.castShadow = estante.receiveShadow = true;
  escena.add(estante);

  // Luces: sol de tarde que entra por el ventanal, cielo y un relleno frontal
  const sol = new THREE.DirectionalLight("#ffe2b8", 3.2);
  sol.position.set(-2.6, 3.4, -4.2);
  sol.target.position.set(0, CUBIERTA, -0.2);
  sol.castShadow = true;
  const tam = tactil ? 1024 : 2048;
  sol.shadow.mapSize.set(tam, tam);
  Object.assign(sol.shadow.camera, { left: -2.6, right: 2.6, top: 2, bottom: -2, near: 1, far: 12 });
  sol.shadow.bias = -0.0004;
  sol.shadow.normalBias = 0.02;
  escena.add(sol, sol.target);
  const hemi = new THREE.HemisphereLight("#fff3e0", "#b9a58c", 1.3);
  escena.add(hemi);
  const relleno = new THREE.DirectionalLight("#fff8ee", 0.7);
  relleno.position.set(0.8, 2.2, 3.5);
  escena.add(relleno);

  return { mat, caja, sol, hemi, cielo };
}

// Dispositivo y objetos de la mesa. Se rehace si la pantalla cambia de forma.
function construirDispositivo({ mat, caja }, vertical, aspecto) {
  const grupo = new THREE.Group();
  let sh, sw, zs, yc;
  if (!vertical) {
    sh = Math.min(0.36, 0.86 / aspecto);
    sw = sh * aspecto;
    zs = -0.42;
    yc = CUBIERTA + 0.13 + sh / 2;
    grupo.add(caja(sw + 0.026, sh + 0.026, 0.022, mat.negro, 0, yc, zs - 0.0115, 0.008));
    const cuello = caja(0.1, 0.2, 0.014, mat.plata, 0, CUBIERTA + 0.12, zs - 0.07, 0.004);
    cuello.rotation.x = -0.18;
    grupo.add(cuello);
    grupo.add(caja(0.08, sh * 0.5, 0.012, mat.plata, 0, yc - sh * 0.05, zs - 0.03, 0.004));
    grupo.add(caja(0.24, 0.012, 0.19, mat.plata, 0, CUBIERTA + 0.006, zs - 0.08, 0.005));
    // Teclado, ratón y lámina de muestras
    grupo.add(caja(0.42, 0.012, 0.13, mat.claro, -0.02, CUBIERTA + 0.006, -0.13, 0.005));
    const raton = new THREE.Mesh(new THREE.SphereGeometry(0.03, 20, 12), mat.claro);
    raton.scale.set(1, 0.38, 1.7);
    raton.position.set(0.33, CUBIERTA + 0.008, -0.1);
    raton.castShadow = true;
    grupo.add(raton);
  } else {
    sh = 0.2;
    sw = sh * aspecto;
    zs = -0.3;
    yc = CUBIERTA + 0.06 + sh / 2;
    grupo.add(caja(sw + 0.014, sh + 0.014, 0.009, mat.negro, 0, yc, zs - 0.0048, 0.01));
    // Soporte de roble con ranura
    grupo.add(caja(sw + 0.06, 0.04, 0.08, mat.roble, 0, CUBIERTA + 0.02, zs - 0.01, 0.008));
    grupo.add(caja(0.012, sh * 0.6, 0.03, mat.roble, 0, CUBIERTA + sh * 0.3, zs - 0.03, 0.004));
  }

  // Pantalla: negra; encima va la portada en HTML
  const pantalla = new THREE.Mesh(new THREE.PlaneGeometry(sw, sh), mat.pantalla);
  pantalla.position.set(0, yc, zs + 0.0006);
  grupo.add(pantalla);

  // Objetos a los lados, separados según el ancho del dispositivo
  const izq = -(sw / 2 + (vertical ? 0.12 : 0.22));
  const der = sw / 2 + (vertical ? 0.12 : 0.24);
  const taza = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.034, 0.09, 28), mat.ceramica);
  taza.position.set(izq, CUBIERTA + 0.045, -0.2);
  taza.castShadow = true;
  grupo.add(taza);
  [[mat.barro, 0.1], [mat.salvia, -0.06], [mat.papel, 0.04]].forEach(([m, giro], i) => {
    const libro = caja(0.24, 0.028, 0.17, m, izq - 0.22, CUBIERTA + 0.014 + i * 0.028, -0.5, 0.004);
    libro.rotation.y = giro;
    grupo.add(libro);
  });
  // Abanico de muestras de material
  [[mat.roble, -0.25], [mat.piedra, 0.05], [mat.barro, 0.32]].forEach(([m, giro], i) => {
    const muestra = caja(0.13, 0.012, 0.09, m, der + i * 0.02, CUBIERTA + 0.006 + i * 0.012, -0.18, 0.003);
    muestra.rotation.y = giro;
    grupo.add(muestra);
  });
  // Jarrón de barro con ramas secas
  const perfil = [[0, 0], [0.045, 0], [0.06, 0.05], [0.05, 0.13], [0.026, 0.19], [0.03, 0.21]].map(([x, y]) => new THREE.Vector2(x, y));
  const jarron = new THREE.Mesh(new THREE.LatheGeometry(perfil, 28), mat.barro);
  jarron.position.set(der + 0.34, CUBIERTA, -0.58);
  jarron.castShadow = true;
  grupo.add(jarron);
  const rama = new THREE.MeshStandardMaterial({ color: "#5a4634", roughness: 0.9 });
  [[0.18, 0.5], [-0.25, 0.42], [0.05, 0.55]].forEach(([giro, largo]) => {
    const r = new THREE.Mesh(new THREE.CylinderGeometry(0.0025, 0.004, largo, 6), rama);
    r.position.set(der + 0.34 + Math.sin(giro) * largo * 0.5, CUBIERTA + 0.2 + Math.cos(giro) * largo * 0.5, -0.58);
    r.rotation.z = -giro;
    r.castShadow = true;
    grupo.add(r);
  });

  grupo.traverse((o) => {
    if (o.isMesh && o !== pantalla) o.castShadow = true;
  });
  return { grupo, sw, sh, zs, yc };
}

/* ---------- Arranque ---------- */

export function iniciar({ intro, escenario, portada, lienzo, medida }) {
  const tactil = window.matchMedia("(pointer: coarse)").matches;
  const renderer = new THREE.WebGLRenderer({ canvas: lienzo, antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, tactil ? 1.5 : 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false;

  const escena = new THREE.Scene();
  escena.background = new THREE.Color("#e6dccd");
  const camara = new THREE.PerspectiveCamera(FOV, 1, 0.01, 40);
  const base = construir(escena, tactil);

  let disp = null;
  let forma = "";
  let medidas = { W: 1, svh: 1, lvh: 1, alto: 1, recorrido: 1 };
  let encuadre = null;
  let visible = true;
  let pendiente = false;
  let ultimo = "";

  const medir = () => {
    const W = escenario.clientWidth;
    const svh = medida.clientHeight || window.innerHeight;
    const lvh = lienzo.clientHeight || svh;
    const alto = portada.offsetHeight;
    const recorrido = Math.max(1, intro.offsetHeight - alto);
    // Pestaña oculta o panel plegado: sin tamaño no hay nada que encajar
    if (W < 2 || svh < 2 || lvh < 2) return;
    medidas = { W, svh, lvh, alto, recorrido };

    const aspecto = W / svh;
    const vertical = aspecto < 0.9;
    const clave = `${vertical}-${aspecto.toFixed(3)}`;
    if (clave !== forma) {
      forma = clave;
      if (disp) {
        escena.remove(disp.grupo);
        disp.grupo.traverse((o) => o.geometry?.dispose());
      }
      disp = construirDispositivo(base, vertical, aspecto);
      escena.add(disp.grupo);
      renderer.shadowMap.needsUpdate = true;

      // Inicio: la pantalla llena la ventana. Final: el dispositivo ocupa
      // una quinta parte del alto, algo por encima del centro.
      const d0 = disp.sh / 2 / TAN;
      const visto = disp.sh / (vertical ? 0.24 : 0.2);
      encuadre = {
        d0,
        d1: visto / 2 / TAN,
        y0: disp.yc,
        y1: disp.yc - visto * (vertical ? 0.1 : 0.16),
        inclinacion: THREE.MathUtils.degToRad(vertical ? 5 : 7),
      };
    }

    renderer.setSize(W, lvh, false);
    camara.aspect = aspecto;
    // El lienzo es tan alto como la pantalla grande del móvil (lvh); el encuadre
    // se calcula para la pequeña (svh) y lo que sobra queda debajo.
    camara.setViewOffset(W, svh, 0, 0, W, lvh);
    camara.updateProjectionMatrix();
    ultimo = "";
  };

  const esquinas = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];

  const dibujar = () => {
    pendiente = false;
    if (!disp) return;
    const { W, svh, lvh, alto, recorrido } = medidas;
    const desfase = alto - svh;
    const avance = limitar((-intro.getBoundingClientRect().top - desfase) / recorrido);
    const clave = `${avance.toFixed(4)}-${W}-${lvh}`;
    if (clave === ultimo) return;
    ultimo = clave;

    // Un respiro al principio y al final; en medio, la cámara se aleja
    const e = suave(limitar((avance - 0.04) / 0.82));
    const { d0, d1, y0, y1, inclinacion } = encuadre;
    const d = d0 * Math.pow(d1 / d0, e);
    const a = inclinacion * e;
    const objetivo = new THREE.Vector3(0, lerp(y0, y1, e), disp.zs);
    camara.position.set(0, objetivo.y + Math.sin(a) * d, disp.zs + Math.cos(a) * d);
    camara.lookAt(objetivo);
    camara.updateMatrixWorld();
    renderer.render(escena, camara);

    if (avance <= 0.0005) {
      portada.style.transform = "";
      portada.style.clipPath = "";
      return;
    }
    const { sw, sh, zs, yc } = disp;
    esquinas[0].set(-sw / 2, yc + sh / 2, zs);
    esquinas[1].set(sw / 2, yc + sh / 2, zs);
    esquinas[2].set(sw / 2, yc - sh / 2, zs);
    esquinas[3].set(-sw / 2, yc - sh / 2, zs);
    const destino = esquinas.map((v) => {
      const p = v.clone().project(camara);
      return [((p.x + 1) / 2) * W, ((1 - p.y) / 2) * lvh + desfase];
    });
    const origen = [[0, desfase], [W, desfase], [W, alto], [0, alto]];
    portada.style.transform = homografia(origen, destino);
    portada.style.clipPath = desfase > 0 ? `inset(${desfase}px 0 0 0)` : "";
  };

  const pedir = () => {
    if (!pendiente && visible) {
      pendiente = true;
      requestAnimationFrame(dibujar);
    }
  };

  // Luz de día o de tarde (el cordón de la lámpara)
  const aplicarLuz = () => {
    const tarde = document.documentElement.dataset.luz === "tarde";
    base.sol.color.set(tarde ? "#ffb877" : "#ffe2b8");
    base.sol.intensity = tarde ? 2.7 : 3.2;
    base.hemi.color.set(tarde ? "#ffdcb4" : "#fff3e0");
    base.hemi.intensity = tarde ? 1.05 : 1.3;
    base.cielo.color.set(tarde ? "#ffd6b0" : "#ffffff");
    ultimo = "";
    pedir();
  };
  new MutationObserver(aplicarLuz).observe(document.documentElement, { attributes: true, attributeFilter: ["data-luz"] });

  medir();
  aplicarLuz();
  dibujar();
  intro.classList.add("lista");

  new IntersectionObserver((entradas) => {
    visible = entradas[0].isIntersecting;
    if (visible) pedir();
  }).observe(intro);
  window.addEventListener("scroll", pedir, { passive: true });
  if ("ResizeObserver" in window) {
    const vigiaTamano = new ResizeObserver(() => { medir(); pedir(); });
    [escenario, lienzo, medida].forEach((el) => vigiaTamano.observe(el));
  } else {
    window.addEventListener("resize", () => { medir(); pedir(); });
  }
}
