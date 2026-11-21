// Piezas 3D de caricatura: colores planos con sombra escalonada y contorno de tinta.
import * as THREE from "three";

export const TINTA = 0x1b1420;

// Rampa de 3 tonos: hace que la luz se vea "por escalones", como dibujo animado.
const rampa = new THREE.DataTexture(new Uint8Array([110, 110, 110, 255, 190, 190, 190, 255, 255, 255, 255, 255]), 3, 1);
rampa.minFilter = rampa.magFilter = THREE.NearestFilter;
rampa.needsUpdate = true;

/** Generador de números "al azar" repetible (misma semilla = mismos números). */
export function dado(semilla: number) {
  let a = semilla >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

export type Trama = "liso" | "madera" | "ladrillo" | "baldosa" | "hojas" | "pasto" | "tierra" | "tapiz" | "metal" | "carton" | "alfombra";
const tono = (c: THREE.Color, luz: number, alfa: number) => { const k = c.clone().offsetHSL(0, 0, luz); return `rgba(${(k.r * 255) | 0},${(k.g * 255) | 0},${(k.b * 255) | 0},${alfa})`; };
const texturas = new Map<string, THREE.CanvasTexture>();

/** Textura "pintada a mano": color base + manchas claras y oscuras + el dibujo propio de cada material. */
export function pintura(color: THREE.ColorRepresentation, trama: Trama = "liso", rx = 1, ry = 1) {
  const clave = `${new THREE.Color(color).getHexString()}|${trama}|${rx}|${ry}`;
  if (texturas.has(clave)) return texturas.get(clave)!;
  const N = 512, [c, g] = lienzo(N, N), r = dado(clave.length * 131 + new THREE.Color(color).getHex());
  const base = new THREE.Color(color).convertLinearToSRGB();   // para pintar en el lienzo con el color "de pantalla"
  g.fillStyle = tono(base, 0, 1); g.fillRect(0, 0, N, N);
  // dibuja algo repetido en los bordes para que la textura se pueda repetir sin costuras
  const envuelto = (x: number, y: number, rad: number, f: (x: number, y: number) => void) => {
    for (const dx of [-N, 0, N]) for (const dy of [-N, 0, N]) if (x + dx > -rad && x + dx < N + rad && y + dy > -rad && y + dy < N + rad) f(x + dx, y + dy);
  };
  // manchas de pintura
  for (let i = 0; i < 46; i++) {
    const x = r() * N, y = r() * N, rad = 30 + r() * 90, luz = (r() - 0.5) * 0.16;
    envuelto(x, y, rad, (px, py) => {
      const gr = g.createRadialGradient(px, py, 0, px, py, rad);
      gr.addColorStop(0, tono(base, luz, 0.5)); gr.addColorStop(1, tono(base, luz, 0));
      g.fillStyle = gr; g.beginPath(); g.ellipse(px, py, rad, rad * (0.5 + r() * 0.5), r() * 3, 0, 7); g.fill();
    });
  }
  const linea = (x0: number, y0: number, x1: number, y1: number, ancho: number, estilo: string) => { g.strokeStyle = estilo; g.lineWidth = ancho; g.lineCap = "round"; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); };
  if (trama === "madera") {
    for (let i = 0; i < 34; i++) {            // vetas
      const y = r() * N; g.strokeStyle = tono(base, -0.12 - r() * 0.1, 0.5); g.lineWidth = 1.5 + r() * 2.5; g.beginPath();
      for (let x = 0; x <= N; x += 32) g.lineTo(x, y + Math.sin(x * 0.02 + i) * 5);
      g.stroke();
    }
    for (let y = 0; y < N; y += 128) linea(0, y, N, y, 5, "rgba(30,16,10,0.75)");    // separación de tablas
    for (let i = 0; i < 5; i++) { const x = r() * N, y = r() * N; g.strokeStyle = tono(base, -0.18, 0.6); g.lineWidth = 2; for (const q of [5, 10, 15]) { g.beginPath(); g.ellipse(x, y, q * 1.6, q, 0, 0, 7); g.stroke(); } }
  } else if (trama === "ladrillo") {
    for (let f = 0; f < 8; f++) for (let k = -1; k < 4; k++) {
      const x = k * 128 + (f % 2) * 64, y = f * 64;
      g.fillStyle = tono(base, (r() - 0.5) * 0.14, 0.75); g.fillRect(x + 4, y + 4, 120, 56);
      g.strokeStyle = "rgba(40,18,12,0.7)"; g.lineWidth = 3; g.strokeRect(x + 4, y + 4, 120, 56);
    }
  } else if (trama === "baldosa") {
    for (let f = 0; f < 4; f++) for (let k = 0; k < 4; k++) {
      g.fillStyle = tono(base, (f + k) % 2 ? 0.07 : -0.06, 0.7); g.fillRect(k * 128, f * 128, 128, 128);
      g.strokeStyle = "rgba(40,25,20,0.55)"; g.lineWidth = 4; g.strokeRect(k * 128, f * 128, 128, 128);
    }
  } else if (trama === "hojas") {
    for (let i = 0; i < 420; i++) {
      const x = r() * N, y = r() * N, a = r() * 6.3, largo = 14 + r() * 16;
      g.fillStyle = tono(base, (r() - 0.45) * 0.3, 0.9);
      g.beginPath(); g.ellipse(x, y, largo, largo * 0.38, a, 0, 7); g.fill();
      if (i % 3 === 0) linea(x - Math.cos(a) * largo, y - Math.sin(a) * largo, x + Math.cos(a) * largo, y + Math.sin(a) * largo, 2, tono(base, 0.22, 0.8));
    }
  } else if (trama === "pasto") {
    for (let i = 0; i < 900; i++) { const x = r() * N, y = r() * N, h = 8 + r() * 16; linea(x, y, x + (r() - 0.5) * 8, y - h, 2.5, tono(base, (r() - 0.4) * 0.28, 0.8)); }
  } else if (trama === "tierra") {
    for (let i = 0; i < 700; i++) { g.fillStyle = tono(base, (r() - 0.5) * 0.3, 0.7); g.beginPath(); g.arc(r() * N, r() * N, 1 + r() * 4, 0, 7); g.fill(); }
    for (let i = 0; i < 14; i++) { const x = r() * N, y = r() * N; linea(x, y, x + (r() - 0.5) * 60, y + (r() - 0.5) * 30, 2, tono(base, -0.2, 0.5)); }
  } else if (trama === "tapiz") {
    for (let x = 0; x < N; x += 64) { g.fillStyle = tono(base, 0.05, 0.6); g.fillRect(x, 0, 26, N); }
    for (let f = 0; f < 8; f++) for (let k = 0; k < 8; k++) { const x = k * 64 + 45, y = f * 64 + (k % 2) * 32 + 16; g.fillStyle = tono(base, -0.1, 0.6); g.beginPath(); g.moveTo(x, y - 9); g.lineTo(x + 7, y); g.lineTo(x, y + 9); g.lineTo(x - 7, y); g.fill(); }
  } else if (trama === "metal") {
    for (let i = 0; i < 60; i++) { const y = r() * N; linea(0, y, N, y, 1 + r() * 3, tono(base, (r() - 0.5) * 0.25, 0.35)); }
  } else if (trama === "carton") {
    for (let y = 0; y < N; y += 9) linea(0, y, N, y, 1.5, tono(base, -0.1, 0.35));
    for (let i = 0; i < 200; i++) { g.fillStyle = tono(base, -0.18, 0.5); g.fillRect(r() * N, r() * N, 3, 1.5); }
  } else if (trama === "alfombra") {
    for (let i = 0; i < 1600; i++) { g.fillStyle = tono(base, (r() - 0.5) * 0.22, 0.6); g.fillRect(r() * N, r() * N, 3, 3); }
  } else {
    for (let i = 0; i < 90; i++) { const x = r() * N, y = r() * N, a = r() * 6.3; linea(x, y, x + Math.cos(a) * 26, y + Math.sin(a) * 26, 2 + r() * 3, tono(base, (r() - 0.5) * 0.14, 0.3)); }
  }
  const t = textura(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry);
  texturas.set(clave, t);
  return t;
}

