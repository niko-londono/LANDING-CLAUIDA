/* =========================================================
   Inmersión · ciudad
   Genera la cuadrícula a partir de proyectos.json.
   - Entorno (edificios genéricos, aceras, árboles, farolas):
     InstancedMesh → una llamada de dibujo por tipo de pieza,
     sean 40 o 400 piezas.
   - Proyectos: una cuadra cada uno, con un edificio de bajo
     polígono según su «forma», líneas de luz en las aristas y
     un marcador flotante. Son pocos, así que van como mallas.
   - Cada proyecto tiene una caja invisible para el raycasting:
     se prueba contra 6 cajas, no contra cientos de triángulos.
   ========================================================= */
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { PALETA, esTactil } from "./escena.js";

export const BLOQUE = 12;          // lado de una cuadra
export const CALLE = 5;            // ancho de calle
export const PASO = BLOQUE + CALLE; // de centro a centro
const RADIO_CIUDAD = 3;            // cuadras de proyectos: de -3 a 3
const RADIO_ENTORNO = 6;           // el entorno sigue hasta el horizonte

export const LIMITE = (RADIO_CIUDAD + 0.5) * PASO; // hasta dónde puede ir la cámara

// Aleatorio con semilla: la ciudad es siempre la misma
function azar(semilla) {
  let a = semilla >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const caja = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0); // base en y = 0

const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.92, metalness: 0, ...extra });
const MATERIALES = {
  muro: mat(PALETA.huesoClaro),
  techo: mat(PALETA.lino),
  madera: mat(PALETA.roble, { roughness: 0.8 }),
  vidrio: mat(PALETA.vidrio, { roughness: 0.25, metalness: 0.1 }),
  agua: mat(PALETA.agua, { roughness: 0.15 }),
  panel: mat(0x3a4140, { roughness: 0.4, metalness: 0.3 }),
  piedra: mat(PALETA.piedra),
  tejado: mat(PALETA.terracota, { roughness: 0.85 }),
};

/* ---------- Piezas sueltas para los edificios de proyecto ---------- */
function bloque(material, ancho, alto, fondo, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(caja, material);
  m.scale.set(ancho, alto, fondo);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}
// Tejado a dos aguas: prisma triangular (cilindro de 3 lados)
function tejado(ancho, fondo, alto, x, y, z) {
  const g = new THREE.CylinderGeometry(1, 1, 1, 3, 1);
  g.rotateZ(Math.PI / 2);
  g.rotateX(Math.PI / 2);
  const m = new THREE.Mesh(g, MATERIALES.tejado);
  m.scale.set(fondo / 2, alto, ancho / 2);
  m.rotation.y = Math.PI / 2;
  m.position.set(x, y + alto * 0.5, z);
  m.castShadow = true;
  return m;
}

