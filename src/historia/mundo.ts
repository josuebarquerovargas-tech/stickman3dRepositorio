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
/** Conos de luz que se ven en el aire bajo cada lámpara (se llenan en crearMundo). */
const haces: THREE.Mesh[] = [];
/** Cono de luz translúcido: la punta queda en (0, 0, 0) del padre y se abre hacia abajo. */
function haz(radio: number, alto: number, color: number, fuerza: number, padre: THREE.Object3D) {
  const m = new THREE.Mesh(new THREE.ConeGeometry(radio, alto, 28, 1, true),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: fuerza, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
  m.position.y = -alto / 2; m.userData.fuerza = fuerza; padre.add(m); haces.push(m);
  return m;
}
/** Farol de calle: poste, foco que brilla, cono de luz y la luz misma. */
function farol(x: number, z: number, padre: THREE.Object3D, alto = 3.5, color = 0xffc98a) {
  const g = en(new THREE.Group(), x, 0, z, padre);
  en(cilindro(0.06, 0.09, alto, 0x2b2b33, 0.02, 8), 0, alto / 2, 0, g);
  en(cilindro(0.16, 0.2, 0.1, 0x2b2b33, 0.02, 10), 0, 0.05, 0, g);
  en(cono(0.34, 0.24, 0x2b2b33, 0.025, 12), 0, alto + 0.2, 0, g);
  en(new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 8), luminoso(color, 3.2)), 0, alto, 0, g);
  const l = new THREE.PointLight(color, 0, 11, 1.5); l.position.set(0, alto - 0.2, 0.3); g.add(l);
  haz(1.4, alto, color, 0.06, en(new THREE.Group(), 0, alto, 0, g));
  return l;
}
/** Aplique de pared con su luz. */
function aplique(x: number, y: number, z: number, padre: THREE.Object3D, color = 0xffc080) {
  const g = en(new THREE.Group(), x, y, z, padre);
  en(caja(0.16, 0.3, 0.1, 0x7a5a2a, 0.02), 0, -0.1, 0, g);
  en(cono(0.2, 0.26, 0xfff0c8, 0.02, 12), 0, 0.12, 0.14, g);
  en(new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), luminoso(color, 4)), 0, 0.02, 0.14, g);
  const l = new THREE.PointLight(color, 0, 6, 1.6); l.position.set(0, 0, 0.5); g.add(l);
  haz(0.8, 1.6, color, 0.05, en(new THREE.Group(), 0, 0.05, 0.14, g));
  return l;
}
/** Lámpara colgante con foco que brilla y su luz. */
function lamparaTecho(x: number, y: number, z: number, padre: THREE.Object3D, color = 0xffd9a0, fuerza = 30) {
  const g = en(new THREE.Group(), x, y, z, padre);
  haz(1.9, y - 0.1, color, 0.028, g);
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
  haces.length = 0;
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
    amanecer: cielo(["#3b4aa8", "#8f6fc4", "#f08fb0", "#ffd7a0"]),
    ocaso: cielo(["#3b3f5c", "#6c5f86", "#b98a92", "#f0b48a"]),
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
  const ventanaLab = en(new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.8), luminoso(0x9fdcff, 1.5)), -2.6, 3.6, -3.14, lab);
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
  haz(0.75, 0.8, 0xffc98a, 0.1, en(new THREE.Group(), 1.4, 1.86, -0.3, mesa));

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
  const apliques = [-1.75, 1.75].map((x) => aplique(x, 3.0, -3.2, sala));

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
  const farolFuera = farol(1.65, -1.3, fuera, 3.3);
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
  const farolesCalle = [-3.6, 3.7].map((x) => farol(x, -2.4, calle, 3.6, 0xffd9a0));
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
  const farolNoche = farol(-0.15, -1.9, noche, 3.6);
  const faroles = [farolFuera, ...farolesCalle, farolNoche];

  // ------------------------------------------------------------------ RELLENO DEL MUNDO
  // Objetos pequeños que cuentan la época y el lugar. Van en el fondo, sobre los muebles y algunos en el
  // suelo cerca de la cámara (salen borrosos). Ninguno estorba el camino de los personajes.
  const papel = (x: number, y: number, z: number, padre: THREE.Object3D, giro = 0, color = 0xfff8ef) => { const p = en(caja(0.26, 0.015, 0.34, color, 0.01), x, y, z, padre); p.rotation.y = giro; return p; };
  const taza = (x: number, y: number, z: number, padre: THREE.Object3D, color = 0xfff8ef) => { en(cilindro(0.06, 0.05, 0.12, color, 0.015, 12), x, y + 0.06, z, padre); en(new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.012, 6, 10), material(color)), x + 0.07, y + 0.06, z, padre); };
  const carrete = (x: number, y: number, z: number, padre: THREE.Object3D, r = 0.2) => { const c = en(cilindro(r, r, 0.05, 0x2b2b33, 0.018, 20), x, y, z, padre); en(cilindro(r * 0.35, r * 0.35, 0.06, 0xc7ccd4, 0.01, 12), 0, 0, 0, c); return c; };
  const placa = (x: number, y: number, z: number, padre: THREE.Object3D, giro = 0) => {          // tarjeta de circuitos con chips
    const g = en(new THREE.Group(), x, y, z, padre); g.rotation.y = giro;
    g.add(caja(0.34, 0.02, 0.24, 0x2f9e5b, 0.012));
    for (const [cx, cz, w] of [[-0.09, -0.04, 0.1], [0.07, 0.05, 0.08], [0.08, -0.06, 0.05]]) en(caja(w, 0.03, 0.05, 0x22252b, 0), cx, 0.02, cz, g);
    en(caja(0.03, 0.04, 0.03, 0xffd23f, 0), -0.1, 0.03, 0.07, g); en(cilindro(0.018, 0.018, 0.05, 0xe2574c, 0, 8), 0, 0.03, 0.08, g);
    return g;
  };
  const cajaRotulo = (texto: string, w: number, h: number, d: number, x: number, z: number, padre: THREE.Object3D, giro = 0, y = 0) => {
    const g = en(new THREE.Group(), x, y, z, padre); g.rotation.y = giro;
    en(caja(w, h, d, 0xc99a5b, 0.03, { trama: "carton" }), 0, h / 2, 0, g);
    en(cartel(texto, w * 0.8, h * 0.45, "#e8d9b0", "#7a352b", 0.62), 0, h / 2, d / 2 + 0.012, g);
    return g;
  };
  const barril = (x: number, z: number, padre: THREE.Object3D, color = 0x9a6a44) => { const b = en(cilindro(0.3, 0.3, 0.8, color, 0.035, 14, { trama: "madera", rx: 2 }), x, 0.4, z, padre); for (const y of [-0.25, 0.25]) en(cilindro(0.31, 0.31, 0.05, 0x55606c, 0, 14), 0, y, 0, b); return b; };
  const flor = (x: number, z: number, padre: THREE.Object3D, color: number, alto = 0.3) => { en(cilindro(0.012, 0.012, alto, 0x3f8b3f, 0, 5), x, alto / 2, z, padre); en(esfera(0.06, color, 0.012), x, alto + 0.03, z, padre); };
  const maceta = (x: number, y: number, z: number, padre: THREE.Object3D, s = 1, color = 0x3f9b4b) => { en(cilindro(0.16 * s, 0.11 * s, 0.22 * s, 0xc9703f, 0.02, 12), x, y + 0.11 * s, z, padre); en(roca(0.2 * s, color, 0.025, { trama: "hojas" }, 1), x, y + 0.36 * s, z, padre); };
  const banca = (x: number, z: number, padre: THREE.Object3D, giro = 0) => {
    const g = en(new THREE.Group(), x, 0, z, padre); g.rotation.y = giro;
    en(caja(1.4, 0.08, 0.4, 0x9a6a44, 0.025, { trama: "madera", rx: 2 }), 0, 0.45, 0, g); en(caja(1.4, 0.4, 0.07, 0x9a6a44, 0.025, { trama: "madera", rx: 2 }), 0, 0.8, -0.2, g);
    for (const s of [-1, 1]) en(caja(0.08, 0.45, 0.4, 0x2b2b33, 0.02), s * 0.6, 0.22, 0, g);
    return g;
  };
  const basurero = (x: number, z: number, padre: THREE.Object3D, color = 0x4f8f6a) => { en(cilindro(0.24, 0.2, 0.62, color, 0.03, 12, { trama: "metal" }), x, 0.31, z, padre); en(cilindro(0.26, 0.26, 0.05, 0x2b2b33, 0.015, 12), x, 0.64, z, padre); };
  const buzon = (x: number, z: number, padre: THREE.Object3D, color = 0x3f6fb5) => { en(caja(0.08, 0.9, 0.08, 0x2b2b33, 0.02), x, 0.45, z, padre); en(caja(0.42, 0.34, 0.3, color, 0.03, { trama: "metal" }), x, 1.05, z, padre); en(caja(0.26, 0.03, 0.02, 0x1b1420, 0), x, 1.1, z + 0.16, padre); };
  const bici = (x: number, z: number, padre: THREE.Object3D, giro = 0, color = 0xe2574c) => {
    const g = en(new THREE.Group(), x, 0, z, padre); g.rotation.set(0, giro, 0.12);
    for (const s of [-1, 1]) en(conTinta(new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.03, 6, 18), material(0x2b2b33)), 0.015), s * 0.5, 0.33, 0, g);
    const t1 = en(caja(0.95, 0.045, 0.045, color, 0.012), 0, 0.6, 0, g); t1.rotation.z = 0.2;
    en(caja(0.045, 0.5, 0.045, color, 0.012), -0.2, 0.62, 0, g); en(caja(0.24, 0.05, 0.1, 0x2b2b33, 0.012), -0.2, 0.9, 0, g); en(caja(0.05, 0.05, 0.42, 0x2b2b33, 0.012), 0.45, 0.92, 0, g);
    return g;
  };
  const pajaro = (x: number, y: number, z: number, padre: THREE.Object3D, color = 0x55606c) => { en(esfera(0.09, color, 0.018), x, y + 0.09, z, padre); en(esfera(0.06, color, 0.014), x + 0.07, y + 0.17, z, padre); en(cono(0.02, 0.06, 0xf2b441, 0, 6), x + 0.14, y + 0.17, z, padre).rotation.z = -Math.PI / 2; };
  const bolsaDinero = (x: number, z: number, padre: THREE.Object3D, s = 1) => {
    const b = en(roca(0.26 * s, 0xcda86a, 0.03, { trama: "carton" }, 1), x, 0.22 * s, z, padre); b.scale.y = 1.05;
    en(cilindro(0.07 * s, 0.11 * s, 0.12 * s, 0xcda86a, 0.02, 8), x, 0.5 * s, z, padre);
    const p = pegatinaTexto("$", "#3f8b3f", 0.3 * s); p.position.set(x, 0.24 * s, z + 0.27 * s); padre.add(p);
  };

  // --- laboratorio de 1975: herramientas, piezas y papeles de un ingeniero
  en(cartel("1975", 0.7, 0.34, "#d9482f", "#fff8ef", 0.7), 1.0, 2.75, -3.2, lab);                          // calendario
  en(caja(0.72, 0.6, 0.03, 0xfff8ef, 0.02), 1.0, 2.3, -3.21, lab);
  for (let i = 0; i < 20; i++) en(caja(0.07, 0.07, 0.01, i === 13 ? 0xd9482f : 0xc9c2b8, 0), 0.76 + (i % 5) * 0.12, 2.5 - Math.floor(i / 5) * 0.12, -3.19, lab);
  en(caja(1.5, 1.0, 0.04, 0x2f5fa8, 0.03, { trama: "liso" }), -0.6, 2.75, -3.2, lab);                       // plano azul del aparato
  for (const [x, y, w, h] of [[-0.9, 2.85, 0.5, 0.36], [-0.25, 2.6, 0.36, 0.4], [-0.3, 3.05, 0.5, 0.02], [-0.95, 2.45, 0.6, 0.02]]) en(caja(w, h, 0.01, 0xbfdcff, 0), x, y, -3.17, lab);
  en(caja(0.9, 0.7, 0.05, 0xb98a5a, 0.03, { trama: "carton" }), 2.4, 2.6, -3.2, lab);                       // tablero de corcho con notas
  [[2.2, 2.75, 0xfff3a0], [2.55, 2.7, 0xffb0c0], [2.3, 2.45, 0xbfe6f5], [2.62, 2.42, 0xfff8ef]].forEach(([x, y, col], i) => { en(caja(0.2, 0.2, 0.01, col, 0.008), x, y, -3.16, lab).rotation.z = (i - 1.5) * 0.12; });
  en(caja(0.22, 0.34, 0.12, 0x3fae8a, 0.025), -4.1, 2.6, -3.18, lab); en(new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.02, 6, 12), material(0x2b2b33)), -4.1, 2.62, -3.1, lab);   // teléfono de pared
  placa(-0.55, 1.08, -0.42, mesa, 0.3); placa(0.3, 1.08, -0.45, mesa, -0.2);                                 // sobre la mesa
  en(cilindro(0.09, 0.09, 0.2, 0xc7e6ef, 0.02, 12), 0.75, 1.17, -0.45, mesa);                               // frasco de piezas
  for (let i = 0; i < 5; i++) en(caja(0.02, 0.07, 0.02, [0xe2574c, 0xf2b441, 0x5d7bd6][i % 3], 0), 0.72 + (i % 3) * 0.03, 1.14, -0.47 + (i % 2) * 0.04, mesa);
  en(cilindro(0.05, 0.05, 0.13, 0xd9482f, 0.015, 10), 1.05, 1.13, -0.42, mesa);                             // lapicero
  for (const [dx, col] of [[-0.02, 0xf2b441], [0.02, 0x2f6fd6]]) en(cilindro(0.008, 0.008, 0.16, col, 0, 5), 1.05 + dx, 1.24, -0.42, mesa);
  taza(1.5, 1.07, 0.2, mesa, 0xe2574c);                                                                      // café (sale vapor en la frase 2)
  carrete(-0.2, 1.1, -0.48, mesa, 0.11); carrete(-0.2, 1.15, -0.48, mesa, 0.11);                             // rollos de estaño
  en(caja(0.3, 0.2, 0.2, 0xf2b441, 0.025, { trama: "metal" }), -1.3, 1.17, 0.35, mesa);                     // multímetro
  en(new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.08), luminoso(0xfff3d6, 1.3)), -1.3, 1.21, 0.455, mesa);
  en(caja(0.6, 0.26, 0.3, 0xd9482f, 0.03, { trama: "metal" }), -1.6, 0.13, 1.9, lab).rotation.y = 0.5;      // caja de herramientas (cerca de la cámara)
  en(caja(0.3, 0.05, 0.05, 0x2b2b33, 0.015), -1.6, 0.3, 1.9, lab).rotation.y = 0.5;
  carrete(1.55, 0.03, 2.2, lab, 0.24).rotation.y = 0.4; carrete(1.75, 0.08, 2.05, lab, 0.2);                 // carretes de cinta en el piso
  for (const [x, z, r] of [[1.9, -2.2, 0.07], [2.3, -2.3, 0.06], [2.0, -1.9, 0.05], [-1.2, 2.4, 0.06]]) en(roca(r, 0xfff8ef, 0.015), x, r, z, lab);   // bolas de papel
  for (const [x, z, r, col] of [[0.9, 1.9, 0.3, 0x2b2b33], [-0.8, 2.6, 0.24, 0xd9482f], [2.4, 0.4, 0.34, 0x2b2b33]] as const) { const c = en(new THREE.Mesh(new THREE.TorusGeometry(r, 0.02, 6, 20), material(col)), x, 0.03, z, lab); c.rotation.x = Math.PI / 2; }   // cables
  cajaRotulo("PIEZAS", 0.7, 0.5, 0.5, -3.0, -1.3, lab, 0.4); cajaRotulo("FRÁGIL", 0.6, 0.45, 0.5, -3.9, -2.2, lab, -0.2);
  en(caja(0.9, 1.5, 0.5, 0x8d99a6, 0.035, { trama: "metal" }), 4.8, 0.75, -2.8, lab);                       // archivero al fondo
  maceta(-1.3, 2.62, -3.05, lab, 1.1);                                                                        // planta en la ventana

  // --- sala de juntas: cosas de oficina de los 70
  en(cilindro(0.12, 0.1, 0.3, 0xbfe6f5, 0.02, 12), -1.6, 1.23, -1.3, sala);                                 // jarra de agua y vasos
  for (const x of [-1.9, -1.35, 1.5]) en(cilindro(0.045, 0.04, 0.1, 0xdff3fa, 0.012, 10), x, 1.13, -1.05, sala);
  en(cilindro(0.11, 0.09, 0.04, 0x8a9aa6, 0.015, 12), 0.45, 1.1, -0.85, sala);                               // cenicero
  en(caja(0.3, 0.12, 0.2, 0x2b2b33, 0.02), 1.75, 1.14, -1.4, sala); en(caja(0.34, 0.06, 0.07, 0x2b2b33, 0.015), 1.75, 1.23, -1.4, sala);   // teléfono de disco
  for (const [x, col] of [[-1.0, 0xe2574c], [0.05, 0x3fae8a], [1.05, 0x5d7bd6]]) { papel(x - 0.25, 1.09, -1.5, sala, 0.2, col); en(caja(0.3, 0.08, 0.05, 0xffd23f, 0.012), x, 1.12, -0.62, sala); }   // carpetas y placas con el nombre
  en(cilindro(0.04, 0.04, 0.12, 0x2b2b33, 0.012, 8), -0.6, 1.14, -1.55, sala);                               // portaplumas
  const credenza = en(new THREE.Group(), 2.9, 0, -3.0, sala);                                                // mueble bajo con trofeos
  en(caja(1.9, 0.95, 0.5, 0x6e4326, 0.035, { trama: "madera", rx: 2 }), 0, 0.47, 0, credenza);
  for (const x of [-0.45, 0.45]) { en(caja(0.8, 0.7, 0.03, 0x55321c, 0.02), x, 0.47, 0.26, credenza); en(esfera(0.035, 0xffd23f, 0.01), x * 0.2, 0.5, 0.29, credenza); }
  en(esfera(0.2, 0x4f9ad6, 0.025), -0.6, 1.25, 0, credenza); en(cilindro(0.04, 0.12, 0.1, 0x7a5a2a, 0.015, 10), -0.6, 1.0, 0, credenza);   // globo terráqueo
  for (const [x, h] of [[0.1, 0.34], [0.45, 0.26], [0.75, 0.3]]) { en(cilindro(0.07, 0.04, h, 0xffd23f, 0.018, 10), x, 0.95 + h / 2, 0, credenza); en(caja(0.16, 0.05, 0.16, 0x2b2b33, 0.012), x, 0.97, 0, credenza); }
  const librero = en(new THREE.Group(), -4.6, 0, -3.0, sala);
  en(caja(1.5, 3.4, 0.5, 0x6e4326, 0.035, { trama: "madera", rx: 2, ry: 3 }), 0, 1.7, 0, librero);
  { const r = dado(77); for (let f = 0; f < 4; f++) { let x = -0.62; while (x < 0.55) { const w = 0.07 + r() * 0.08, h = 0.4 + r() * 0.22; en(caja(w, h, 0.3, [0x7a2f3a, 0x2f5a6a, 0x8a6a2a, 0x3a4a7a, 0x55321c][Math.floor(r() * 5)], 0.012), x + w / 2, 0.45 + f * 0.78 + h / 2, 0.13, librero); x += w + 0.01; } } }
  en(acostado(cilindro(0.36, 0.36, 0.07, 0xfff8ef, 0.035)), -1.75, 4.45, -3.2, sala);                        // reloj de pared
  for (const [a, l] of [[1.9, 0.2], [0.3, 0.28]]) { const h = caja(0.035, l, 0.02, 0x1b1420, 0); h.position.set(-1.75 + Math.sin(a) * l / 2, 4.45 + Math.cos(a) * l / 2, -3.15); h.rotation.z = -a; sala.add(h); }
  cuadro(1.75, 4.4, -3.2, 0.5, 0.36, 0xfff8ef, sala);                                                        // diploma
  for (const x of [-1.9, 1.9]) { en(caja(0.5, 0.36, 0.14, 0x7a4a2a, 0.022, { trama: "madera" }), x, 0.18, -0.3, sala).rotation.y = x * 0.2; en(caja(0.16, 0.05, 0.04, 0x2b2b33, 0.01), x, 0.38, -0.3, sala); }   // maletines junto a la mesa
  en(cilindro(0.04, 0.06, 1.9, 0x55321c, 0.02, 8), 4.3, 0.95, -2.9, sala); en(cono(0.28, 0.16, 0x2b2b33, 0.02, 14), 4.3, 1.95, -2.9, sala);   // perchero con sombrero
  basurero(-3.0, -2.5, sala, 0x8a5a3c);

  // --- afuera de la fábrica
  cajaRotulo("ROLLOS", 0.9, 0.7, 0.7, 2.6, -3.5, fuera, -0.15); cajaRotulo("ROLLOS", 0.8, 0.6, 0.7, 3.5, -3.6, fuera, 0.25); cajaRotulo("ROLLOS", 0.7, 0.5, 0.6, 2.7, -3.5, fuera, 0.3, 0.7);
  barril(-3.5, -3.5, fuera); barril(-4.1, -3.3, fuera, 0x5d7bd6);
  buzon(1.75, 3.2, fuera); banca(-2.75, -3.35, fuera, 0.05); bici(2.35, 5.5, fuera, 1.45);
  { const r = dado(42); for (let i = 0; i < 36; i++) { const s = i % 2 ? 1 : -1; flor(s * (1.55 + r() * 0.35), -2.5 + r() * 12, fuera, [0xff6f8f, 0xffd23f, 0xfff8ef, 0xb06fd6][i % 4], 0.2 + r() * 0.16); } }   // flores a los lados del camino
  for (const x of [-3.1, -0.6, 2.4]) pajaro(x, 4.62, -3.9, fuera);                                           // pájaros en la cornisa
  en(acostado(cilindro(0.34, 0.34, 0.07, 0xfff8ef, 0.035)), 0, 2.95, -3.97, fuera);                          // reloj sobre la puerta
  en(caja(0.07, 2.2, 0.07, 0xc7ccd4, 0.02), -3.6, 5.7, -4.2, fuera); en(caja(0.7, 0.42, 0.02, 0xf6c32c, 0.02), -3.22, 6.55, -4.2, fuera);   // asta con bandera amarilla
  en(caja(1.2, 0.14, 1.0, 0xb98a5a, 0.03, { trama: "madera" }), 3.3, 0.07, -2.4, fuera);                    // tarima
  for (const [x, z, r] of [[0.7, 6.5, 0.5], [-0.6, 10, 0.4]]) { const c = en(cilindro(r, r, 0.012, 0x9fd0f0, 0, 18), x, 0.05, z, fuera); c.scale.z = 0.6; }   // charcos
  en(caja(0.07, 1.3, 0.07, 0xfff8ef, 0.02), -1.75, 0.65, 1.2, fuera); en(cartel("ENTRADA", 0.9, 0.3, "#3f6fb5", "#fff8ef", 0.66), -1.75, 1.2, 1.25, fuera);   // letrero
  basurero(1.75, -2.9, fuera, 0x7a8794);

  // --- la calle de los años 2000
  banca(-0.9, -2.75, calle); banca(4.6, -2.75, calle); basurero(0.6, -2.7, calle); basurero(-5.2, -2.7, calle, 0x5d7bd6);
  buzon(2.2, -2.75, calle, 0xe2382c); bici(6.2, -2.7, calle, 0.1, 0x3fa3c9);
  for (const x of [-4.6, -2.6, 1.3, 3.2, 5.6, 7.6]) maceta(x, 0.1, -2.95, calle, 1.5, x % 2 ? 0x54b35c : 0x3f9b4b);
  { const g = en(new THREE.Group(), -2.0, 0.1, -2.5, calle); for (const s of [-1, 1]) { const t = en(caja(0.6, 0.9, 0.04, 0x2b2b33, 0.02), 0, 0.42, s * 0.14, g); t.rotation.x = s * 0.28; } en(cartel("WIFI\nGRATIS", 0.5, 0.6, "#2b2b33", "#7dff9a", 0.7), 0, 0.45, 0.185, g).rotation.x = 0.28; }   // letrero de piso
  en(caja(4.2, 1.5, 0.12, 0x2b2b33, 0.04), 1.9, 8.1, -4.4, calle); en(cartel("FOTO DIGITAL", 4.0, 1.3, "#5d7bd6", "#fff8ef", 0.6), 1.9, 8.1, -4.32, calle);   // anuncio en la azotea
  for (const x of [1.0, 2.8]) en(caja(0.1, 0.9, 0.1, 0x2b2b33, 0.02), x, 7.0, -4.4, calle);
  for (const [x, y] of [[-5.4, 7.5], [5.6, 9], [9.3, 7.5]]) { en(cilindro(0.02, 0.02, 1.0, 0x9aa3ad, 0.012, 5), x + 0.8, y + 0.5, -4.6, calle); const p = en(cono(0.4, 0.16, 0xdfe5ea, 0.025, 14), x - 0.6, y + 0.3, -4.4, calle); p.rotation.x = 2.2; }   // antenas y parabólicas
  for (const [x, y] of [[-6.3, 3.0], [0.9, 4.6], [6.6, 3.1]]) en(caja(0.6, 0.4, 0.3, 0xdfe5ea, 0.025, { trama: "metal" }), x, y, -2.95, calle);   // aires acondicionados
  for (const [x, z] of [[-1.2, -1.9], [3.6, -1.6], [3.95, -1.8], [-6, 1.6]]) pajaro(x, 0.1, z, calle, 0x8a93a0);   // palomas
  en(cilindro(0.5, 0.5, 0.02, 0x4a505c, 0.02, 16, { trama: "metal" }), 1.8, 0.115, 1.6, calle);              // tapa de alcantarilla
  for (const [x, z] of [[-2.2, 2.2], [0.4, 2.6]]) en(cono(0.16, 0.42, 0xff7a2a, 0.022, 12), x, 0.31, z, calle);   // conos (cerca de la cámara)
  en(caja(0.08, 2.6, 0.08, 0x8a93a0, 0.02), 5.4, 1.3, -2.2, calle); en(cartel("CALLE 12", 0.9, 0.26, "#3fae8a", "#fff8ef", 0.66), 5.4, 2.5, -2.14, calle);

  // --- la noche de la explicación: el negocio de los rollos
  bolsaDinero(-2.0, 0.2, noche, 1.1); bolsaDinero(-1.75, 0.75, noche, 0.8); bolsaDinero(2.2, -0.6, noche, 1.0);
  cajaRotulo("ROLLOS", 0.8, 0.6, 0.7, -2.4, -1.4, noche, 0.3); cajaRotulo("ROLLOS", 0.7, 0.5, 0.6, -2.3, -1.4, noche, -0.2, 0.6); cajaRotulo("ROLLOS", 0.8, 0.6, 0.7, 2.6, -1.9, noche, -0.3);
  const fuerte = en(new THREE.Group(), 2.1, 0, -1.7, noche); fuerte.rotation.y = -0.35;                      // caja fuerte
  en(caja(1.0, 1.2, 0.8, 0x55606c, 0.04, { trama: "metal" }), 0, 0.6, 0, fuerte); en(caja(0.8, 1.0, 0.04, 0x6f7b88, 0.025), 0, 0.6, 0.41, fuerte);
  en(acostado(cilindro(0.14, 0.14, 0.06, 0xc7ccd4, 0.02, 14)), 0, 0.65, 0.45, fuerte); en(caja(0.06, 0.22, 0.05, 0x2b2b33, 0.012), 0.28, 0.6, 0.45, fuerte);
  en(caja(1.5, 1.1, 0.08, 0x55321c, 0.03, { trama: "madera" }), -2.3, 2.3, -2.4, noche); en(cartel("VENTAS ↗", 1.36, 0.96, "#fff8ef", "#d9482f", 0.5), -2.3, 2.3, -2.35, noche);   // pizarra de ventas
  for (const x of [-2.9, -1.7]) en(caja(0.07, 1.8, 0.07, 0x55321c, 0.02), x, 0.9, -2.4, noche);
  { const r = dado(9); for (let i = 0; i < 9; i++) { const x = (i % 2 ? 1 : -1) * (1.5 + r() * 1.6), z = 0.9 + r() * 1.8, n = 2 + Math.floor(r() * 5); for (let k = 0; k < n; k++) en(cilindro(0.15, 0.15, 0.045, 0xffd23f, 0.018, 14), x, 0.03 + k * 0.047, z, noche); } }   // pilas de monedas
  barril(3.4, -0.8, noche, 0x5a4a9a); barril(-3.5, -0.2, noche, 0x5a4a9a);
  for (const [x, z, sz] of [[-3.6, 1.8, 0.9], [3.5, 1.6, 1.0], [0.4, -3.6, 1.2], [-4.6, -2, 1.1]]) arbusto(x, z, noche, sz);
  for (const [x, z] of [[-1.3, 3.1], [1.5, 3.3]]) { en(caja(0.14, 0.9, 0.14, 0x8a8ac8, 0.03), x, 0.45, z, noche); en(caja(1.2, 0.1, 0.06, 0x8a8ac8, 0.02), x, 0.62, z, noche); }   // cerca (cerca de la cámara)

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
  const luzTele = new THREE.PointLight(0xbfd0ff, 0, 5, 1.5); luzTele.position.set(-0.12, 1.25, 1.0); tele.add(luzTele);   // la pantalla alumbra
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
  const vapores = Array.from({ length: 6 }, () => { const p = pegatinaNube("#ffffff", 0.3); fx.add(p); return p; });
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
    ...destellos, ...risas, ...polvos, kilos, contador.sprite, ...humos, ...monedas, ...cuernos, ...Object.values(primeros), martillo, maletin, ...vapores];

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
    foco.intensity = 0; luzTele.intensity = 0;
    todos.forEach((p) => p.reiniciar());
  };

  const look = lookNormal();
  return { look, lucesNoche, luzLab, luzSala, luzMesa, foquitos, escena, ambiente, sol, foco, boveda, cielos, sets, actores, gente, todos, reiniciar, pantalla,
    camara, camPlacas, camLente, camCuerpo, chip, casete, tostadora, panes, pilas, tele, archivero, cajon, candado, secreto, telefonos,
    letreroFabrica, cerrado, rolloGigante, corona, humos, monedas, pedestal, cuernos, pila,
    destellos, risas, polvos, kilos, contador, primeros, martillo, maletin,
    haces, faroles, apliques, ventanaLab, luzTele, vapores, luzNoche };


}
export type Mundo = ReturnType<typeof crearMundo>;
