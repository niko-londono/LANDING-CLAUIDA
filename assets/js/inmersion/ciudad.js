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
import { PALETA } from "./escena.js";

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

/* ---------- Entorno instanciado ---------- */
export function crearCiudad(escena, lista) {
  const rnd = azar(20261109);
  const ocupadas = new Set(lista.map((p) => p.celda.join(",")));

  // Suelo: las calles
  const suelo = new THREE.Mesh(new THREE.PlaneGeometry(700, 700), mat(PALETA.calle));
  suelo.rotation.x = -Math.PI / 2;
  suelo.receiveShadow = true;
  escena.add(suelo);

  const celdas = [];
  for (let c = -RADIO_ENTORNO; c <= RADIO_ENTORNO; c++) {
    for (let f = -RADIO_ENTORNO; f <= RADIO_ENTORNO; f++) {
      if (!ocupadas.has(`${c},${f}`)) celdas.push([c, f]);
    }
  }

  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const pos = new THREE.Vector3();
  const esc = new THREE.Vector3();
  const color = new THREE.Color();

  // Aceras y parques: una losa por cuadra
  const aceras = new THREE.InstancedMesh(caja, mat(0xffffff), celdas.length);
  aceras.receiveShadow = true;
  const parques = [];
  celdas.forEach(([c, f], i) => {
    const esParque = rnd() < 0.16 && Math.max(Math.abs(c), Math.abs(f)) > 0;
    if (esParque) parques.push([c, f]);
    m4.compose(pos.set(c * PASO, 0, f * PASO), q, esc.set(BLOQUE, 0.4, BLOQUE));
    aceras.setMatrixAt(i, m4);
    aceras.setColorAt(i, color.set(esParque ? 0xc9ceb4 : PALETA.lino));
  });
  aceras.computeBoundingSphere();
  escena.add(aceras);

  // Edificios genéricos: hasta 4 parcelas por cuadra, alturas que bajan hacia el horizonte
  const tonos = [0xf3ede4, 0xebe3d6, 0xe2d6c5, 0xd8c9b4, 0xcfc4b5];
  const parcelas = [];
  const esParque = new Set(parques.map((p) => p.join(",")));
  for (const [c, f] of celdas) {
    if (esParque.has(`${c},${f}`)) continue;
    const lejos = Math.max(Math.abs(c), Math.abs(f));
    // Junto a un proyecto los edificios se quedan bajos: el proyecto manda
    const vecinoDeProyecto = lista.some(({ celda: [pc, pf] }) => Math.abs(pc - c) <= 1 && Math.abs(pf - f) <= 1);
    const factor = vecinoDeProyecto ? 0.45 : lejos <= RADIO_CIUDAD ? 0.85 : 0.75;
    for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      if (rnd() < 0.18) continue; // algunos solares vacíos
      const ancho = 3.6 + rnd() * 1.6;
      const fondo = 3.6 + rnd() * 1.6;
      const alto = (1.8 + Math.pow(rnd(), 2.2) * 9) * factor;
      parcelas.push([c * PASO + dx * 2.9, f * PASO + dz * 2.9, ancho, alto, fondo]);
    }
  }
  const edificios = new THREE.InstancedMesh(caja, mat(0xffffff), parcelas.length);
  edificios.castShadow = true;
  edificios.receiveShadow = true;
  parcelas.forEach(([x, z, an, al, fo], i) => {
    m4.compose(pos.set(x, 0.4, z), q, esc.set(an, al, fo));
    edificios.setMatrixAt(i, m4);
    edificios.setColorAt(i, color.set(tonos[Math.floor(rnd() * tonos.length)]));
  });
  edificios.computeBoundingSphere();
  escena.add(edificios);

  // Árboles minimalistas en los parques: copa (cono de 6 caras) + tronco
  const arboles = [];
  for (const [c, f] of parques) {
    const n = 7 + Math.floor(rnd() * 6);
    for (let i = 0; i < n; i++) {
      arboles.push([c * PASO + (rnd() - 0.5) * (BLOQUE - 2), f * PASO + (rnd() - 0.5) * (BLOQUE - 2), 0.7 + rnd() * 0.6]);
    }
  }
  const copaGeo = new THREE.ConeGeometry(1, 2.8, 6).translate(0, 2.2, 0);
  const troncoGeo = new THREE.CylinderGeometry(0.14, 0.18, 0.9, 5).translate(0, 0.45, 0);
  const copas = new THREE.InstancedMesh(copaGeo, mat(0xffffff, { flatShading: true }), arboles.length);
  const troncos = new THREE.InstancedMesh(troncoGeo, MATERIALES.madera, arboles.length);
  copas.castShadow = true;
  const verdes = [PALETA.salvia, 0x7f8c70, 0x9aa58a];
  arboles.forEach(([x, z, s], i) => {
    q.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, rnd() * Math.PI);
    m4.compose(pos.set(x, 0.4, z), q, esc.set(s, s, s));
    copas.setMatrixAt(i, m4);
    troncos.setMatrixAt(i, m4);
    copas.setColorAt(i, color.set(verdes[i % verdes.length]));
  });
  q.identity();
  copas.computeBoundingSphere();
  troncos.computeBoundingSphere();
  escena.add(copas, troncos);

  // Farolas en cada cruce: poste + luz (material básico, no necesita luz real)
  const cruces = [];
  for (let c = -RADIO_ENTORNO; c < RADIO_ENTORNO; c++) {
    for (let f = -RADIO_ENTORNO; f < RADIO_ENTORNO; f++) cruces.push([(c + 0.5) * PASO + 2.1, (f + 0.5) * PASO + 2.1]);
  }
  const postes = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.09, 0.09, 3.2, 5).translate(0, 1.6, 0), MATERIALES.piedra, cruces.length);
  const luces = new THREE.InstancedMesh(new THREE.BoxGeometry(0.42, 0.18, 0.42).translate(0, 3.25, 0), new THREE.MeshBasicMaterial({ color: PALETA.ocre }), cruces.length);
  cruces.forEach(([x, z], i) => {
    m4.compose(pos.set(x, 0, z), q, esc.set(1, 1, 1));
    postes.setMatrixAt(i, m4);
    luces.setMatrixAt(i, m4);
  });
  postes.computeBoundingSphere();
  luces.computeBoundingSphere();
  escena.add(postes, luces);

  // Líneas de luz por el eje de cada calle: un solo LineSegments
  const puntos = [];
  const largo = (RADIO_ENTORNO + 0.5) * PASO;
  for (let i = -RADIO_ENTORNO; i < RADIO_ENTORNO; i++) {
    const e = (i + 0.5) * PASO;
    puntos.push(new THREE.Vector3(e, 0.03, -largo), new THREE.Vector3(e, 0.03, largo));
    puntos.push(new THREE.Vector3(-largo, 0.03, e), new THREE.Vector3(largo, 0.03, e));
  }
  const ejes = new THREE.LineSegments(
    new THREE.BufferGeometry().setFromPoints(puntos),
    new THREE.LineBasicMaterial({ color: PALETA.terracota, transparent: true, opacity: 0.22 })
  );
  escena.add(ejes);

  // Proyectos
  const proyectos = lista.map((d) => {
    const p = crearProyecto(d);
    escena.add(p.grupo);
    return p;
  });

  return { proyectos, cajas: proyectos.map((p) => p.hit) };
}