const FORMAS = {
  // Casa de una planta: volumen blanco, volumen de roble, losa que vuela
  casa(g) {
    g.add(bloque(MATERIALES.muro, 6.5, 3, 5, -1.2, 0, -0.5));
    g.add(bloque(MATERIALES.madera, 2.6, 3.2, 5, 3.4, 0, -0.5));
    g.add(bloque(MATERIALES.techo, 10.4, 0.35, 6.4, 0.5, 3.2, -0.5));
    g.add(bloque(MATERIALES.vidrio, 5, 2.1, 0.12, -1.2, 0.3, 2.05));
    return 3.6;
  },
  // Casa campestre en L con piscina
  "casa-l"(g) {
    g.add(bloque(MATERIALES.muro, 8, 3, 3.6, -1, 0, -2.6));
    g.add(bloque(MATERIALES.muro, 3.6, 3, 5, -3.2, 0, 1.6));
    g.add(bloque(MATERIALES.techo, 8.6, 0.3, 4.2, -1, 3, -2.6));
    g.add(bloque(MATERIALES.techo, 4.2, 0.3, 5.4, -3.2, 3, 1.6));
    g.add(bloque(MATERIALES.agua, 4.2, 0.12, 2.6, 1.9, 0, 2));
    g.add(bloque(MATERIALES.madera, 2.4, 0.9, 1.6, 3.4, 0, -0.6)); // BBQ
    return 3.4;
  },
  // Oficina: torre con bandas horizontales
  oficina(g) {
    g.add(bloque(MATERIALES.vidrio, 5.4, 10, 5.4, 0, 0, 0));
    for (let i = 1; i <= 4; i++) g.add(bloque(MATERIALES.muro, 6, 0.4, 6, 0, i * 2.5 - 0.4, 0));
    g.add(bloque(MATERIALES.madera, 2.2, 2.4, 0.3, 0, 0, 3)); // acceso
    return 10.2;
  },
  // Pabellón de cafetería con techo de bambú y árboles solares
  pabellon(g) {
    g.add(bloque(MATERIALES.vidrio, 8, 2.4, 5, -0.5, 0, -1.5));
    g.add(bloque(MATERIALES.madera, 10, 0.35, 7, -0.5, 2.4, -1.5));
    for (const [x, z] of [[-3.5, 3.6], [0.2, 3.9], [3.8, 3.2]]) {
      g.add(bloque(MATERIALES.piedra, 0.3, 3.2, 0.3, x, 0, z));
      const panel = bloque(MATERIALES.panel, 2.2, 0.12, 2.2, x, 3.2, z);
      panel.rotation.y = 0.5;
      g.add(panel);
    }
    return 3.4;
  },
  // Dos viviendas familiares a dos aguas
  "dos-casas"(g) {
    for (const [x, z] of [[-2.6, -1.4], [2.8, 1.6]]) {
      g.add(bloque(MATERIALES.muro, 4, 2.8, 4.4, x, 0, z));
      g.add(tejado(4.4, 4.8, 1.6, x, 2.8, z));
      g.add(bloque(MATERIALES.madera, 1, 2, 0.15, x, 0, z + 2.25));
    }
    return 4.4;
  },
  // Exterior campestre: piscina, pérgola y área de BBQ
  piscina(g) {
    g.add(bloque(MATERIALES.muro, 6, 2.8, 3.4, -1.5, 0, -3.2));
    g.add(bloque(MATERIALES.techo, 6.6, 0.3, 4, -1.5, 2.8, -3.2));
    g.add(bloque(MATERIALES.agua, 6.4, 0.12, 3.2, -0.6, 0, 1.4));
    for (const [x, z] of [[2.6, -1.2], [5, -1.2], [2.6, 2.4], [5, 2.4]]) g.add(bloque(MATERIALES.madera, 0.25, 2.6, 0.25, x, 0, z));
    for (let i = 0; i < 5; i++) g.add(bloque(MATERIALES.madera, 2.9, 0.15, 0.25, 3.8, 2.6, -1.2 + i * 0.9));
    g.add(bloque(MATERIALES.piedra, 1.8, 0.9, 1, 3.8, 0, 0.6)); // BBQ
    return 3;
  },
};

/* ---------- Proyecto: zócalo + edificio + líneas de luz + marcador ---------- */
function crearProyecto(datos) {
  const [col, fila] = datos.celda;
  const centro = new THREE.Vector3(col * PASO, 0, fila * PASO);
  const esPresentacion = datos.categoria === "presentacion";
  const colorLuz = esPresentacion ? PALETA.ocre : PALETA.terracota;

  const grupo = new THREE.Group();
  grupo.position.copy(centro);
  grupo.name = datos.id;

  // Todo lo que se eleva al pasar el ratón vive en «elevable»
  const elevable = new THREE.Group();
  grupo.add(elevable);

  const zocalo = bloque(MATERIALES.muro, BLOQUE - 0.4, 0.9, BLOQUE - 0.4, 0, 0, 0);
  elevable.add(zocalo);

  const edificio = new THREE.Group();
  edificio.position.y = 0.9;
  const alto = (FORMAS[datos.forma] || FORMAS.casa)(edificio) + 0.9;
  elevable.add(edificio);

  // Líneas de luz: las aristas de todas las piezas fundidas en una sola
  // geometría → una llamada de dibujo por proyecto en lugar de una por pieza
  const bordes = new THREE.LineBasicMaterial({ color: colorLuz, transparent: true, opacity: 0.45 });
  elevable.updateMatrixWorld(true);
  const inversa = elevable.matrixWorld.clone().invert();
  const aristas = [];
  elevable.traverse((o) => {
    if (!o.isMesh) return;
    const g = new THREE.EdgesGeometry(o.geometry, 30);
    g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inversa, o.matrixWorld));
    aristas.push(g);
  });
  elevable.add(new THREE.LineSegments(mergeGeometries(aristas), bordes));

  // Marcador flotante y su hilo de luz: se ven desde la vista general
  const marcador = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.8, 0),
    new THREE.MeshBasicMaterial({ color: colorLuz })
  );
  marcador.position.y = alto + 3.2;
  elevable.add(marcador);
  const hilo = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, alto + 0.3, 0), new THREE.Vector3(0, alto + 2.4, 0)]),
    bordes
  );
  elevable.add(hilo);

  // Caja invisible para el raycasting: cubre la cuadra entera
  const hit = new THREE.Mesh(
    new THREE.BoxGeometry(BLOQUE, alto + 4.5, BLOQUE).translate(0, (alto + 4.5) / 2, 0),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  hit.userData.id = datos.id;
  grupo.add(hit);

  return { datos, grupo, elevable, hit, bordes, centro, alto, elevacion: 0, objetivo: 0 };
}

