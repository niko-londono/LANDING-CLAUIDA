// Utilidades de movimiento para las escenas. Todo es función del progreso p (0 → 1): nada depende del tiempo.
//
//   tramo(p, 0.2, 0.5)        → 0 antes de 0,2 · sube de 0 a 1 entre 0,2 y 0,5 · 1 después
//   mezclar(a, b, t)          → interpolación lineal entre dos números
//   color(“#ff0000”, “#0000ff”, t) → interpolación de dos colores HEX
//   E.suave(t), E.salida(t)…  → curvas de aceleración (aplícalas al resultado de tramo)
//   ruido(x, semilla)         → ruido determinista 0-1 (estrellas, partículas: siempre igual en cada fotograma)
(function () {
  const limitar = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const tramo = (p, a, b) => limitar((p - a) / (b - a));
  const mezclar = (a, b, t) => a + (b - a) * t;
  const hex = (h) => { const n = parseInt(h.replace("#", ""), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const color = (a, b, t) => { const x = hex(a), y = hex(b); return `rgb(${x.map((v, i) => Math.round(mezclar(v, y[i], t))).join(",")})`; };
  const E = {
    lineal: (t) => t,
    suave: (t) => t * t * (3 - 2 * t),                                   // entra y sale suave
    entrada: (t) => t * t * t,                                           // arranca lento
    salida: (t) => 1 - Math.pow(1 - t, 3),                               // frena al final
    entradaSalida: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    expo: (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
    rebote: (t) => 1 + 2.2 * Math.pow(t - 1, 3) + 1.2 * Math.pow(t - 1, 2), // se pasa un poco y vuelve
  };
  // Ruido determinista (hash): mismo resultado para la misma entrada
  const ruido = (x, s = 1) => { const v = Math.sin(x * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };
  // Aplica un transform a un elemento: mover(el, {x, y, escala, giro, opacidad, desenfoque})
  const mover = (el, o) => {
    if (!el) return;
    el.style.transform = `translate3d(${o.x || 0}px, ${o.y || 0}px, 0) scale(${o.escala ?? 1}) rotate(${o.giro || 0}deg)`;
    if (o.opacidad !== undefined) el.style.opacity = o.opacidad;
    if (o.desenfoque !== undefined) el.style.filter = o.desenfoque > 0.05 ? `blur(${o.desenfoque}px)` : "none";
  };
  window.U = { limitar, tramo, mezclar, color, E, ruido, mover };
})();
