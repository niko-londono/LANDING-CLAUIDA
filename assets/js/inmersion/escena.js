/* =========================================================
   Inmersión · escena
   Renderizador, luces, niebla y sombras.
   Rendimiento: resolución de píxel limitada, un solo foco con
   sombra (mapa de 1024 px, 512 en táctil) y sombras que se
   calculan una vez: solo se recalculan cuando algo se mueve.
   ========================================================= */
import * as THREE from "three";

export const PALETA = {
  hueso: 0xf2ece3,
  huesoClaro: 0xf8f4ee,
  lino: 0xe6dccd,
  arena: 0xd8c7b0,
  piedra: 0xb9b2a6,
  roble: 0xb07c4f,
  ocre: 0xc8913a,
  terracota: 0xa9502b,
  salvia: 0x8e9a7e,
  oliva: 0x2f3a2e,
  tinta: 0x1e1b18,
  calle: 0xddd2c2,
  asfalto: 0x9d968d,
  agua: 0x8fb0ac,
  vidrio: 0xa9b8b0,
};

export const esTactil = window.matchMedia("(pointer: coarse)").matches;

export function crearEscena(lienzo) {
  const renderer = new THREE.WebGLRenderer({
    canvas: lienzo,
    antialias: true,
    powerPreference: "high-performance",
  });
  // Más de 2 (o 1,5 en móviles) multiplica el coste de cada píxel sin ganancia visible
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, esTactil ? 1.5 : 2));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false; // la ciudad es estática
  renderer.shadowMap.needsUpdate = true;

  const escena = new THREE.Scene();
  escena.background = new THREE.Color(PALETA.hueso);
  // Niebla atmosférica: los bordes de la ciudad se funden con el fondo
  escena.fog = new THREE.Fog(PALETA.hueso, 190, 430);

  const camara = new THREE.PerspectiveCamera(30, window.innerWidth / window.innerHeight, 1, 600);

  // Luz ambiental suave: cielo cálido arriba, suelo arena abajo
  const ambiente = new THREE.HemisphereLight(0xfff6ea, PALETA.arena, 1.35);
  escena.add(ambiente);

  // Sol de tarde con sombras de resolución limitada
  const sol = new THREE.DirectionalLight(0xfff1de, 2.1);
  sol.position.set(-70, 110, 50);
  sol.castShadow = true;
  const lado = esTactil ? 512 : 1024;
  sol.shadow.mapSize.set(lado, lado);
  const s = sol.shadow.camera;
  s.left = -80; s.right = 80; s.top = 80; s.bottom = -80;
  s.near = 20; s.far = 280;
  sol.shadow.bias = -0.0008;
  sol.shadow.normalBias = 0.4;
  sol.shadow.radius = 3;
  escena.add(sol);

  return { renderer, escena, camara };
}
