/* =========================================================
   Inmersión · tráfico
   Coches que circulan por sus carriles (circulación por la derecha),
   se detienen en los cruces y guardan distancia con el de delante.
   - Semáforos: ciclo de 10 s. Primero las calles a lo largo de z,
     luego las de x, con 1,6 s en rojo para todos entre fases: así
     el tráfico cruzado nunca coincide en el cruce.
   - Velocidad: cada coche apunta a su velocidad de crucero y la
     limita por la distancia de frenado hasta la línea de parada o
     hasta el coche de delante (v² = v_delante² + 2·a·d). Acelera a
     3 u/s² y frena a lo sumo a 6 u/s²: arranques y paradas suaves.
   - Rendimiento: 3 InstancedMesh (carrocería, cabina, sombra). Cada
     fotograma solo se reescriben ~200 matrices (13 KB a la GPU). Los
     coches no proyectan sombra en el mapa (que es estático); llevan
     una sombra de contacto propia que se mueve con ellos.
   - Movimiento reducido: los coches se quedan aparcados.
   ========================================================= */
import * as THREE from "three";
import { PASO, CALLE, RADIO_CIUDAD, RADIO_ENTORNO } from "./ciudad.js";
import { PALETA } from "./escena.js";

const CICLO = 10;          // s
const VERDE = 3.4;         // s de verde por fase; los 1,6 s restantes del medio ciclo, rojo para todos
const ACELERACION = 3;     // u/s²
const FRENADA = 6;         // u/s² máximo
const LARGO_COCHE = 2.1;
const HUECO = 1.3;         // distancia libre mínima entre coches parados
const PARADA = CALLE / 2 + 1.9; // línea de parada: antes del paso de cebra
const CARRIL = 1.15;       // desvío del carril respecto al eje de la calle
const L = (RADIO_ENTORNO + 0.5) * PASO; // los carriles recorren la ciudad entera y dan la vuelta
const VUELTA = 2 * L;

const reducirMovimiento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Distancia (≥ 0) hasta la siguiente línea de parada en el sentido de la marcha
function hastaParada(s, d) {
  let k = d > 0 ? Math.floor(s / PASO - 0.5) + 1 : Math.ceil(s / PASO - 0.5) - 1;
  let linea = (k + 0.5) * PASO - d * PARADA;
  if ((linea - s) * d < 0) {
    k += d; // ya cruzó la línea de este cruce: está dentro y sigue
    linea = (k + 0.5) * PASO - d * PARADA;
  }
  return (linea - s) * d;
}

