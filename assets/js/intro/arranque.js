/* =========================================================
   Intro «dentro de la pantalla» · arranque
   La portada vive en la pantalla de un monitor del estudio de
   Claudia. Al bajar, la cámara se aleja y aparece el escritorio
   frente al ventanal. Este archivo solo prepara la maqueta
   (altura fijada) y carga escena (y con ella Three.js).
   El <head> pone la clase intro-3d si hay WebGL y no se pidió
   movimiento reducido; sin ella la portada queda como siempre.
   ========================================================= */

const raiz = document.documentElement;
const intro = document.getElementById("intro");
const escenario = intro?.querySelector(".intro__escenario");
const portada = intro?.querySelector(".portada");
const lienzo = intro?.querySelector(".intro__lienzo");
const medida = intro?.querySelector(".intro__medida");

if (intro && escenario && portada && lienzo && medida && raiz.classList.contains("intro-3d")) {
  // La portada puede ser más alta que la pantalla (móvil): se fija cuando
  // su borde inferior toca el de la pantalla. El CSS usa esta altura.
  const medirPortada = () => intro.style.setProperty("--alto-portada", `${portada.offsetHeight}px`);
  medirPortada();
  if ("ResizeObserver" in window) new ResizeObserver(medirPortada).observe(portada);

  // Si Three.js no llega, se quita el tramo fijado sin que la página salte
  const sin3D = () => {
    const antes = intro.offsetHeight;
    const pasado = window.scrollY > intro.offsetTop + portada.offsetHeight;
    raiz.classList.remove("intro-3d");
    portada.style.transform = "";
    portada.style.clipPath = "";
    if (pasado) window.scrollBy(0, intro.offsetHeight - antes);
  };

  import("./escena.js?v=20261124e")
    .then((m) => m.iniciar({ intro, escenario, portada, lienzo, medida }))
    .catch((error) => {
      console.error("Intro 3D:", error);
      sin3D();
    });
}