/** Material de caricatura. Si das una `trama`, se ve pintado en vez de liso. */
export const material = (color: THREE.ColorRepresentation, trama?: Trama, rx = 1, ry = 1) =>
  trama ? new THREE.MeshToonMaterial({ map: pintura(color, trama, rx, ry), gradientMap: rampa })
        : new THREE.MeshToonMaterial({ color, gradientMap: rampa });
/** Material que brilla solo (lámparas, pantallas). `fuerza` > 1 hace que suelte resplandor. */
export const luminoso = (color: THREE.ColorRepresentation, fuerza = 2.5) => new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(fuerza) });
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

/** Opciones de una pieza: trama pintada y cuántas veces se repite. */
export type Op = { trama?: Trama; rx?: number; ry?: number; mat?: THREE.Material };
const pieza = (g: THREE.BufferGeometry, color: THREE.ColorRepresentation, grosor: number, o: Op = {}) => {
  const m = new THREE.Mesh(g, o.mat ?? material(color, o.trama, o.rx, o.ry));
  m.castShadow = true;
  m.receiveShadow = true;
  return grosor > 0 ? conTinta(m, grosor) : m;
};

export const caja = (w: number, h: number, d: number, color: THREE.ColorRepresentation, grosor = 0.035, o?: Op) =>
  pieza(new THREE.BoxGeometry(w, h, d), color, grosor, o);
