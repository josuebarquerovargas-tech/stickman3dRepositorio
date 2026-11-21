// El "estudio de grabación": aquí se construyen los escenarios, los objetos y los actores.
// Todo se crea UNA vez. Luego, en cada cuadro, `tomas.ts` decide qué se ve y dónde está cada cosa.
import * as THREE from "three";
import { caja, cilindro, esfera, cono, roca, en, cartel, lienzo, textura, material, luminoso, conTinta, matas, estrellas, dado, FUENTE,
  pegatinaTexto, pegatinaEstrella, pegatinaNube } from "../motor/formas";
import { Personaje } from "../motor/personaje";
import { lookNormal } from "../motor/post";

const grupo = (padre: THREE.Object3D) => { const g = new THREE.Group(); padre.add(g); return g; };
const acostado = <T extends THREE.Object3D>(o: T, eje: "x" | "z" = "x") => { o.rotation[eje] = Math.PI / 2; return o; };

/** Cielo: una esfera gigante pintada con un degradado. */
function cielo(colores: string[]) {
  const [c, g] = lienzo(8, 256);
  const grad = g.createLinearGradient(0, 0, 0, 256);
  colores.forEach((col, i) => grad.addColorStop(i / (colores.length - 1), col));
  g.fillStyle = grad; g.fillRect(0, 0, 8, 256);
  return textura(c);
}

/** Rollo de fotos: cilindro amarillo con tapas oscuras. */
function rollo(r = 0.2, h = 0.46) {
  const g = new THREE.Group();
  g.add(cilindro(r, r, h, 0xf6c32c, 0.035, 24, { trama: "liso" }));
  en(cilindro(r * 1.005, r * 1.005, h * 0.3, 0xd9482f, 0, 24), 0, 0, 0, g);          // etiqueta roja
  en(cilindro(r * 1.08, r * 1.08, h * 0.13, 0x2b2b33), 0, h * 0.47, 0, g);
  en(cilindro(r * 1.08, r * 1.08, h * 0.13, 0x2b2b33), 0, -h * 0.47, 0, g);
  en(cilindro(r * 0.35, r * 0.35, h * 0.2, 0x9aa3ad, 0.02), 0, h * 0.62, 0, g);
  return g;
}

function arbol(x: number, z: number, padre: THREE.Object3D, s = 1, color = 0x3f9b4b) {
  const g = en(new THREE.Group(), x, 0, z, padre);
  en(cilindro(0.16 * s, 0.24 * s, 1.6 * s, 0x7a4a2a, 0.04, 10, { trama: "madera" }), 0, 0.8 * s, 0, g);
  const h = { trama: "hojas" as const, rx: 2, ry: 2 };
  en(roca(1.0 * s, color, 0.06, h, 1), 0, 2.2 * s, 0, g);
  en(roca(0.7 * s, color, 0.05, h, 1), 0.65 * s, 2.7 * s, 0.2, g);
  en(roca(0.65 * s, color, 0.05, h, 1), -0.6 * s, 2.6 * s, -0.2, g);
  return g;
}
function arbusto(x: number, z: number, padre: THREE.Object3D, s = 1) {
  const g = en(new THREE.Group(), x, 0, z, padre);
  en(roca(0.5 * s, 0x4aa855, 0.045, { trama: "hojas" }, 1), 0, 0.38 * s, 0, g);
  en(roca(0.36 * s, 0x58b862, 0.04, { trama: "hojas" }, 1), 0.42 * s, 0.3 * s, 0.1, g);
}
/** Piedritas repartidas por el suelo. */
function piedras(n: number, ancho: number, fondo: number, padre: THREE.Object3D, semilla: number, color = 0x9a9aa8) {
  const r = dado(semilla);
  for (let i = 0; i < n; i++) { const p = en(roca(0.07 + r() * 0.1, color, 0.02), (r() - 0.5) * ancho, 0.04, (r() - 0.5) * fondo, padre); p.rotation.set(r() * 3, r() * 3, 0); p.scale.y = 0.6; }
}
/** Lámpara colgante con foco que brilla y su luz. */
function lamparaTecho(x: number, y: number, z: number, padre: THREE.Object3D, color = 0xffd9a0, fuerza = 30) {
  const g = en(new THREE.Group(), x, y, z, padre);
  en(cilindro(0.02, 0.02, 3, 0x2b2b33, 0), 0, 1.7, 0, g);
  en(cono(0.42, 0.34, 0x3f8f7a, 0.03, 16), 0, 0.12, 0, g);
  en(new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 8), luminoso(color, 4)), 0, -0.08, 0, g);
  const l = new THREE.PointLight(color, fuerza, 14, 1.6); l.position.set(0, -0.3, 0); g.add(l);
  return l;
}
function cuadro(x: number, y: number, z: number, w: number, h: number, color: number, padre: THREE.Object3D) {
  en(caja(w + 0.16, h + 0.16, 0.08, 0x5a3a22, 0.03, { trama: "madera" }), x, y, z, padre);
  en(caja(w, h, 0.02, color, 0, { trama: "liso" }), x, y, z + 0.05, padre);
}

/** Texto 2D que se puede cambiar en cada cuadro (el contador de segundos). */
function letrero(tam: number) {
  const [c, g] = lienzo(512, 256);
  const tex = textura(c);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, alphaTest: 0.35, alphaToCoverage: true }));
  sprite.scale.set(tam * 2, tam, 1);
  let ultimo = "";
  return { sprite, texto(t: string, color = "#ffffff") {
    if (t === ultimo) return; ultimo = t;
    g.clearRect(0, 0, 512, 256);
    g.font = `900 150px ${FUENTE}`; g.textAlign = "center"; g.textBaseline = "middle"; g.lineJoin = "round";
    g.lineWidth = 26; g.strokeStyle = "#1b1420"; g.strokeText(t, 256, 128); g.fillStyle = color; g.fillText(t, 256, 128);
    tex.needsUpdate = true;
  } };
}

