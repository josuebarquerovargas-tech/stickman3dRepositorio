// Piezas 3D de caricatura: colores planos con sombra escalonada y contorno de tinta.
import * as THREE from "three";

export const TINTA = 0x1b1420;

// Rampa de 3 tonos: hace que la luz se vea "por escalones", como dibujo animado.
const rampa = new THREE.DataTexture(new Uint8Array([110, 110, 110, 255, 190, 190, 190, 255, 255, 255, 255, 255]), 3, 1);
rampa.minFilter = rampa.magFilter = THREE.NearestFilter;
rampa.needsUpdate = true;

export const material = (color: THREE.ColorRepresentation) => new THREE.MeshToonMaterial({ color, gradientMap: rampa });
const matTinta = new THREE.MeshBasicMaterial({ color: TINTA, side: THREE.BackSide });

/** Agrega el contorno negro: una copia un poco más grande de la pieza, pintada por dentro. */
export function conTinta<T extends THREE.Mesh>(m: T, grosor = 0.035): T {
  m.geometry.computeBoundingBox();
  const t = new THREE.Vector3();
  m.geometry.boundingBox!.getSize(t);
  const borde = new THREE.Mesh(m.geometry, matTinta);
  borde.scale.set((t.x + 2 * grosor) / Math.max(t.x, 1e-3), (t.y + 2 * grosor) / Math.max(t.y, 1e-3), (t.z + 2 * grosor) / Math.max(t.z, 1e-3));
  borde.name = "tinta";
  m.add(borde);
  return m;
}

const pieza = (g: THREE.BufferGeometry, color: THREE.ColorRepresentation, grosor: number) => {
  const m = new THREE.Mesh(g, material(color));
  m.castShadow = true;
  m.receiveShadow = true;
  return grosor > 0 ? conTinta(m, grosor) : m;
};

export const caja = (w: number, h: number, d: number, color: THREE.ColorRepresentation, grosor = 0.035) =>
  pieza(new THREE.BoxGeometry(w, h, d), color, grosor);
export const cilindro = (r1: number, r2: number, h: number, color: THREE.ColorRepresentation, grosor = 0.035, lados = 24) =>
  pieza(new THREE.CylinderGeometry(r1, r2, h, lados), color, grosor);
export const esfera = (r: number, color: THREE.ColorRepresentation, grosor = 0.035) =>
  pieza(new THREE.SphereGeometry(r, 24, 16), color, grosor);
export const cono = (r: number, h: number, color: THREE.ColorRepresentation, grosor = 0.035, lados = 20) =>
  pieza(new THREE.ConeGeometry(r, h, lados), color, grosor);

/** Coloca una pieza y la devuelve (para escribir menos). */
export function en<T extends THREE.Object3D>(o: T, x: number, y: number, z: number, padre?: THREE.Object3D): T {
  o.position.set(x, y, z);
  padre?.add(o);
  return o;
}

/** Crea un lienzo 2D para dibujar texturas. */
export function lienzo(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  return [c, c.getContext("2d")!];
}

export function textura(c: HTMLCanvasElement) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

export const FUENTE = "Montserrat, 'DejaVu Sans', sans-serif";

/** Cartel plano con texto (un lado). */
export function cartel(texto: string, w: number, h: number, fondo: string, color: string, tam = 0.6) {
  const px = 256;
  const [c, g] = lienzo(Math.round(w * px), Math.round(h * px));
  g.fillStyle = fondo; g.fillRect(0, 0, c.width, c.height);
  g.strokeStyle = "#1b1420"; g.lineWidth = 16; g.strokeRect(0, 0, c.width, c.height);
  g.fillStyle = color; g.textAlign = "center"; g.textBaseline = "middle";
  const lineas = texto.split("\n");
  const alto = (c.height * tam) / lineas.length;
  g.font = `900 ${alto}px ${FUENTE}`;
  lineas.forEach((l, i) => g.fillText(l, c.width / 2, c.height / 2 + (i - (lineas.length - 1) / 2) * alto * 1.05, c.width * 0.9));
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: textura(c) }));
  return m;
}

/** Dibujo 2D plano que siempre mira a la cámara (efectos: estrellas, "JA", polvo...). */
export function pegatina(dibujar: (g: CanvasRenderingContext2D, t: number) => void, tam = 1) {
  const [c, g] = lienzo(256, 256);
  dibujar(g, 256);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: textura(c), transparent: true, depthWrite: false }));
  s.scale.setScalar(tam);
  return s;
}

export const pegatinaTexto = (texto: string, color: string, tam = 1) =>
  pegatina((g, t) => {
    g.font = `900 ${t * 0.5}px ${FUENTE}`; g.textAlign = "center"; g.textBaseline = "middle";
    g.lineJoin = "round"; g.lineWidth = t * 0.09; g.strokeStyle = "#1b1420"; g.strokeText(texto, t / 2, t / 2, t * 0.9);
    g.fillStyle = color; g.fillText(texto, t / 2, t / 2, t * 0.9);
  }, tam);

export const pegatinaEstrella = (color: string, tam = 1) =>
  pegatina((g, t) => {
    g.translate(t / 2, t / 2);
    g.beginPath();
    for (let i = 0; i < 8; i++) { const r = i % 2 ? t * 0.14 : t * 0.44; const a = (i * Math.PI) / 4; g.lineTo(Math.sin(a) * r, -Math.cos(a) * r); }
    g.closePath();
    g.fillStyle = color; g.fill(); g.lineJoin = "round"; g.lineWidth = t * 0.045; g.strokeStyle = "#1b1420"; g.stroke();
  }, tam);

export const pegatinaNube = (color: string, tam = 1) =>
  pegatina((g, t) => {
    g.fillStyle = color; g.strokeStyle = "#1b1420"; g.lineWidth = t * 0.04;
    for (const [x, y, r] of [[0.32, 0.56, 0.2], [0.52, 0.42, 0.24], [0.7, 0.58, 0.19], [0.5, 0.62, 0.2]]) {
      g.beginPath(); g.arc(x * t, y * t, r * t, 0, 7); g.stroke();
    }
    for (const [x, y, r] of [[0.32, 0.56, 0.2], [0.52, 0.42, 0.24], [0.7, 0.58, 0.19], [0.5, 0.62, 0.2]]) {
      g.beginPath(); g.arc(x * t, y * t, r * t, 0, 7); g.fill();
    }
  }, tam);