/* ---------- Entorno instanciado ----------
   Cada tipo de pieza es UN InstancedMesh (una llamada de dibujo), da igual
   cuántas haya: aceras, edificios, árboles (cono y redondo), troncos,
   farolas, cebras, coches (carrocería + cabina), personas (cuerpo +
   cabeza), bancos y flores. Todo es estático: no cuesta nada por fotograma
   salvo dibujarlo, y el frustum culling descarta lo que queda fuera. */

// Crea un InstancedMesh a partir de una lista de piezas {x,y,z,sx,sy,sz,giro,color}
function instancias(escena, geometria, material, piezas, { sombra = false, recibe = false } = {}) {
  if (!piezas.length) return null;
  const m = new THREE.InstancedMesh(geometria, material, piezas.length);
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const p = new THREE.Vector3();
  const s = new THREE.Vector3();
  const c = new THREE.Color();
  piezas.forEach((o, i) => {
    q.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, o.giro || 0);
    m4.compose(p.set(o.x, o.y || 0, o.z), q, s.set(o.sx ?? 1, o.sy ?? 1, o.sz ?? 1));
    m.setMatrixAt(i, m4);
    if (o.color !== undefined) m.setColorAt(i, c.set(o.color));
  });
  m.castShadow = sombra;
  m.receiveShadow = recibe;
  m.computeBoundingSphere();
  escena.add(m);
  return m;
}

const ACERA = 0.4; // altura de la losa de cada cuadra