export const cilindro = (r1: number, r2: number, h: number, color: THREE.ColorRepresentation, grosor = 0.035, lados = 24, o?: Op) =>
  pieza(new THREE.CylinderGeometry(r1, r2, h, lados), color, grosor, o);
export const esfera = (r: number, color: THREE.ColorRepresentation, grosor = 0.035, o?: Op) =>
  pieza(new THREE.SphereGeometry(r, 24, 16), color, grosor, o);
export const cono = (r: number, h: number, color: THREE.ColorRepresentation, grosor = 0.035, lados = 20, o?: Op) =>
  pieza(new THREE.ConeGeometry(r, h, lados), color, grosor, o);
/** Bola irregular de pocas caras: piedras, copas de árbol, arbustos. */
export const roca = (r: number, color: THREE.ColorRepresentation, grosor = 0.035, o?: Op, detalle = 0) =>
  pieza(new THREE.IcosahedronGeometry(r, detalle), color, grosor, o);

/** Matas de pasto: muchas hojitas finas repartidas en un rectángulo (una sola pieza, muy barata de dibujar). */
export function matas(n: number, ancho: number, fondo: number, color: THREE.ColorRepresentation, semilla = 1, evitar?: (x: number, z: number) => boolean) {
  const r = dado(semilla), pos: number[] = [], col: number[] = [], base = new THREE.Color(color);
  for (let i = 0; i < n; i++) {
    const x = (r() - 0.5) * ancho, z = (r() - 0.5) * fondo;
    if (evitar?.(x, z)) continue;
    const hojas = 4 + Math.floor(r() * 4), alto = 0.22 + r() * 0.3;
    for (let k = 0; k < hojas; k++) {
      const a = r() * 6.3, abre = 0.1 + r() * 0.22, h = alto * (0.6 + r() * 0.5), g = 0.022;
      const tx = x + Math.cos(a) * abre, tz = z + Math.sin(a) * abre, nx = -Math.sin(a) * g, nz = Math.cos(a) * g;
      pos.push(x - nx, 0, z - nz, x + nx, 0, z + nz, tx, h, tz);
      const c = base.clone().offsetHSL(0, 0, (r() - 0.5) * 0.2);
      for (let q = 0; q < 3; q++) col.push(c.r * (q === 2 ? 1.25 : 0.8), c.g * (q === 2 ? 1.25 : 0.8), c.b * (q === 2 ? 1.25 : 0.8));
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  return new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide }));
}

/** Estrellas pegadas al cielo. */
export function estrellas(n: number, radio = 85, semilla = 3) {
  const r = dado(semilla), pos: number[] = [];
  for (let i = 0; i < n; i++) { const a = r() * 6.3, e = 0.08 + r() * 1.4; pos.push(Math.cos(a) * Math.cos(e) * radio, Math.sin(e) * radio, Math.sin(a) * Math.cos(e) * radio); }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  return new THREE.Points(g, new THREE.PointsMaterial({ color: new THREE.Color(1.6, 1.6, 2.0), size: 2.4, sizeAttenuation: false, fog: false }));
}

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
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: textura(c), alphaTest: 0.35, alphaToCoverage: true }));
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