export function crearTrafico(escena, rnd) {
  const entre = (a, b) => a + rnd() * (b - a);
  const colores = [PALETA.terracota, PALETA.oliva, 0xf3ede4, 0x3a3631, PALETA.ocre, 0x6f7f8c, 0xb9b2a6, 0x8a2f2a];

  /* ---- Carriles y coches ---- */
  const carriles = [];
  for (let i = -RADIO_ENTORNO; i < RADIO_ENTORNO; i++) {
    if (Math.abs(i + 0.5) > RADIO_CIUDAD + 2) continue;
    const e = (i + 0.5) * PASO;
    // Por la derecha: hacia +z se circula en x = e − carril; hacia +x, en z = e + carril
    carriles.push({ eje: "z", d: 1, fijo: e - CARRIL }, { eje: "z", d: -1, fijo: e + CARRIL });
    carriles.push({ eje: "x", d: 1, fijo: e + CARRIL }, { eje: "x", d: -1, fijo: e - CARRIL });
  }

  const coches = [];
  for (const carril of carriles) {
    carril.coches = [];
    const n = 2 + Math.floor(rnd() * 2);
    // Repartidos a lo largo del carril, del primero (más adelantado) al último
    const paso = VUELTA / n;
    const inicio = rnd() * VUELTA;
    for (let k = 0; k < n; k++) {
      const s = ((inicio - k * paso + entre(-paso * 0.25, paso * 0.25)) % VUELTA + VUELTA) % VUELTA - L;
      const coche = { carril, s: s * carril.d, v: 0, crucero: entre(4.5, 7), color: colores[Math.floor(rnd() * colores.length)] };
      carril.coches.push(coche);
      coches.push(coche);
    }
    // Orden cíclico estable: cada coche sigue al anterior de la lista (no se adelantan)
    carril.coches.sort((a, b) => b.s * carril.d - a.s * carril.d);
    carril.coches.forEach((c, k, arr) => { c.delante = arr[(k - 1 + arr.length) % arr.length]; });
  }

  /* ---- Mallas ---- */
  const caja = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
  const carrocerias = new THREE.InstancedMesh(caja, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.55 }), coches.length);
  const cabinas = new THREE.InstancedMesh(caja, new THREE.MeshStandardMaterial({ color: 0x3d4448, roughness: 0.3, metalness: 0.2 }), coches.length);
  const sombras = new THREE.InstancedMesh(
    new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0x1e1b18, transparent: true, opacity: 0.22, depthWrite: false }),
    coches.length
  );
  const color = new THREE.Color();
  coches.forEach((c, i) => carrocerias.setColorAt(i, color.set(c.color)));
  for (const m of [carrocerias, cabinas, sombras]) {
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); // se reescriben cada fotograma
    m.frustumCulled = false; // se mueven: una esfera fija no sirve, y son solo 3 llamadas
    escena.add(m);
  }
  sombras.renderOrder = -1;

  const giroX = new THREE.Quaternion().setFromAxisAngle(THREE.Object3D.DEFAULT_UP, Math.PI / 2);
  const giroZ = new THREE.Quaternion();
  const m4 = new THREE.Matrix4();
  const pos = new THREE.Vector3();
  const esc = new THREE.Vector3();

  function colocar() {
    coches.forEach((c, i) => {
      const { eje, d, fijo } = c.carril;
      const q = eje === "x" ? giroX : giroZ;
      const x = eje === "x" ? c.s : fijo;
      const z = eje === "z" ? c.s : fijo;
      // La cabina va algo retrasada: se lee hacia dónde va el coche
      const atras = -d * 0.18;
      m4.compose(pos.set(x, 0.1, z), q, esc.set(0.95, 0.55, LARGO_COCHE));
      carrocerias.setMatrixAt(i, m4);
      m4.compose(pos.set(eje === "x" ? x + atras : x, 0.65, eje === "z" ? z + atras : z), q, esc.set(0.82, 0.42, 1.1));
      cabinas.setMatrixAt(i, m4);
      m4.compose(pos.set(x, 0.015, z), q, esc.set(1.25, 1, LARGO_COCHE + 0.35));
      sombras.setMatrixAt(i, m4);
    });
    carrocerias.instanceMatrix.needsUpdate = true;
    cabinas.instanceMatrix.needsUpdate = true;
    sombras.instanceMatrix.needsUpdate = true;
  }
  colocar();

  /* ---- Un paso de simulación. Devuelve true si algo se movió. ---- */
  let reloj = rnd() * CICLO;
  function paso(dt) {
    if (reducirMovimiento || dt <= 0) return false;
    reloj = (reloj + dt) % CICLO;
    const medio = CICLO / 2;
    const fase = reloj < VERDE ? "z" : reloj >= medio && reloj < medio + VERDE ? "x" : null;

    for (const c of coches) {
      const { eje, d } = c.carril;
      let objetivo = c.crucero;

      const delante = c.delante;
      const centroACentro = delante !== c ? (((delante.s - c.s) * d) % VUELTA + VUELTA) % VUELTA : Infinity;
      const dist = hastaParada(c.s, d);

      // Parar en la línea si el semáforo está en rojo, o si al otro lado del
      // cruce no hay sitio para salir (no bloquear el cruce con la cola)
      const sinSalida = delante.v < 0.5 && centroACentro < dist + 2 * PARADA + LARGO_COCHE + HUECO;
      if (fase !== eje || sinSalida) {
        // Puede parar si le basta con frenar a fondo; si no, ya está comprometido y cruza
        if (dist > (c.v * c.v) / (2 * FRENADA * 1.5)) {
          objetivo = Math.min(objetivo, Math.sqrt(2 * FRENADA * Math.max(dist - 0.15, 0)));
        }
      }

      // Coche de delante: distancia de seguridad según su velocidad
      if (delante !== c) {
        const hueco = centroACentro - LARGO_COCHE - HUECO;
        objetivo = Math.min(objetivo, Math.sqrt(delante.v * delante.v + 2 * (FRENADA * 0.6) * Math.max(hueco, 0)));
        if (hueco <= 0) objetivo = 0;
      }

      c.v = objetivo > c.v ? Math.min(objetivo, c.v + ACELERACION * dt) : Math.max(objetivo, c.v - FRENADA * dt * 1.5);
      c.s += d * c.v * dt;
      // Fin del carril (en la niebla): vuelve a entrar por el otro extremo
      if (c.s * d > L) c.s -= d * VUELTA;
    }
    colocar();
    return true;
  }

  return { paso, coches };
}
