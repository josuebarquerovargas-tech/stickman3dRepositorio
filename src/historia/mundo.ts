// El "estudio de grabación": aquí se construyen los escenarios, los objetos y los actores.
// Todo se crea UNA vez. Luego, en cada cuadro, `tomas.ts` decide qué se ve y dónde está cada cosa.
import * as THREE from "three";
import { caja, cilindro, esfera, cono, en, cartel, lienzo, textura, material, conTinta, FUENTE,
  pegatinaTexto, pegatinaEstrella, pegatinaNube } from "../motor/formas";
import { Personaje } from "../motor/personaje";

const grupo = (padre: THREE.Object3D) => { const g = new THREE.Group(); padre.add(g); return g; };

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
  g.add(cilindro(r, r, h, 0xf6c32c));
  en(cilindro(r * 1.08, r * 1.08, h * 0.13, 0x2b2b33), 0, h * 0.47, 0, g);
  en(cilindro(r * 1.08, r * 1.08, h * 0.13, 0x2b2b33), 0, -h * 0.47, 0, g);
  en(cilindro(r * 0.35, r * 0.35, h * 0.2, 0x9aa3ad, 0.02), 0, h * 0.62, 0, g);
  return g;
}

function arbol(x: number, z: number, padre: THREE.Object3D, s = 1) {
  const g = en(new THREE.Group(), x, 0, z, padre);
  en(cilindro(0.16 * s, 0.22 * s, 1.5 * s, 0x7a4a2a), 0, 0.75 * s, 0, g);
  en(esfera(0.95 * s, 0x3f9b4b, 0.05), 0, 2.1 * s, 0, g);
  en(esfera(0.6 * s, 0x54b35c, 0.05), 0.5 * s, 2.7 * s, 0.1, g);
}