export function crearMundo() {
  const escena = new THREE.Scene();
  escena.fog = new THREE.Fog(0xbfe3ff, 30, 110);

  // ------------------------------------------------------------------ luces y cielo
  const ambiente = new THREE.HemisphereLight(0xffffff, 0x8a7a9a, 1.5);
  const sol = new THREE.DirectionalLight(0xfff1dd, 2.4);
  sol.position.set(-6, 11, 8);
  sol.castShadow = true;
  sol.shadow.mapSize.set(2048, 2048);
  Object.assign(sol.shadow.camera, { left: -13, right: 13, top: 13, bottom: -13, near: 1, far: 45 });
  sol.shadow.bias = -0.0012; sol.shadow.normalBias = 0.03;
  const foco = new THREE.PointLight(0xff3020, 0, 9);   // luz roja para el "enemigo"
  escena.add(ambiente, sol, sol.target, foco);
  const cielos = {
    dia: cielo(["#2f7fe0", "#58a8f0", "#a8dcff", "#f4fbff"]),
    gris: cielo(["#4d5562", "#7f8794", "#b7b9bd", "#d9d2c8"]),
    noche: cielo(["#070a2e", "#151a5a", "#3a2f86", "#8a4f9a"]),
  };
  const boveda = new THREE.Mesh(new THREE.SphereGeometry(90, 24, 16),
    new THREE.MeshBasicMaterial({ map: cielos.dia, side: THREE.BackSide, fog: false }));
  const lucesNoche = estrellas(700);
  escena.add(boveda, lucesNoche);

  // ------------------------------------------------------------------ LABORATORIO (1975)
  const lab = grupo(escena);
  en(caja(18, 0.2, 14, 0xd9c7a0, 0, { trama: "baldosa", rx: 5, ry: 4 }), 0, -0.1, 0, lab);
  en(caja(18, 8, 0.3, 0x5fa9b5, 0, { trama: "tapiz", rx: 6, ry: 3 }), 0, 4, -3.4, lab);
  en(caja(18, 1.25, 0.36, 0x8a5a3c, 0, { trama: "madera", rx: 6, ry: 0.5 }), 0, 0.62, -3.38, lab);
  en(caja(18, 0.1, 0.42, 0x5a3a22, 0.02), 0, 1.27, -3.36, lab);
  // ventana con luz de día
  en(caja(2.5, 2.1, 0.14, 0xfff3d6, 0.04), -2.6, 3.6, -3.22, lab);
  en(new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.8), luminoso(0x9fdcff, 1.5)), -2.6, 3.6, -3.14, lab);
  en(caja(0.09, 1.8, 0.18, 0xfff3d6, 0.02), -2.6, 3.6, -3.14, lab);
  en(caja(2.2, 0.09, 0.18, 0xfff3d6, 0.02), -2.6, 3.6, -3.14, lab);
  en(caja(2.7, 0.12, 0.4, 0xfff3d6, 0.03), -2.6, 2.5, -3.1, lab);
  // repisas con cajas, libros y frascos
  for (const [y, x0] of [[3.2, 1.2], [4.3, 1.5]] as const) {
    en(caja(2.9, 0.1, 0.5, 0x8a5a3c, 0.03, { trama: "madera" }), x0 + 1.2, y, -3.0, lab);
    const r = dado(y * 10);
    let x = x0;
    for (let i = 0; i < 9; i++) {
      const w = 0.12 + r() * 0.26, h = 0.35 + r() * 0.5, col = [0xe2574c, 0xf2b441, 0x5d7bd6, 0x3fae8a, 0xb06fd6, 0xfff3d6][i % 6];
      const o = i % 4 === 3 ? cilindro(w / 2, w / 2, h * 0.7, 0xc7e6ef, 0.02, 12) : caja(w, h, 0.34, col, 0.025);
      en(o, x + w / 2, y + 0.05 + (i % 4 === 3 ? h * 0.35 : h / 2), -3.0, lab); x += w + 0.05;
    }
  }
  // reloj de pared
  const reloj = en(acostado(cilindro(0.42, 0.42, 0.08, 0xfff8ef, 0.04)), 0.2, 4.9, -3.2, lab);
  void reloj;
  for (const [a, l] of [[0.6, 0.26], [2.4, 0.34]]) { const m = caja(0.04, l, 0.02, 0x1b1420, 0); m.position.set(0.2 + Math.sin(a) * l / 2, 4.9 + Math.cos(a) * l / 2, -3.14); m.rotation.z = -a; lab.add(m); }
  // mesa de trabajo
  const mesa = en(new THREE.Group(), 0, 0, -1.2, lab);
  en(caja(3.5, 0.14, 1.15, 0x9a6a44, 0.035, { trama: "madera", rx: 2 }), 0, 1.0, 0, mesa);
  for (const x of [-1.55, 1.55]) for (const z of [-0.42, 0.42]) en(caja(0.14, 0.94, 0.14, 0x6e4326, 0.03, { trama: "madera" }), x, 0.47, z, mesa);
  en(caja(3.1, 0.1, 0.08, 0x6e4326, 0.02), 0, 0.3, 0.42, mesa);
  en(caja(0.74, 0.54, 0.5, 0x586070, 0.035, { trama: "metal" }), -1.25, 1.34, -0.22, mesa);          // osciloscopio
  en(new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.3), luminoso(0x58f08a, 2.2)), -1.33, 1.38, 0.04, mesa);
  for (const y of [1.22, 1.36, 1.5]) en(acostado(cilindro(0.035, 0.035, 0.04, 0xd9d2c4, 0.012, 10)), -0.98, y, 0.04, mesa);
  en(cilindro(0.14, 0.18, 0.06, 0x444a55), 1.4, 1.1, -0.3, mesa);                                       // lámpara de escritorio
  en(cilindro(0.03, 0.03, 0.8, 0x444a55, 0.015), 1.4, 1.5, -0.3, mesa);
  en(cono(0.26, 0.3, 0xf2b441, 0.03), 1.4, 1.95, -0.3, mesa);
  en(new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), luminoso(0xffe0a0, 4)), 1.4, 1.82, -0.3, mesa);
  const luzMesa = new THREE.PointLight(0xffc98a, 14, 7, 1.7); luzMesa.position.set(1.3, 1.8, 0.1); mesa.add(luzMesa);
  const rollito = en(new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.025, 6, 16), material(0xd9482f)), 0.95, 1.1, 0.25, mesa); rollito.rotation.x = Math.PI / 2;   // cable enrollado
  en(caja(0.3, 0.02, 0.4, 0xfff8ef, 0.012), -0.5, 1.08, 0.3, mesa).rotation.y = 0.3;                    // planos
  // computadora de los 70 con carretes de cinta
  const compu = en(new THREE.Group(), 3.3, 0, -2.4, lab);
  en(caja(1.5, 3.6, 0.9, 0xe9e2d0, 0.04, { trama: "metal" }), 0, 1.8, 0, compu);
  for (const x of [-0.34, 0.34]) { en(acostado(cilindro(0.26, 0.26, 0.05, 0x2b2b33, 0.02)), x, 2.9, 0.47, compu); en(acostado(cilindro(0.08, 0.08, 0.06, 0xc7ccd4, 0.01, 10)), x, 2.9, 0.49, compu); }
  en(caja(1.2, 0.5, 0.04, 0x3a4250, 0.02), 0, 2.1, 0.46, compu);
  const foquitos = Array.from({ length: 12 }, (_, i) => en(new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.02), luminoso([0xff5a4a, 0xffd23f, 0x58f08a][i % 3], 3)), -0.48 + (i % 6) * 0.19, 2.2 - Math.floor(i / 6) * 0.2, 0.49, compu));
  // cosas en el piso, para dar profundidad
  en(caja(0.9, 0.7, 0.8, 0xc99a5b, 0.035, { trama: "carton" }), -3.2, 0.35, -2.2, lab).rotation.y = 0.3;
  en(caja(0.7, 0.5, 0.6, 0xc99a5b, 0.035, { trama: "carton" }), -3.1, 0.95, -2.2, lab).rotation.y = -0.2;
  en(cilindro(0.3, 0.24, 0.6, 0x7a8794, 0.03, 14, { trama: "metal" }), 2.1, 0.3, -2.5, lab);            // bote de basura
  const banco = en(new THREE.Group(), -2.2, 0, -1.4, lab);
  en(cilindro(0.3, 0.3, 0.08, 0xd9482f, 0.03), 0, 0.78, 0, banco);
  for (let i = 0; i < 3; i++) en(cilindro(0.03, 0.03, 0.78, 0x444a55, 0.015, 8), Math.sin(i * 2.1) * 0.2, 0.39, Math.cos(i * 2.1) * 0.2, banco);
  const luzLab = lamparaTecho(0.3, 5.6, 0.8, lab, 0xffe6b8, 26);

  // ------------------------------------------------------------------ SALA DE JUNTAS
  const sala = grupo(escena);
  en(caja(18, 0.2, 14, 0x8a3f52, 0, { trama: "alfombra", rx: 5, ry: 4 }), 0, -0.1, 0, sala);
  en(caja(18, 8, 0.3, 0xe2c08a, 0, { trama: "tapiz", rx: 7, ry: 3 }), 0, 4, -3.4, sala);
  en(caja(18, 1.7, 0.36, 0x7a4a2a, 0, { trama: "madera", rx: 6, ry: 0.6 }), 0, 0.85, -3.38, sala);
  en(caja(18, 0.1, 0.44, 0x4a2a16, 0.02), 0, 1.72, -3.36, sala);
  en(caja(4.8, 0.16, 1.5, 0x6e4326, 0.04, { trama: "madera", rx: 2 }), 0, 1.0, -1.2, sala);             // mesa larga
  for (const x of [-2.1, 2.1]) en(caja(0.32, 0.92, 1.1, 0x55321c, 0.03, { trama: "madera" }), x, 0.46, -1.2, sala);
  for (const x of [-1.0, 0, 1.0]) {                                                                      // sillones altos
    en(caja(0.86, 1.9, 0.16, 0x7a2f3a, 0.035, { trama: "liso" }), x, 1.25, -2.75, sala);
    en(caja(0.3, 0.02, 0.22, 0xfff8ef, 0.012), x + 0.2, 1.09, -0.9, sala).rotation.y = x;               // papeles
    en(cilindro(0.07, 0.06, 0.13, 0xfff8ef, 0.015, 12), x - 0.3, 1.15, -0.8, sala);                      // tazas
  }
  en(cartel("VENTAS\nDE ROLLOS ↗", 2.6, 1.3, "#fff8ef", "#d9482f", 0.62), 0, 4.1, -3.2, sala);
  en(caja(2.8, 1.5, 0.1, 0x55321c, 0.03, { trama: "madera" }), 0, 4.1, -3.28, sala);
  cuadro(-2.9, 3.9, -3.2, 0.9, 1.2, 0x4d6a8a, sala); cuadro(2.9, 3.9, -3.2, 0.9, 1.2, 0x8a6a4d, sala);
  for (const x of [-3.6, 3.6]) {                                                                         // plantas
    en(cilindro(0.3, 0.22, 0.6, 0xc9703f, 0.03, 14), x, 0.3, -2.6, sala);
    en(roca(0.55, 0x3f9b4b, 0.045, { trama: "hojas" }, 1), x, 1.2, -2.6, sala); en(roca(0.4, 0x54b35c, 0.04, { trama: "hojas" }, 1), x + 0.2, 1.75, -2.6, sala);
  }
  en(cilindro(0.1, 0.16, 0.34, 0xffd23f, 0.025, 12), 2.2, 1.25, -1.5, sala);                             // trofeo
  const luzSala = lamparaTecho(0, 5.4, 0.2, sala, 0xffe0b0, 30);

  // ------------------------------------------------------------------ EXTERIOR: la fábrica
  const fuera = grupo(escena);
  en(caja(160, 0.2, 160, 0x6fbf5f, 0, { trama: "pasto", rx: 40, ry: 40 }), 0, -0.1, 0, fuera);
  en(caja(2.8, 0.05, 44, 0xe0cfa2, 0, { trama: "tierra", rx: 1, ry: 12 }), 0, 0.02, 14, fuera);
  const noCamino = (x: number, z: number) => Math.abs(x) < 1.7 || (Math.abs(x) < 4.6 && z < -3.6);
  fuera.add(matas(700, 30, 34, 0x4fae4a, 11, noCamino));
  piedras(26, 22, 22, fuera, 5);
  const fabrica = en(new THREE.Group(), 0, 0, -6, fuera);
  en(caja(7.8, 4.3, 4, 0xd9684a, 0.06, { trama: "ladrillo", rx: 4, ry: 3 }), 0, 2.15, 0, fabrica);
  en(caja(8.3, 0.34, 4.5, 0x7a352b, 0.05), 0, 4.45, 0, fabrica);
  en(caja(8.0, 0.4, 4.2, 0x9aa0a8, 0.04), 0, 0.2, 0, fabrica);                                           // zócalo
  for (const x of [-2.7, 2.7]) for (const y of [1.45, 3.15]) {
    en(caja(1.15, 1.0, 0.1, 0xfff3d6, 0.04), x, y, 2.02, fabrica);
    en(new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.8), luminoso(0xffe9a8, 1.25)), x, y, 2.08, fabrica);
    en(caja(0.06, 0.8, 0.12, 0xfff3d6, 0), x, y, 2.05, fabrica); en(caja(0.95, 0.06, 0.12, 0xfff3d6, 0), x, y, 2.05, fabrica);
  }
  en(caja(1.6, 2.2, 0.12, 0x4a2f25, 0.04, { trama: "madera" }), 0, 1.1, 2.02, fabrica);                  // puerta
  en(new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), material(0xffd23f)), 0.55, 1.1, 2.12, fabrica);
  en(caja(2.2, 0.12, 0.8, 0xe2574c, 0.03), 0, 2.36, 2.3, fabrica).rotation.x = 0.25;                     // toldo
  for (const x of [-2.9, -1.9]) { en(cilindro(0.3, 0.38, 2.4, 0xa9523e, 0.05, 14, { trama: "ladrillo", rx: 2, ry: 2 }), x, 5.7, -0.8, fabrica); en(cilindro(0.36, 0.36, 0.16, 0x7a352b, 0.03, 14), x, 6.9, -0.8, fabrica); }
  const letreroFabrica = en(new THREE.Group(), 0, 3.0, -3.9, fuera);
  letreroFabrica.add(caja(4.6, 0.95, 0.12, 0x2b2b33));
  en(cartel("FÁBRICA DE ROLLOS", 4.4, 0.78, "#f6c32c", "#2b1a12", 0.56), 0, 0, 0.08, letreroFabrica);
  const cerrado = en(cartel("CERRADO", 1.3, 0.5, "#fff8ef", "#d9482f", 0.6), 0, 1.35, -3.86, fuera);
  cerrado.rotation.z = -0.12;
  const rolloGigante = en(rollo(0.85, 1.7), 1.6, 5.47, -6, fuera);
  const corona = en(new THREE.Group(), 1.6, 6.62, -6, fuera);
  corona.add(cilindro(0.5, 0.5, 0.3, 0xffd23f, 0.04));
  for (let i = 0; i < 5; i++) { en(cono(0.14, 0.4, 0xffd23f, 0.03, 8), Math.sin(i * 1.2566) * 0.42, 0.33, Math.cos(i * 1.2566) * 0.42, corona); en(new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), luminoso(0xff4a5a, 1.6)), Math.sin(i * 1.2566 + 0.6) * 0.5, 0, Math.cos(i * 1.2566 + 0.6) * 0.5, corona); }
  const humos = [0, 1, 2, 3].map(() => { const h = pegatinaNube("#f4f4f4", 1.3); fuera.add(h); return h; });
  // cerca, árboles, arbustos, auto y cerros
  for (let z = -2; z < 22; z += 2.2) for (const s of [-1, 1]) {
    en(caja(0.14, 0.9, 0.14, 0xfff8ef, 0.03), s * 2.0, 0.45, z, fuera);
    en(caja(0.06, 0.1, 2.2, 0xfff8ef, 0.02), s * 2.0, 0.66, z + 1.1, fuera); en(caja(0.06, 0.1, 2.2, 0xfff8ef, 0.02), s * 2.0, 0.34, z + 1.1, fuera);
  }
  arbol(-6.3, -3.5, fuera, 1.35); arbol(6.6, -4.5, fuera, 1.55, 0x4aa855); arbol(-4.4, 4.5, fuera, 1.0, 0x54b35c); arbol(5.2, 6.5, fuera, 1.15); arbol(-8.5, 9, fuera, 1.25, 0x4aa855);
  arbol(9.5, 1, fuera, 1.2); arbol(-11, -1, fuera, 1.5, 0x54b35c);
  for (const [x, z, sz] of [[-3.2, -3.4, 1], [3.4, -3.3, 1.2], [-2.9, 1.5, 0.8], [3.1, 4.2, 0.9], [-3.3, 8, 1], [4.5, -1, 0.9]]) arbusto(x, z, fuera, sz);
  const auto = en(new THREE.Group(), 4.2, 0, 0.8, fuera); auto.rotation.y = 0.25;
  en(caja(2.5, 0.55, 1.1, 0x3fa3c9, 0.045), 0, 0.55, 0, auto); en(caja(1.3, 0.5, 1.0, 0x3fa3c9, 0.04), -0.1, 1.05, 0, auto);
  en(caja(1.1, 0.34, 1.02, 0xbfe6f5, 0), -0.1, 1.05, 0, auto);
  for (const x of [-0.8, 0.8]) for (const z of [-0.55, 0.55]) en(acostado(cilindro(0.26, 0.26, 0.16, 0x2b2b33, 0.03, 14)), x, 0.26, z, auto);
  for (const [x, z, r, col] of [[-30, -55, 22, 0x5fae6a], [18, -62, 28, 0x4f9e62], [48, -50, 20, 0x6aba72], [-58, -40, 24, 0x57a866]] as const) { const c = en(roca(r, col, 0, { trama: "pasto", rx: 6, ry: 6 }, 2), x, -r * 0.55, z, fuera); c.scale.y = 0.8; }
  for (const [x, y, z, t] of [[-12, 15, -40, 10], [10, 19, -45, 12], [0, 24, -55, 9], [24, 13, -38, 8]]) { const n = pegatinaNube("#ffffff", t); n.position.set(x, y, z); (n.material as THREE.SpriteMaterial).fog = false; fuera.add(n); }

  // ------------------------------------------------------------------ CALLE (años después)
  const calle = grupo(escena);
  en(caja(160, 0.2, 160, 0x5f6672, 0, { trama: "tierra", rx: 30, ry: 30 }), 0, -0.1, 0, calle);
  en(caja(60, 0.18, 6, 0xcfd3da, 0.03, { trama: "baldosa", rx: 30, ry: 3 }), 0, 0.02, 0, calle);
  for (let x = -20; x < 20; x += 3) en(caja(1.4, 0.02, 0.16, 0xfff8ef, 0), x, 0.01, 6, calle);            // línea de la calle
  const tiendas = ["CAFÉ", "FOTOS", "MÓVILES", "PIZZA"];
  [[-5.4, 7.5, 0x6fb1e8, "liso"], [-1.8, 10, 0xd9684a, "ladrillo"], [1.9, 7, 0xe6708a, "liso"], [5.6, 9, 0x7fcf9a, "liso"], [9.3, 7.5, 0xf0c35b, "ladrillo"], [-9.1, 8.5, 0xb89ae0, "liso"]].forEach(([x, h, col, tr], i) => {
    const e = en(caja(3.5, h as number, 3, col as number, 0.06, { trama: tr as "liso", rx: 2, ry: 4 }), x as number, (h as number) / 2, -4.6, calle);
    for (let y = 3.6; y < (h as number) - 0.8; y += 1.6) for (const dx of [-0.95, 0, 0.95]) {
      en(caja(0.66, 0.92, 0.06, 0xfff8ef, 0.03), dx, y - (h as number) / 2, 1.52, e);
      en(new THREE.Mesh(new THREE.PlaneGeometry(0.52, 0.78), luminoso((i + Math.round(y + dx)) % 3 ? 0xbfe6f5 : 0xffe9a8, 1.15)), dx, y - (h as number) / 2, 1.56, e);
    }
    en(caja(2.6, 1.6, 0.06, 0x2b3a4a, 0.03), 0, 1.3 - (h as number) / 2, 1.52, e);                         // vitrina
    en(new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.4), luminoso(0xcfefff, 1.2)), 0, 1.3 - (h as number) / 2, 1.56, e);
    const t = en(caja(3.0, 0.14, 0.9, [0xe2574c, 0x3fae8a, 0x5d7bd6, 0xf2b441][i % 4], 0.03), 0, 2.45 - (h as number) / 2, 1.9, e); t.rotation.x = 0.3;   // toldo
    if (i < 4) en(cartel(tiendas[i], 2.2, 0.5, "#2b2b33", "#fff8ef", 0.62), 0, 2.95 - (h as number) / 2, 1.56, e);
  });
  for (const x of [-3.6, 3.7]) {                                                                           // faroles
    en(cilindro(0.06, 0.08, 3.6, 0x2b2b33, 0.02, 8), x, 1.8, -2.4, calle);
    en(new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 8), luminoso(0xfff0c0, 2.2)), x, 3.7, -2.4, calle);
  }
  arbol(-6.6, -2.6, calle, 0.9, 0x54b35c); arbol(6.9, -2.6, calle, 0.8, 0x4aa855);
  en(cilindro(0.14, 0.16, 0.6, 0xe2382c, 0.03, 10), -1.7, 0.4, -2.2, calle);                                // hidrante
  for (const [x, y, z, t] of [[-8, 16, -30, 9], [9, 20, -36, 11]]) { const n = pegatinaNube("#ffffff", t); n.position.set(x, y, z); (n.material as THREE.SpriteMaterial).fog = false; calle.add(n); }

  // ------------------------------------------------------------------ NOCHE (la explicación)
  const noche = grupo(escena);
  en(caja(160, 0.2, 160, 0x2f3672, 0, { trama: "tierra", rx: 30, ry: 30 }), 0, -0.1, 0, noche);
  noche.add(matas(260, 22, 22, 0x4a56a8, 21, (x, z) => Math.abs(x) < 2.6 && Math.abs(z) < 2.4));
  piedras(18, 14, 14, noche, 8, 0x6a6fa8);
  en(new THREE.Mesh(new THREE.SphereGeometry(3.2, 20, 14), luminoso(0xfff4d0, 1.5)), -14, 26, -60, noche);   // luna
  for (const [x, z, r] of [[-26, -50, 20], [22, -56, 26], [52, -44, 18]]) { const c = en(roca(r, 0x2a2f6a, 0, {}, 2), x, -r * 0.6, z, noche); c.scale.y = 0.8; }
  arbol(-5.5, -4, noche, 1.3, 0x2f5a6a); arbol(5.8, -5, noche, 1.5, 0x2f5a6a); arbol(-8, 3, noche, 1.1, 0x2f5a6a);
  const pila = en(new THREE.Group(), -0.75, 0, -0.4, noche);
  let n = 0;
  for (let fila = 0; fila < 4; fila++) for (let i = 0; i < 4 - fila; i++) {
    const r = en(rollo(0.24, 0.52), (i - (3 - fila) / 2) * 0.52, 0.26 + fila * 0.5, (n++ % 2) * 0.12, pila);
    r.rotation.y = n;
  }
  const monedas = Array.from({ length: 16 }, () => { const m = cilindro(0.17, 0.17, 0.05, 0xffd23f, 0.025); m.rotation.x = Math.PI / 2; (m.material as THREE.MeshToonMaterial).emissive.set(0x3a2800); noche.add(m); return m; });
  const pedestal = en(caja(0.9, 0.8, 0.7, 0x5a4a9a, 0.035, { trama: "liso" }), -0.3, 0.4, 0.4, noche);
  const cuernos = [-1, 1].map((s) => { const c = cono(0.1, 0.34, 0xe2382c, 0.03, 10); (c.material as THREE.MeshToonMaterial).emissive.set(0x8a1010); c.rotation.z = -s * 0.5; noche.add(c); return c; });
  const luzNoche = new THREE.PointLight(0xffc98a, 9, 12, 1.4); luzNoche.position.set(0.3, 3.6, 3.0); noche.add(luzNoche);

  // ------------------------------------------------------------------ OBJETOS que se mueven
  const cosas = grupo(escena);
  // La cámara digital de 1975: una caja azul con lente, circuitos encima y ranura de casete.
  const camara = grupo(cosas);
  const camCuerpo = en(caja(0.62, 0.4, 0.42, 0x3f6fb5, 0.035, { trama: "metal" }), 0, 0.2, 0, camara);
  const camLente = en(new THREE.Group(), 0, 0.2, 0.21, camara);
  const tubo = cilindro(0.14, 0.14, 0.2, 0xc7ccd4); tubo.rotation.x = Math.PI / 2; en(tubo, 0, 0, 0.1, camLente);
  const vidrio = cilindro(0.1, 0.1, 0.02, 0x1d2540, 0); vidrio.rotation.x = Math.PI / 2; en(vidrio, 0, 0, 0.21, camLente);
  const camPlacas = en(new THREE.Group(), 0, 0.4, 0, camara);
  en(caja(0.52, 0.035, 0.34, 0x2f9e5b, 0.02), 0, 0.05, 0, camPlacas);
  en(caja(0.52, 0.035, 0.34, 0x2f9e5b, 0.02), 0, 0.13, 0, camPlacas);
  en(caja(0.1, 0.07, 0.1, 0x22252b, 0.015), -0.12, 0.185, 0.04, camPlacas);
  en(caja(0.07, 0.07, 0.16, 0xd9482f, 0.015), 0.14, 0.185, -0.03, camPlacas);
  en(caja(0.03, 0.2, 0.3, 0x22252b, 0.015), 0.32, 0.2, 0, camara);    // ranura del casete
  const chip = grupo(cosas);
  chip.add(caja(0.2, 0.05, 0.2, 0x2b2b33, 0.02));
  en(caja(0.1, 0.02, 0.1, 0x7fd6ff, 0.0), 0, 0.03, 0, chip);
  en(caja(0.26, 0.02, 0.14, 0xffd23f, 0.0), 0, -0.01, 0, chip);
  const casete = grupo(cosas);
  casete.add(caja(0.3, 0.19, 0.045, 0x3a3a44, 0.02));
  en(caja(0.24, 0.08, 0.01, 0xfff8ef, 0), 0, 0.03, 0.025, casete);
  const tostadora = grupo(cosas);
  en(caja(0.52, 0.34, 0.26, 0xc7ccd4, 0.035, { trama: "metal" }), 0, 0.17, 0, tostadora);
  en(caja(0.06, 0.06, 0.04, 0x22252b, 0.01), 0.27, 0.2, 0, tostadora);
  const panes = [-0.11, 0.11].map((x) => en(caja(0.16, 0.2, 0.05, 0xd89a4e, 0.02), x, 0.3, 0, tostadora));
  const pilas = Array.from({ length: 16 }, () => {
    const p = grupo(cosas); p.add(cilindro(0.036, 0.036, 0.13, 0xe2574c, 0.015, 12));
    en(cilindro(0.016, 0.016, 0.03, 0xc7ccd4, 0.008, 8), 0, 0.075, 0, p); return p;
  });
  // Televisor: la pantalla es un lienzo de 40x40 "puntitos" que se va revelando.
  const tele = grupo(cosas);
  en(caja(1.1, 0.7, 0.7, 0x55321c, 0.035, { trama: "madera" }), 0, 0.35, 0, tele);                 // mueble
  en(caja(1.3, 1.0, 0.85, 0x8a5a3c, 0.04, { trama: "madera" }), 0, 1.2, 0, tele);
  const [fotoC, fotoG] = lienzo(40, 40);                               // la foto "original"
  fotoG.fillStyle = "#777"; fotoG.fillRect(0, 0, 40, 40);
  fotoG.fillStyle = "#333"; fotoG.beginPath(); fotoG.arc(20, 7, 5, 0, 7); fotoG.fill();
  fotoG.fillStyle = "#eee"; fotoG.beginPath(); fotoG.arc(20, 19, 11, 0, 7); fotoG.fill();
  fotoG.fillStyle = "#333"; fotoG.beginPath(); fotoG.arc(20, 17, 11.5, Math.PI, 0); fotoG.fill();   // pelo
  fotoG.fillStyle = "#111"; fotoG.fillRect(15, 17, 3, 3); fotoG.fillRect(23, 17, 3, 3); fotoG.fillRect(16, 24, 9, 2); fotoG.fillRect(14, 22, 2, 2); fotoG.fillRect(25, 22, 2, 2);
  fotoG.fillStyle = "#ccc"; fotoG.fillRect(12, 31, 16, 9);
  const [pantC, pantG] = lienzo(40, 40);
  const pantTex = textura(pantC); pantTex.magFilter = THREE.NearestFilter; pantTex.minFilter = THREE.NearestFilter; pantTex.generateMipmaps = false;
  en(new THREE.Mesh(new THREE.PlaneGeometry(0.84, 0.72), new THREE.MeshBasicMaterial({ map: pantTex, color: new THREE.Color(1.5, 1.5, 1.6) })), -0.12, 1.2, 0.431, tele);
  en(caja(0.9, 0.78, 0.02, 0x22252b, 0.02), -0.12, 1.2, 0.42, tele);
  for (const y of [1.42, 1.2]) { const p = cilindro(0.06, 0.06, 0.05, 0xd9d2c4, 0.015, 12); p.rotation.x = Math.PI / 2; en(p, 0.5, y, 0.44, tele); }
  for (const s of [-1, 1]) { const a = cilindro(0.015, 0.015, 0.8, 0xc7ccd4, 0.01, 6); a.rotation.z = -s * 0.5; en(a, s * 0.2, 2.05, 0, tele); }
  let filasPant = -1;
  const pantalla = (u: number) => {            // u = cuánto de la foto ya apareció (0..1)
    const filas = Math.round(u * 40);
    if (filas === filasPant) return; filasPant = filas;
    pantG.fillStyle = "#15181f"; pantG.fillRect(0, 0, 40, 40);
    if (filas > 0) pantG.drawImage(fotoC, 0, 0, 40, filas, 0, 0, 40, filas);
    pantTex.needsUpdate = true;
  };
  // Archivero con un cajón que se abre.
  const archivero = grupo(cosas);
  en(caja(1.5, 1.4, 1.0, 0x8d99a6, 0.04, { trama: "metal" }), 0, 0.7, 0, archivero);
  en(caja(1.3, 0.5, 0.04, 0x6f7b88, 0.02), 0, 0.4, 0.5, archivero);
  en(caja(0.4, 0.07, 0.06, 0x2b2b33, 0.015), 0, 0.4, 0.54, archivero);
  const cajon = en(new THREE.Group(), 0, 1.02, 0, archivero);
  en(caja(1.3, 0.5, 0.06, 0x6f7b88, 0.025), 0, 0, 0.5, cajon);
  en(caja(0.4, 0.07, 0.06, 0x2b2b33, 0.015), 0, 0, 0.55, cajon);
  en(caja(1.2, 0.06, 0.9, 0x55606c, 0.02), 0, -0.22, 0.02, cajon);
  for (const s of [-1, 1]) en(caja(0.05, 0.44, 0.9, 0x6f7b88, 0.02), s * 0.6, 0, 0.02, cajon);
  const candado = grupo(cosas);
  candado.add(caja(0.26, 0.22, 0.1, 0xffd23f, 0.025));
  const arco = conTinta(new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.03, 8, 16, Math.PI), material(0xc7ccd4)), 0.015);
  en(arco, 0, 0.11, 0, candado);
  const secreto = grupo(cosas);                 // caja de cartón que cae en el gancho
  en(caja(1.5, 1.5, 1.2, 0xc99a5b, 0.05, { trama: "carton" }), 0, 0.75, 0, secreto);
  en(caja(0.22, 1.52, 1.22, 0xe8d9b0, 0), 0, 0.75, 0, secreto);
  en(cartel("TOP\nSECRETO", 1.2, 0.8, "#c99a5b", "#d9482f", 0.8), 0, 0.8, 0.61, secreto);
  const telefonos = Array.from({ length: 6 }, () => {
    const t = grupo(cosas); t.add(caja(0.2, 0.34, 0.035, 0x22252b, 0.02));
    en(new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.28), luminoso(0x8fd0ff, 1.6)), 0, 0, 0.02, t); return t;
  });

  // ------------------------------------------------------------------ PRIMER PLANO
  // Cosas que se ponen muy cerca de la cámara, en una esquina del cuadro: salen borrosas y dan profundidad.
  const libros = grupo(cosas);
  [[0xe2574c, 0.1], [0x5d7bd6, -0.25], [0xf2b441, 0.3]].forEach(([col, giro], i) => { en(caja(0.34, 0.07, 0.25, col, 0.02), 0, 0.035 + i * 0.07, 0, libros).rotation.y = giro; });
  en(cilindro(0.055, 0.045, 0.1, 0xfff8ef, 0.015, 12), 0.04, 0.26, 0, libros);
  const rollosCerca = grupo(cosas);
  en(rollo(0.085, 0.2), -0.1, 0.1, 0, rollosCerca);
  en(acostado(rollo(0.085, 0.2), "z"), 0.13, 0.085, 0.05, rollosCerca).rotation.y = 0.5;
  const hojasCerca = grupo(cosas);
  for (const [x, y, r, col] of [[0, 0, 0.2, 0x3f9b4b], [0.22, 0.08, 0.15, 0x54b35c], [-0.2, 0.1, 0.14, 0x4aa855], [0.05, 0.2, 0.13, 0x58b862]] as const) en(roca(r, col, 0.02, { trama: "hojas" }, 1), x, y, 0, hojasCerca);
  const hierbaCerca = grupo(cosas);
  hierbaCerca.add(matas(16, 0.55, 0.25, 0x4fae4a, 31));
  const sillaCerca = grupo(cosas);
  en(caja(0.5, 0.75, 0.09, 0x7a2f3a, 0.025, { trama: "liso" }), 0, 0.375, 0, sillaCerca);
  const cartonCerca = grupo(cosas);
  en(caja(0.42, 0.3, 0.34, 0xc99a5b, 0.02, { trama: "carton" }), 0, 0.15, 0, cartonCerca);
  en(caja(0.07, 0.305, 0.345, 0xe8d9b0, 0), 0, 0.15, 0, cartonCerca);
  const hidranteCerca = grupo(cosas);
  en(cilindro(0.1, 0.12, 0.42, 0xe2382c, 0.02, 12), 0, 0.21, 0, hidranteCerca);
  en(esfera(0.1, 0xe2382c, 0.02), 0, 0.44, 0, hidranteCerca);
  en(acostado(cilindro(0.045, 0.045, 0.3, 0xc7ccd4, 0.012, 10), "z"), 0, 0.28, 0, hidranteCerca);
  // Objetos que los personajes llevan en la mano. Su punto de origen es donde va la mano.
  const martillo = grupo(cosas);
  en(cilindro(0.022, 0.022, 0.34, 0x9a6a44, 0.012, 8, { trama: "madera" }), 0, 0.15, 0, martillo);
  en(caja(0.2, 0.1, 0.1, 0x8d99a6, 0.018, { trama: "metal" }), 0, 0.33, 0, martillo);
  const maletin = grupo(cosas);
  en(caja(0.46, 0.32, 0.12, 0x7a4a2a, 0.022, { trama: "madera" }), 0, -0.22, 0, maletin);
  en(caja(0.16, 0.06, 0.04, 0x2b2b33, 0.012), 0, -0.03, 0, maletin);
  for (const x of [-0.13, 0.13]) en(caja(0.05, 0.07, 0.13, 0xffd23f, 0.008), x, -0.1, 0, maletin);
  const primeros = { libros, rollos: rollosCerca, hojas: hojasCerca, hierba: hierbaCerca, silla: sillaCerca, carton: cartonCerca, hidrante: hidranteCerca };

  // ------------------------------------------------------------------ efectos 2D
  const fx = grupo(escena);
  const destellos = Array.from({ length: 7 }, (_, i) => { const d = pegatinaEstrella(i ? "#fff6b0" : "#ffffff", 1); d.material.color.setScalar(2.2); fx.add(d); return d; });
  const risas = Array.from({ length: 5 }, () => { const r = pegatinaTexto("JA", "#ffe14d", 0.7); fx.add(r); return r; });
  const polvos = Array.from({ length: 5 }, () => { const p = pegatinaNube("#e8e2d8", 1); fx.add(p); return p; });
  const kilos = pegatinaTexto("4 kg", "#ffffff", 0.9); fx.add(kilos);
  const contador = letrero(0.7); fx.add(contador.sprite);

  // ------------------------------------------------------------------ actores
  const actores = {
    steve: new Personaje({ camisa: "#e8a23a", pantalon: "#5a4632", pelo: "lado", colorPelo: "#6b3d1f", gafas: true, ropa: "sueter", detalle: "#b5562a", plumas: true, zapatos: "#7a4a2a" }, 1),
    jefe: new Personaje({ camisa: "#3c4466", pantalon: "#2a2f45", pelo: "calvo", colorPelo: "#9a9a9a", bigote: true, corbata: "#d9482f", ropa: "saco", detalle: "#2c3350", zapatos: "#1b1420" }, 2),
    jefe2: new Personaje({ camisa: "#5a5f6e", pantalon: "#33363f", pelo: "corto", colorPelo: "#2b2b33", corbata: "#2f9e5b", ropa: "saco", detalle: "#454a58", zapatos: "#1b1420" }, 3),
    jefe3: new Personaje({ camisa: "#7a5440", pantalon: "#3a2a22", pelo: "corto", colorPelo: "#c9c2b8", gafas: true, corbata: "#f2b441", ropa: "saco", detalle: "#5f4030", zapatos: "#1b1420" }, 4),
    ayudante: new Personaje({ camisa: "#f6f6f2", pantalon: "#2a6f5a", pelo: "mono", colorPelo: "#3a2418", ropa: "bata", detalle: "#3fae8a", zapatos: "#2a6f5a" }, 5),
  };
  const colores = ["#e2574c", "#5d7bd6", "#f2b441", "#b06fd6", "#3fae8a", "#ef7fa8"];
  const gente = colores.map((c, i) => new Personaje({ camisa: c, pantalon: ["#3a3f55", "#2b4a6a", "#4a3a55"][i % 3], pelo: (["corto", "mono", "lado"] as const)[i % 3],
    colorPelo: ["#2b2b33", "#8a4a2a", "#d9b25a"][i % 3], gafas: i === 3, ropa: i % 2 ? "sudadera" : "camiseta", detalle: colores[(i + 2) % 6], zapatos: ["#fff8ef", "#e2574c", "#2b2b33"][i % 3] }, 10 + i));
  const todos = [...Object.values(actores), ...gente];
  todos.forEach((p) => escena.add(p.grupo));

  const sets = { lab, sala, fuera, calle, noche };
  const movibles: THREE.Object3D[] = [camara, chip, casete, tostadora, ...pilas, tele, archivero, candado, secreto, ...telefonos,
    ...destellos, ...risas, ...polvos, kilos, contador.sprite, ...humos, ...monedas, ...cuernos, ...Object.values(primeros), martillo, maletin];

  /** Deja todo escondido y en su estado inicial. Se llama al empezar cada cuadro. */
  const reiniciar = () => {
    Object.values(sets).forEach((s) => (s.visible = false));
    movibles.forEach((o) => { o.visible = false; o.rotation.set(0, 0, 0); o.scale.setScalar(1); });
    monedas.forEach((m) => (m.rotation.x = Math.PI / 2));
    cuernos.forEach((c, i) => (c.rotation.z = (i ? -1 : 1) * 0.5));
    [camPlacas, camLente, camCuerpo].forEach((o) => o.scale.setScalar(1));
    cajon.position.z = 0;
    panes.forEach((p) => (p.position.y = 0.3));
    letreroFabrica.position.set(0, 3.0, -3.9); letreroFabrica.rotation.set(0, 0, 0);
    corona.position.set(1.6, 6.62, -6); corona.rotation.set(0, 0, 0); corona.visible = true;
    rolloGigante.rotation.set(0, 0, 0);
    cerrado.visible = false; pedestal.visible = false;
    foco.intensity = 0;
    todos.forEach((p) => p.reiniciar());
  };

  const look = lookNormal();
  return { look, lucesNoche, luzLab, luzSala, luzMesa, foquitos, escena, ambiente, sol, foco, boveda, cielos, sets, actores, gente, todos, reiniciar, pantalla,
    camara, camPlacas, camLente, camCuerpo, chip, casete, tostadora, panes, pilas, tele, archivero, cajon, candado, secreto, telefonos,
    letreroFabrica, cerrado, rolloGigante, corona, humos, monedas, pedestal, cuernos, pila,
    destellos, risas, polvos, kilos, contador, primeros, martillo, maletin };

}
export type Mundo = ReturnType<typeof crearMundo>;
