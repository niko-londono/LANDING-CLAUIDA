/* =========================================================
   Comparador 3D de «¿Te suena alguno?» · arranque
   No importa Three.js: espera a que la sección esté a ~600 px
   de la pantalla y entonces carga escena.js (y con ella Three).
   Sin WebGL, la sección se queda como lista de texto.
   ========================================================= */

const seccion = document.getElementById("problemas");
const figura = document.getElementById("comparador");

const hayWebGL = () => {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch (e) {
    return false;
  }
};

const sin3D = () => seccion.classList.add("sin-3d");

if (seccion && figura) {
  if (!hayWebGL() || !("IntersectionObserver" in window)) {
    sin3D();
  } else {
    const vigia = new IntersectionObserver((entradas) => {
      if (!entradas[0].isIntersecting) return;
      vigia.disconnect();
      import("./escena.js?v=20261123e")
        .then((m) => m.iniciar(seccion, figura))
        .catch((error) => {
          console.error("Comparador 3D:", error);
          sin3D();
        });
    }, { rootMargin: "600px 0px" });
    vigia.observe(figura);
  }
}