/** Texto 2D que se puede cambiar en cada cuadro (el contador de segundos). */
function letrero(tam: number) {
  const [c, g] = lienzo(512, 256);
  const tex = textura(c);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
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

  // ------------------------------------------------------------------ luces y cielo
  const ambiente = new THREE.HemisphereLight(0xffffff, 0x8a7a9a, 1.5);
  const sol = new THREE.DirectionalLight(0xfff1dd, 2.4);
  sol.position.set(-5, 10, 8);
  sol.castShadow = true;
  sol.shadow.mapSize.set(2048, 2048);
  Object.assign(sol.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12, near: 1, far: 40 });
  sol.shadow.bias = -0.0015;
  const foco = new THREE.PointLight(0xff3020, 0, 9);   // luz roja para el "enemigo"
  escena.add(ambiente, sol, sol.target, foco);
  const cielos = {
    dia: cielo(["#3d8fe0", "#8fd0ff", "#eaf8ff"]),
    gris: cielo(["#5d6470", "#9aa0aa", "#c9c7c4"]),
    noche: cielo(["#0d1040", "#2a2f7a", "#5a4a9a"]),
  };
  const boveda = new THREE.Mesh(new THREE.SphereGeometry(90, 24, 16),
    new THREE.MeshBasicMaterial({ map: cielos.dia, side: THREE.BackSide, fog: false }));
  escena.add(boveda);

  // ------------------------------------------------------------------ LABORATORIO
  const lab = grupo(escena);
  en(caja(18, 0.2, 14, 0xd2a878, 0), 0, -0.1, 0, lab);
  en(caja(18, 8, 0.3, 0x6fb4bf, 0), 0, 4, -3.4, lab);
  en(caja(18, 1.2, 0.36, 0x4d8b99, 0), 0, 0.6, -3.38, lab);
  en(caja(2.2, 1.9, 0.12, 0xfff3d6), -2.5, 3.5, -3.2, lab);          // ventana
  en(caja(1.9, 1.6, 0.14, 0x9fdcff, 0), -2.5, 3.5, -3.17, lab);
  en(caja(0.1, 1.6, 0.16, 0xfff3d6, 0), -2.5, 3.5, -3.15, lab);
  en(caja(2.4, 0.12, 0.5, 0x8a5a3c), 2.3, 3.3, -3.0, lab);            // repisa con cajas
  en(caja(0.5, 0.6, 0.4, 0xe2574c), 1.6, 3.66, -3.0, lab);
  en(caja(0.4, 0.8, 0.4, 0xf2b441), 2.2, 3.76, -3.0, lab);
  en(caja(0.6, 0.45, 0.4, 0x5d7bd6), 2.85, 3.58, -3.0, lab);
  const mesa = en(new THREE.Group(), 0, 0, -1.2, lab);                // mesa de trabajo
  en(caja(3.4, 0.14, 1.1, 0x9a6a44), 0, 1.0, 0, mesa);
  for (const x of [-1.5, 1.5]) for (const z of [-0.4, 0.4]) en(caja(0.14, 0.94, 0.14, 0x6e4326), x, 0.47, z, mesa);
  en(caja(0.7, 0.5, 0.5, 0x586070), -1.2, 1.32, -0.2, mesa);          // osciloscopio
  en(caja(0.4, 0.3, 0.02, 0x58f08a, 0), -1.2, 1.36, 0.06, mesa);
  en(cilindro(0.05, 0.05, 0.9, 0x444a55), 1.35, 1.5, -0.3, mesa);     // lámpara
  en(cono(0.26, 0.3, 0xf2b441), 1.35, 2.0, -0.3, mesa);

  // ------------------------------------------------------------------ SALA DE JUNTAS
  const sala = grupo(escena);
  en(caja(18, 0.2, 14, 0x8a4f63, 0), 0, -0.1, 0, sala);
  en(caja(18, 8, 0.3, 0xe6c896, 0), 0, 4, -3.4, sala);
  en(caja(18, 1.5, 0.36, 0x8a5a3c, 0), 0, 0.75, -3.38, sala);
  en(caja(4.6, 0.16, 1.4, 0x6e4326), 0, 1.0, -1.2, sala);
  for (const x of [-2, 2]) en(caja(0.3, 0.92, 1.0, 0x55321c), x, 0.46, -1.2, sala);
  const grafica = en(cartel("VENTAS\nDE ROLLOS ↗", 2.6, 1.3, "#fff8ef", "#d9482f", 0.62), 0, 4.1, -3.2, sala);
  en(caja(2.8, 1.5, 0.1, 0x55321c), 0, 4.1, -3.28, sala);
  void grafica;

  // ------------------------------------------------------------------ EXTERIOR: la fábrica
  const fuera = grupo(escena);
  en(caja(120, 0.2, 120, 0x7cc36a, 0), 0, -0.1, 0, fuera);
  en(caja(2.6, 0.04, 40, 0xe0d0a8, 0), 0, 0.02, 12, fuera);
  const fabrica = en(new THREE.Group(), 0, 0, -6, fuera);
  en(caja(7.6, 4.2, 4, 0xd9684a, 0.06), 0, 2.1, 0, fabrica);
  en(caja(8.0, 0.3, 4.4, 0x8d3f33, 0.05), 0, 4.35, 0, fabrica);
  for (const x of [-2.6, 2.6]) for (const y of [1.3, 3.0]) en(caja(1.0, 0.9, 0.1, 0xffe9a8, 0.04), x, y, 2.02, fabrica);
  en(caja(1.4, 2.0, 0.1, 0x4a2f25, 0.04), 0, 1.0, 2.02, fabrica);
  for (const x of [-2.9, -1.9]) en(cilindro(0.3, 0.38, 2.2, 0xa9523e, 0.05), x, 5.6, -0.8, fabrica);
  const letreroFabrica = en(new THREE.Group(), 0, 2.75, -3.9, fuera);
  letreroFabrica.add(caja(4.6, 0.95, 0.12, 0x2b2b33));
  en(cartel("FÁBRICA DE ROLLOS", 4.4, 0.78, "#f6c32c", "#2b1a12", 0.56), 0, 0, 0.08, letreroFabrica);
  const cerrado = en(cartel("CERRADO", 1.3, 0.5, "#fff8ef", "#d9482f", 0.6), 0, 1.25, -3.9, fuera);
  cerrado.rotation.z = -0.12;
  const rolloGigante = en(rollo(0.85, 1.7), 1.6, 5.35, -6, fuera);
  const corona = en(new THREE.Group(), 1.6, 6.5, -6, fuera);
  corona.add(cilindro(0.5, 0.5, 0.3, 0xffd23f, 0.04));
  for (let i = 0; i < 5; i++) en(cono(0.14, 0.4, 0xffd23f, 0.03, 8), Math.sin(i * 1.2566) * 0.42, 0.33, Math.cos(i * 1.2566) * 0.42, corona);
  const humos = [0, 1, 2, 3].map(() => { const h = pegatinaNube("#f4f4f4", 1.3); fuera.add(h); return h; });
  arbol(-6, -3, fuera, 1.3); arbol(6.2, -4, fuera, 1.5); arbol(-4.6, 4, fuera, 1.0); arbol(5, 6, fuera, 1.1); arbol(-8, 9, fuera, 1.2);
  for (const [x, y, z] of [[-9, 13, -30], [8, 16, -34], [1, 19, -40]]) { const n = pegatinaNube("#ffffff", 9); n.position.set(x, y, z); fuera.add(n); }

  // ------------------------------------------------------------------ CALLE (años después)
  const calle = grupo(escena);
  en(caja(120, 0.2, 120, 0x737b88, 0), 0, -0.1, 0, calle);
  en(caja(40, 0.16, 5, 0xc9cdd4, 0.03), 0, 0.02, 0.6, calle);
  [[-5.2, 7, 0x6fb1e8], [-1.5, 9.5, 0xf0a35b], [2.2, 6.5, 0xe6708a], [5.8, 8.5, 0x7fcf9a]].forEach(([x, h, col]) => {
    const e = en(caja(3.4, h, 3, col, 0.06), x, h / 2, -4, calle);
    for (let y = 1.6; y < h - 0.8; y += 1.5) for (const dx of [-0.9, 0, 0.9]) en(caja(0.55, 0.8, 0.06, 0xfff6c9, 0.03), dx, y - h / 2, 1.52, e);
  });

  // ------------------------------------------------------------------ NOCHE (la explicación)
  const noche = grupo(escena);
  en(caja(120, 0.2, 120, 0x39407d, 0), 0, -0.1, 0, noche);
  const pila = en(new THREE.Group(), -0.75, 0, -0.4, noche);
  let n = 0;
  for (let fila = 0; fila < 4; fila++) for (let i = 0; i < 4 - fila; i++) {
    const r = en(rollo(0.24, 0.52), (i - (3 - fila) / 2) * 0.52, 0.26 + fila * 0.5, (n++ % 2) * 0.12, pila);
    r.rotation.y = n;
  }
  const monedas = Array.from({ length: 16 }, () => { const m = cilindro(0.17, 0.17, 0.05, 0xffd23f, 0.025); m.rotation.x = Math.PI / 2; noche.add(m); return m; });
  const pedestal = en(caja(0.9, 0.8, 0.7, 0x5a4a9a), -0.3, 0.4, 0.4, noche);
  const cuernos = [-1, 1].map((s) => { const c = cono(0.1, 0.34, 0xe2382c, 0.03, 10); (c.material as THREE.MeshToonMaterial).emissive.set(0x8a1010); c.rotation.z = -s * 0.5; noche.add(c); return c; });

  // ------------------------------------------------------------------ OBJETOS que se mueven
  const cosas = grupo(escena);
  // La cámara digital de 1975: una caja azul con lente, circuitos encima y ranura de casete.
  const camara = grupo(cosas);
  const camCuerpo = en(caja(0.62, 0.4, 0.42, 0x3f6fb5), 0, 0.2, 0, camara);
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
  en(caja(0.52, 0.34, 0.26, 0xc7ccd4), 0, 0.17, 0, tostadora);
  en(caja(0.06, 0.06, 0.04, 0x22252b, 0.01), 0.27, 0.2, 0, tostadora);
  const panes = [-0.11, 0.11].map((x) => en(caja(0.16, 0.2, 0.05, 0xd89a4e, 0.02), x, 0.3, 0, tostadora));
  const pilas = Array.from({ length: 16 }, () => {
    const p = grupo(cosas); p.add(cilindro(0.036, 0.036, 0.13, 0xe2574c, 0.015, 12));
    en(cilindro(0.016, 0.016, 0.03, 0xc7ccd4, 0.008, 8), 0, 0.075, 0, p); return p;
  });
  // Televisor: la pantalla es un lienzo de 40x40 "puntitos" que se va revelando.
  const tele = grupo(cosas);
  en(caja(1.1, 0.7, 0.7, 0x55321c), 0, 0.35, 0, tele);                 // mueble
  en(caja(1.3, 1.0, 0.85, 0x8a5a3c), 0, 1.2, 0, tele);
  const [fotoC, fotoG] = lienzo(40, 40);                               // la foto "original"
  fotoG.fillStyle = "#777"; fotoG.fillRect(0, 0, 40, 40);
  fotoG.fillStyle = "#333"; fotoG.beginPath(); fotoG.arc(20, 7, 5, 0, 7); fotoG.fill();
  fotoG.fillStyle = "#eee"; fotoG.beginPath(); fotoG.arc(20, 19, 11, 0, 7); fotoG.fill();
  fotoG.fillStyle = "#333"; fotoG.beginPath(); fotoG.arc(20, 17, 11.5, Math.PI, 0); fotoG.fill();   // pelo
  fotoG.fillStyle = "#111"; fotoG.fillRect(15, 17, 3, 3); fotoG.fillRect(23, 17, 3, 3); fotoG.fillRect(16, 24, 9, 2); fotoG.fillRect(14, 22, 2, 2); fotoG.fillRect(25, 22, 2, 2);
  fotoG.fillStyle = "#ccc"; fotoG.fillRect(12, 31, 16, 9);
  const [pantC, pantG] = lienzo(40, 40);
  const pantTex = textura(pantC); pantTex.magFilter = THREE.NearestFilter; pantTex.minFilter = THREE.NearestFilter; pantTex.generateMipmaps = false;
  en(new THREE.Mesh(new THREE.PlaneGeometry(0.84, 0.72), new THREE.MeshBasicMaterial({ map: pantTex })), -0.12, 1.2, 0.431, tele);
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
  en(caja(1.5, 1.4, 1.0, 0x8d99a6), 0, 0.7, 0, archivero);
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
  en(caja(1.5, 1.5, 1.2, 0xc99a5b, 0.05), 0, 0.75, 0, secreto);
  en(cartel("TOP\nSECRETO", 1.2, 0.8, "#c99a5b", "#d9482f", 0.8), 0, 0.8, 0.61, secreto);
  const telefonos = Array.from({ length: 6 }, () => {
    const t = grupo(cosas); t.add(caja(0.2, 0.34, 0.035, 0x22252b, 0.02));
    en(caja(0.16, 0.28, 0.01, 0x8fd0ff, 0), 0, 0, -0.022, t); return t;
  });

  // ------------------------------------------------------------------ efectos 2D
  const fx = grupo(escena);
  const destellos = Array.from({ length: 7 }, (_, i) => { const d = pegatinaEstrella(i ? "#fff6b0" : "#ffffff", 1); fx.add(d); return d; });
  const risas = Array.from({ length: 5 }, () => { const r = pegatinaTexto("JA", "#ffe14d", 0.7); fx.add(r); return r; });
  const polvos = Array.from({ length: 5 }, () => { const p = pegatinaNube("#e8e2d8", 1); fx.add(p); return p; });
  const kilos = pegatinaTexto("4 kg", "#ffffff", 0.9); fx.add(kilos);
  const contador = letrero(0.7); fx.add(contador.sprite);

  // ------------------------------------------------------------------ actores
  const actores = {
    steve: new Personaje({ camisa: "#e8a23a", pantalon: "#5a4632", pelo: "lado", colorPelo: "#6b3d1f", gafas: true }, 1),
    jefe: new Personaje({ camisa: "#3c4466", pantalon: "#2a2f45", pelo: "calvo", colorPelo: "#9a9a9a", bigote: true, corbata: "#d9482f" }, 2),
    jefe2: new Personaje({ camisa: "#5a5f6e", pantalon: "#33363f", pelo: "corto", colorPelo: "#2b2b33", corbata: "#2f9e5b" }, 3),
    jefe3: new Personaje({ camisa: "#6b4a3a", pantalon: "#3a2a22", pelo: "corto", colorPelo: "#c9c2b8", gafas: true, corbata: "#f2b441" }, 4),
    ayudante: new Personaje({ camisa: "#3fae8a", pantalon: "#2a6f5a", pelo: "mono", colorPelo: "#3a2418" }, 5),
  };
  const colores = ["#e2574c", "#5d7bd6", "#f2b441", "#b06fd6", "#3fae8a", "#ef7fa8"];
  const gente = colores.map((c, i) => new Personaje({ camisa: c, pantalon: "#3a3f55", pelo: (["corto", "mono", "lado"] as const)[i % 3],
    colorPelo: ["#2b2b33", "#8a4a2a", "#d9b25a"][i % 3], gafas: i === 3 }, 10 + i));
  const todos = [...Object.values(actores), ...gente];
  todos.forEach((p) => escena.add(p.grupo));

  const sets = { lab, sala, fuera, calle, noche };
  const movibles: THREE.Object3D[] = [camara, chip, casete, tostadora, ...pilas, tele, archivero, candado, secreto, ...telefonos,
    ...destellos, ...risas, ...polvos, kilos, contador.sprite, ...humos, ...monedas, ...cuernos];

  /** Deja todo escondido y en su estado inicial. Se llama al empezar cada cuadro. */
  const reiniciar = () => {
    Object.values(sets).forEach((s) => (s.visible = false));
    movibles.forEach((o) => { o.visible = false; o.rotation.set(0, 0, 0); o.scale.setScalar(1); });
    monedas.forEach((m) => (m.rotation.x = Math.PI / 2));
    cuernos.forEach((c, i) => (c.rotation.z = (i ? -1 : 1) * 0.5));
    [camPlacas, camLente, camCuerpo].forEach((o) => o.scale.setScalar(1));
    cajon.position.z = 0;
    panes.forEach((p) => (p.position.y = 0.3));
    letreroFabrica.position.set(0, 2.75, -3.9); letreroFabrica.rotation.set(0, 0, 0);
    corona.position.set(1.6, 6.5, -6); corona.rotation.set(0, 0, 0); corona.visible = true;
    rolloGigante.rotation.set(0, 0, 0);
    cerrado.visible = false; pedestal.visible = false;
    foco.intensity = 0;
    todos.forEach((p) => p.reiniciar());
  };

  return { escena, ambiente, sol, foco, boveda, cielos, sets, actores, gente, todos, reiniciar, pantalla,
    camara, camPlacas, camLente, camCuerpo, chip, casete, tostadora, panes, pilas, tele, archivero, cajon, candado, secreto, telefonos,
    letreroFabrica, cerrado, rolloGigante, corona, humos, monedas, pedestal, cuernos, pila,
    destellos, risas, polvos, kilos, contador };
}
export type Mundo = ReturnType<typeof crearMundo>;