export function crearCiudad(escena, lista) {
  const rnd = azar(20261109);
  const entre = (a, b) => a + rnd() * (b - a);
  const elegir = (arr) => arr[Math.floor(rnd() * arr.length)];
  const ocupadas = new Set(lista.map((p) => p.celda.join(",")));
  const proyectoEn = (c, f) => ocupadas.has(`${c},${f}`);

  // Suelo: asfalto cálido
  const suelo = new THREE.Mesh(new THREE.PlaneGeometry(700, 700), mat(PALETA.asfalto));
  suelo.rotation.x = -Math.PI / 2;
  suelo.receiveShadow = true;
  escena.add(suelo);

  // Tipo de cada cuadra: ciudad, parque o bosque (cuña a la derecha de la vista general)
  const celdas = [];
  for (let c = -RADIO_ENTORNO; c <= RADIO_ENTORNO; c++) {
    for (let f = -RADIO_ENTORNO; f <= RADIO_ENTORNO; f++) {
      if (proyectoEn(c, f)) continue;
      const lejos = Math.max(Math.abs(c), Math.abs(f));
      let tipo = "ciudad";
      if (c - f >= 6 && lejos > RADIO_CIUDAD) tipo = "bosque";
      else if (lejos > 0 && rnd() < 0.15) tipo = "parque";
      celdas.push({ c, f, x: c * PASO, z: f * PASO, tipo, lejos });
    }
  }

  /* ---- Aceras ---- */
  instancias(escena, caja, mat(0xffffff), celdas.map((k) => ({
    x: k.x, z: k.z, sx: BLOQUE, sy: ACERA, sz: BLOQUE,
    color: k.tipo === "ciudad" ? PALETA.lino : k.tipo === "parque" ? 0xbfc8a6 : 0xa9b58e,
  })), { recibe: true });

  /* ---- Edificios genéricos ---- */
  const tonos = [0xf3ede4, 0xebe3d6, 0xe2d6c5, 0xd8c9b4, 0xcfc4b5, 0xc4b6a2];
  const edificios = [];
  for (const k of celdas) {
    if (k.tipo !== "ciudad") continue;
    // Junto a un proyecto los edificios se quedan bajos: el proyecto manda
    const vecino = lista.some(({ celda: [pc, pf] }) => Math.abs(pc - k.c) <= 1 && Math.abs(pf - k.f) <= 1);
    const factor = vecino ? 0.45 : k.lejos <= RADIO_CIUDAD ? 0.85 : 0.75;
    for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      if (rnd() < 0.18) continue; // algunos solares vacíos
      edificios.push({
        x: k.x + dx * 2.9, y: ACERA, z: k.z + dz * 2.9,
        sx: entre(3.4, 4.8), sy: (1.8 + Math.pow(rnd(), 2.2) * 9) * factor, sz: entre(3.4, 4.8),
        color: elegir(tonos),
      });
    }
  }
  instancias(escena, caja, mat(0xffffff), edificios, { sombra: true, recibe: true });

  /* ---- Árboles: conos (coníferas) y redondos (frondosos) ---- */
  const conos = [], redondos = [];
  const verdesCono = [0x6f7d5f, 0x7f8c70, 0x5f6e52, PALETA.salvia];
  const verdesRedondo = [0x8e9a7e, 0x9aa58a, 0x7d8f6a, 0xa4ad86];
  const arbol = (x, z, s, redondo) => (redondo ? redondos : conos).push({
    x, y: ACERA, z, sx: s, sy: s, sz: s, giro: rnd() * Math.PI,
    color: elegir(redondo ? verdesRedondo : verdesCono),
  });
  const bancos = [], flores = [];
  const tonosFlor = [0xd98ba0, 0xc6587a, 0xe8a87c, 0xf3ede4, 0xe2b6c8];
  for (const k of celdas) {
    if (k.tipo === "parque") {
      const n = 8 + Math.floor(rnd() * 6);
      for (let i = 0; i < n; i++) arbol(k.x + entre(-5, 5), k.z + entre(-5, 5), entre(0.6, 1.1), rnd() < 0.5);
      for (let i = 0; i < 2; i++) {
        const lado = rnd() < 0.5;
        bancos.push({ x: k.x + (lado ? entre(-3, 3) : 3.6), y: ACERA, z: k.z + (lado ? 3.6 : entre(-3, 3)), sx: 1.3, sy: 0.35, sz: 0.42, giro: lado ? 0 : Math.PI / 2, color: PALETA.roble });
      }
      for (let i = 0; i < 14; i++) flores.push({ x: k.x + entre(-5.3, 5.3), y: ACERA, z: k.z + entre(-5.3, 5.3), sx: entre(0.7, 1.2), sy: entre(0.7, 1.2), sz: entre(0.7, 1.2), color: elegir(tonosFlor) });
    } else if (k.tipo === "bosque") {
      // En táctil, bosque menos denso: es lo que más triángulos suma
      const n = esTactil ? 12 + Math.floor(rnd() * 5) : 26 + Math.floor(rnd() * 10);
      for (let i = 0; i < n; i++) arbol(k.x + entre(-5.6, 5.6), k.z + entre(-5.6, 5.6), entre(0.8, 1.6), rnd() < 0.35);
      for (let i = 0; i < 8; i++) flores.push({ x: k.x + entre(-5.6, 5.6), y: ACERA, z: k.z + entre(-5.6, 5.6), sx: 1.3, sy: 1, sz: 1.3, color: elegir(tonosFlor) });
    } else if (k.tipo === "ciudad" && k.lejos <= RADIO_CIUDAD + 1) {
      // Arbolado de alineación en las esquinas de la acera
      for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) if (rnd() < 0.55) arbol(k.x + dx * 5.55, k.z + dz * 5.55, entre(0.45, 0.6), true);
    }
  }
  // Árboles alrededor de los proyectos, fuera del zócalo, para enmarcarlos
  for (const { celda: [c, f] } of lista) {
    for (const [dx, dz] of [[-1, 0.45], [1, -0.45], [0.45, 1], [-0.45, -1]]) arbol(c * PASO + dx * 6.6, f * PASO + dz * 6.6, 0.42, true);
  }
  const copaCono = new THREE.ConeGeometry(1, 2.8, 6).translate(0, 2.2, 0);
  const copaRedonda = new THREE.IcosahedronGeometry(1.15, 0).translate(0, 2.3, 0);
  const tronco = new THREE.CylinderGeometry(0.14, 0.18, 1.2, 5).translate(0, 0.6, 0);
  const matCopa = mat(0xffffff, { flatShading: true });
  instancias(escena, copaCono, matCopa, conos, { sombra: true });
  instancias(escena, copaRedonda, matCopa, redondos, { sombra: true });
  instancias(escena, tronco, MATERIALES.madera, [...conos, ...redondos].map((a) => ({ ...a, color: undefined })));
  instancias(escena, caja, mat(0xffffff), bancos, { sombra: true });
  instancias(escena, new THREE.IcosahedronGeometry(0.28, 0).translate(0, 0.25, 0), mat(0xffffff, { flatShading: true }), flores);

  /* ---- Cruces: farolas y pasos de cebra ---- */
  const farolas = [], cebras = [];
  for (let c = -RADIO_ENTORNO; c < RADIO_ENTORNO; c++) {
    for (let f = -RADIO_ENTORNO; f < RADIO_ENTORNO; f++) {
      const ix = (c + 0.5) * PASO, iz = (f + 0.5) * PASO;
      farolas.push({ x: ix + 2.25, z: iz + 2.25 }, { x: ix - 2.25, z: iz - 2.25 });
      if (Math.max(Math.abs(c + 0.5), Math.abs(f + 0.5)) > RADIO_CIUDAD + 1.5) continue;
      // Cuatro pasos de cebra por cruce, 5 franjas cada uno
      const d = CALLE / 2 + 0.75;
      for (let k = -2; k <= 2; k++) {
        const o = k * 0.85;
        cebras.push({ x: ix + d, y: 0.02, z: iz + o, sx: 1.1, sy: 0.02, sz: 0.42 });
        cebras.push({ x: ix - d, y: 0.02, z: iz + o, sx: 1.1, sy: 0.02, sz: 0.42 });
        cebras.push({ x: ix + o, y: 0.02, z: iz + d, sx: 0.42, sy: 0.02, sz: 1.1 });
        cebras.push({ x: ix + o, y: 0.02, z: iz - d, sx: 0.42, sy: 0.02, sz: 1.1 });
      }
    }
  }
  instancias(escena, new THREE.CylinderGeometry(0.08, 0.08, 3.2, 5).translate(0, 1.6, 0), MATERIALES.piedra, farolas);
  instancias(escena, new THREE.BoxGeometry(0.4, 0.16, 0.4).translate(0, 3.25, 0), new THREE.MeshBasicMaterial({ color: PALETA.ocre }), farolas);
  instancias(escena, caja, new THREE.MeshBasicMaterial({ color: 0xece6dc }), cebras);

  /* ---- Marcas viales: línea discontinua por el eje de cada calle ---- */
  const puntos = [];
  for (let i = -RADIO_ENTORNO; i < RADIO_ENTORNO; i++) {
    const e = (i + 0.5) * PASO;
    // Por tramos entre cruces, para que la línea no atraviese las cebras
    for (let j = -RADIO_ENTORNO; j <= RADIO_ENTORNO; j++) {
      const a = j * PASO - BLOQUE / 2 + 0.6, b = j * PASO + BLOQUE / 2 - 0.6;
      puntos.push(new THREE.Vector3(e, 0.03, a), new THREE.Vector3(e, 0.03, b));
      puntos.push(new THREE.Vector3(a, 0.03, e), new THREE.Vector3(b, 0.03, e));
    }
  }
  const marcas = new THREE.LineSegments(
    new THREE.BufferGeometry().setFromPoints(puntos),
    new THREE.LineDashedMaterial({ color: 0xf2ece3, dashSize: 1.1, gapSize: 1.1, transparent: true, opacity: 0.75 })
  );
  marcas.computeLineDistances();
  escena.add(marcas);

  /* ---- Coches en los dos carriles (estáticos) ---- */
  const coloresCoche = [PALETA.terracota, PALETA.oliva, 0xf3ede4, 0x3a3631, PALETA.ocre, 0x6f7f8c, 0xb9b2a6, 0x8a2f2a];
  const carrocerias = [], cabinas = [];
  const coche = (x, z, alongX) => {
    const color = elegir(coloresCoche);
    const giro = alongX ? Math.PI / 2 : 0;
    carrocerias.push({ x, y: 0.12, z, sx: 0.95, sy: 0.55, sz: 2.1, giro, color });
    cabinas.push({ x, y: 0.67, z, sx: 0.82, sy: 0.42, sz: 1.1, giro });
  };
  for (let i = -RADIO_ENTORNO; i < RADIO_ENTORNO; i++) {
    const e = (i + 0.5) * PASO;
    for (let j = -RADIO_ENTORNO + 1; j < RADIO_ENTORNO; j++) {
      if (Math.max(Math.abs(i + 0.5), Math.abs(j)) > RADIO_CIUDAD + 2) continue;
      const centro = j * PASO;
      for (const carril of [-1.15, 1.15]) {
        if (rnd() < 0.42) coche(e + carril, centro + entre(-4.2, 4.2), false); // calle a lo largo de z
        if (rnd() < 0.42) coche(centro + entre(-4.2, 4.2), e + carril, true);  // calle a lo largo de x
      }
    }
  }
  instancias(escena, caja, mat(0xffffff, { roughness: 0.55 }), carrocerias, { sombra: true });
  instancias(escena, caja, mat(0x3d4448, { roughness: 0.3, metalness: 0.2 }), cabinas);

  /* ---- Personas en aceras y parques: cuerpo + cabeza ---- */
  const ropa = [PALETA.terracota, PALETA.oliva, 0xf3ede4, 0x3a3631, PALETA.ocre, 0x6f7f8c, 0x9a4f6a, 0xd8c7b0];
  const piel = [0xe9c4a4, 0xc99370, 0x9a6544, 0x6e4630, 0xf2d6bd];
  const cuerpos = [], cabezas = [];
  const persona = (x, z) => {
    cuerpos.push({ x, y: ACERA, z, color: elegir(ropa) });
    cabezas.push({ x, y: ACERA, z, color: elegir(piel) });
  };
  for (const k of celdas) {
    if (k.lejos > RADIO_CIUDAD + 1 || k.tipo === "bosque") continue;
    const n = k.tipo === "parque" ? 6 : 3 + Math.floor(rnd() * 4);
    for (let i = 0; i < n; i++) {
      if (k.tipo === "parque") { persona(k.x + entre(-4.5, 4.5), k.z + entre(-4.5, 4.5)); continue; }
      // En el borde de la acera, por fuera de las parcelas
      const t = entre(-5.6, 5.6), lado = Math.floor(rnd() * 4);
      const b = 5.7;
      persona(k.x + [t, t, -b, b][lado], k.z + [-b, b, t, t][lado]);
    }
  }
  // Algo de gente delante de cada proyecto: invita a entrar
  for (const { celda: [c, f] } of lista) {
    for (let i = 0; i < 3; i++) persona(c * PASO + entre(-4, 4), f * PASO + 6.4 * (rnd() < 0.5 ? -1 : 1));
  }
  instancias(escena, new THREE.CylinderGeometry(0.17, 0.22, 0.95, 6).translate(0, 0.48, 0), mat(0xffffff), cuerpos, { sombra: true });
  instancias(escena, new THREE.IcosahedronGeometry(0.17, 0).translate(0, 1.13, 0), mat(0xffffff, { flatShading: true }), cabezas);

  /* ---- Proyectos ---- */
  const proyectos = lista.map((d) => {
    const p = crearProyecto(d);
    escena.add(p.grupo);
    return p;
  });

  return { proyectos, cajas: proyectos.map((p) => p.hit) };
}
