// Personaje 2D: se dibuja en un lienzo (como en Paint) y ese dibujo se pega en una
// lámina plana dentro del mundo 3D. La lámina siempre gira para mirar a la cámara.
import * as THREE from "three";
import { lienzo, textura } from "./formas";

export type Cara = "neutral" | "feliz" | "sorpresa" | "risa" | "serio" | "triste";
export interface Aspecto {
  camisa: string; pantalon: string;
  pelo: "lado" | "calvo" | "mono" | "corto";
  colorPelo: string;
  gafas?: boolean; bigote?: boolean; corbata?: string;
  ropa?: "sueter" | "saco" | "bata" | "camiseta" | "sudadera";   // tipo de prenda (detalles dibujados encima)
  detalle?: string;      // color secundario de la prenda
  zapatos?: string;
  plumas?: boolean;      // bolsillo con plumas (¡ingeniero!)
}
type Punto = [number, number];

const T = 768;          // tamaño del lienzo en "puntos de dibujo"
const ESCALA = 2;       // la textura real es T*ESCALA (más nítida en primeros planos)
const PPU = 320;        // puntos de dibujo por cada unidad del mundo 3D
const CX = T / 2;       // centro horizontal
const SUELO = 752;      // altura (en el lienzo) donde pisan los pies
const LINEA = "#2b1a12";
const PIEL = "#fff8ef";
const BRAZO = 104;      // largo de cada mitad del brazo
const HOMBRO_Y = 372, HOMBRO_X = 68;
const BAJADA = 96;      // cuánto baja el cuerpo (en puntos de dibujo) al agacharse del todo


export class Personaje {
  /** La cámara de la escena. Hay que colocarla ANTES de poner a los personajes. */
  static camara: THREE.Camera;
  grupo = new THREE.Group();
  private lamina: THREE.Mesh;
  private sombra: THREE.Mesh;
  private g: CanvasRenderingContext2D;
  private tex: THREE.CanvasTexture;
  private ultimo = "";
  // --- pose (se reinicia en cada cuadro con `reiniciar`) ---
  cara: Cara = "neutral";
  mira = 0;            // -1 mira a la izquierda, 1 a la derecha
  habla = 0;           // 0 boca cerrada, 1 muy abierta
  paso = 0;            // fase de caminar (radianes); 0 = quieto
  inclina = 0;         // inclinación del cuerpo
  salto = 0;           // altura extra (unidades 3D)
  ojosCerrados = false;
  agacha = 0;          // 0 de pie, 1 en cuclillas (dobla las rodillas y baja el cuerpo)
  ladea = 0;           // inclinación de la cabeza sola (radianes)
  miraY = 0;           // -1 mira hacia arriba, 1 hacia abajo
  parpado = 0;         // 0 ojos abiertos, 0.5 a media asta (aburrido, desconfiado), 1 cerrados
  ceja: number | null = null;   // null = la que toca según la cara; -1 cejas tristes, 1 cejas enojadas
  private codo: Record<"i" | "d", Punto> = { i: [0, 0], d: [0, 0] };
  private manoP: Record<"i" | "d", Punto> = { i: [0, 0], d: [0, 0] };

  constructor(private a: Aspecto, private semilla = 1) {
    const [c, g] = lienzo(T * ESCALA, T * ESCALA);
    this.g = g;
    this.tex = textura(c);
    const mat = new THREE.MeshBasicMaterial({ map: this.tex, alphaTest: 0.5, alphaToCoverage: true, side: THREE.DoubleSide });
    this.lamina = new THREE.Mesh(new THREE.PlaneGeometry(T / PPU, T / PPU), mat);
    this.lamina.position.y = T / PPU / 2 - (T - SUELO) / PPU;
    // sombra real en el suelo, con la silueta del dibujo
    this.lamina.castShadow = true;
    this.lamina.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: this.tex, alphaTest: 0.5 });
    this.sombra = new THREE.Mesh(new THREE.CircleGeometry(0.3, 24),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22, depthWrite: false }));
    this.sombra.rotation.x = -Math.PI / 2;
    this.sombra.position.y = 0.02;
    this.grupo.add(this.sombra, this.lamina);
    this.reiniciar();
  }

  /** Vuelve a la pose de descanso y lo esconde. Cada toma lo coloca de nuevo. */
  reiniciar() {
    this.grupo.visible = false;
    this.cara = "neutral"; this.mira = 0; this.habla = 0; this.paso = 0; this.inclina = 0; this.salto = 0;
    this.ojosCerrados = false; this.agacha = 0; this.ladea = 0; this.miraY = 0; this.parpado = 0; this.ceja = null;
    this.brazo("i", 0.18, 0.1); this.brazo("d", 0.18, 0.1);
    this.tinte(0xffffff);
  }

  /** Lo pone de pie en un punto del suelo. */
  poner(x: number, z: number, y = 0) {
    this.grupo.visible = true; this.grupo.position.set(x, y, z);
    const c = Personaje.camara.position;
    this.grupo.rotation.y = Math.atan2(c.x - x, c.z - z);   // gira para mirar a la cámara
    return this;
  }

  /** Brazo por ángulos: 0 = colgando, PI/2 = estirado hacia afuera, PI = arriba. `a2` dobla el codo. */
  brazo(lado: "i" | "d", a: number, a2 = 0) {
    const s = lado === "i" ? -1 : 1;
    const hx = CX + s * HOMBRO_X;
    const codo: Punto = [hx + s * Math.sin(a) * BRAZO, HOMBRO_Y + Math.cos(a) * BRAZO];
    this.codo[lado] = codo;
    this.manoP[lado] = [codo[0] + s * Math.sin(a + a2) * BRAZO, codo[1] + Math.cos(a + a2) * BRAZO];
    return this;
  }

  /** Brazo que alcanza un punto del lienzo (el codo se dobla solo). */
  alcanzar(lado: "i" | "d", x: number, y: number) {
    const s = lado === "i" ? -1 : 1;
    const hx = CX + s * HOMBRO_X;
    let dx = x - hx, dy = y - HOMBRO_Y;
    const d = Math.min(Math.hypot(dx, dy), 2 * BRAZO - 1) || 1;
    const k = d / Math.hypot(dx, dy || 1e-6); dx *= k; dy *= k;
    const alto = Math.sqrt(BRAZO * BRAZO - (d / 2) * (d / 2));   // cuánto sobresale el codo
    // el codo sale perpendicular al brazo, del lado que queda más abajo
    let px = -dy / d, py = dx / d;
    if (py < 0 || (Math.abs(py) < 0.05 && px * s < 0)) { px = -px; py = -py; }
    this.codo[lado] = [hx + dx / 2 + px * alto, HOMBRO_Y + dy / 2 + py * alto];
    this.manoP[lado] = [hx + dx, HOMBRO_Y + dy];
    return this;
  }

  /** Brazo que alcanza un punto del mundo 3D (para sostener objetos). */
  alcanzarMundo(lado: "i" | "d", p: THREE.Vector3) {
    const l = this.grupo.worldToLocal(p.clone());
    return this.alcanzar(lado, CX + l.x * PPU, SUELO - (l.y - this.salto) * PPU - this.agacha * BAJADA);
  }

  /** Posición de la mano en el mundo 3D. */
  mano(lado: "i" | "d") {
    const [x, y] = this.manoP[lado];
    this.grupo.updateMatrixWorld();
    return this.grupo.localToWorld(new THREE.Vector3((x - CX) / PPU, (SUELO - y - this.agacha * BAJADA) / PPU + this.salto, 0.06));
  }

  tinte(color: THREE.ColorRepresentation) { (this.lamina.material as THREE.MeshBasicMaterial).color.set(color); }

  /** Llamar al final de cada cuadro: gira hacia la cámara y redibuja si la pose cambió. */
  terminar(cuadro: number) {
    if (!this.grupo.visible) return;
    this.lamina.position.y = T / PPU / 2 - (T - SUELO) / PPU + this.salto;
    this.sombra.scale.setScalar(1 / (1 + this.salto));
    // parpadeo automático cada ~3 segundos
    const parpadeo = this.ojosCerrados || (cuadro + this.semilla * 37) % 95 < 4;
    const firma = JSON.stringify([this.cara, this.mira.toFixed(2), this.habla.toFixed(2), this.paso.toFixed(2),
      this.inclina.toFixed(3), parpadeo, this.agacha.toFixed(2), this.ladea.toFixed(2), this.miraY.toFixed(1), this.parpado.toFixed(1), this.ceja?.toFixed(1) ?? "x", this.codo, this.manoP].flat(3).map((v) => (typeof v === "number" ? Math.round(v) : v)));
    if (firma === this.ultimo) return;
    this.ultimo = firma;
    this.dibujar(parpadeo);
    this.tex.needsUpdate = true;
  }

  // ------------------------------------------------------------------ dibujo
  private dibujar(parpadeo: boolean) {
    const g = this.g, a = this.a, det = a.detalle ?? "#fff8ef";
    g.setTransform(ESCALA, 0, 0, ESCALA, 0, 0);
    g.clearRect(0, 0, T, T);
    g.lineCap = "round"; g.lineJoin = "round"; g.strokeStyle = LINEA;
    /** Sombreado suave: oscurece un lado de la figura que se acaba de recortar con clip(). */
    const sombrear = (x: number, y: number, rad: number) => {
      const gr = g.createRadialGradient(x - rad * 0.35, y - rad * 0.4, rad * 0.3, x, y, rad * 1.25);
      gr.addColorStop(0, "rgba(255,255,255,0.10)"); gr.addColorStop(0.55, "rgba(90,60,120,0)"); gr.addColorStop(1, "rgba(70,40,110,0.34)");
      g.fillStyle = gr; g.fillRect(0, 0, T, T);
    };

    // piernas y zapatos (al agacharse, la cadera baja y las rodillas salen hacia afuera)
    const zanca = Math.sin(this.paso) * 34, baja = this.agacha * BAJADA;
    for (const s of [-1, 1]) {
      const px = CX + s * 26 + s * zanca + s * this.agacha * 14;
      const py = SUELO - 8 - Math.max(0, Math.sin(this.paso) * s) * 16;
      const cy = 540 + baja, rx = (CX + s * 26 + px) / 2 + s * this.agacha * 58, ry = (cy + py) / 2 + this.agacha * 8;
      g.strokeStyle = LINEA; g.lineWidth = 13; g.beginPath(); g.moveTo(CX + s * 26, cy); g.lineTo(rx, ry); g.lineTo(px, py); g.stroke();
      g.lineWidth = 6; g.fillStyle = a.zapatos ?? "#4a3326";
      g.beginPath(); g.moveTo(px - 12, py - 12); g.quadraticCurveTo(px + 34, py - 16, px + 36, py + 6); g.lineTo(px - 12, py + 6); g.closePath(); g.fill(); g.stroke();
    }

    // lo demás se inclina junto (cuerpo, brazos y cabeza)
    g.save();
    g.translate(CX, 545 + baja); g.rotate(this.inclina); g.translate(-CX, -545);

    // ---- cuerpo en forma de frijol, con su ropa
    const frijol = () => { g.beginPath(); g.ellipse(CX, 442, 88, 118, 0, 0, 7); };
    g.lineWidth = 10; frijol(); g.fillStyle = a.camisa; g.fill();
    g.save(); frijol(); g.clip();
    g.fillStyle = a.pantalon; g.fillRect(0, 522, T, 100);                               // pantalón
    g.strokeStyle = "rgba(40,20,15,0.55)"; g.lineWidth = 5; g.beginPath(); g.moveTo(CX - 100, 522); g.lineTo(CX + 100, 522); g.stroke();
    const ropa = a.ropa ?? "camiseta";
    g.strokeStyle = LINEA; g.lineWidth = 5;
    if (ropa === "sueter") {
      g.fillStyle = "#fff8ef"; g.beginPath(); g.moveTo(CX - 40, 318); g.lineTo(CX, 388); g.lineTo(CX + 40, 318); g.closePath(); g.fill(); g.stroke();   // cuello en V
      g.fillStyle = det;                                                              // rombos
      for (const dx of [-52, 0, 52]) { g.beginPath(); g.moveTo(CX + dx, 448); g.lineTo(CX + dx + 20, 476); g.lineTo(CX + dx, 504); g.lineTo(CX + dx - 20, 476); g.closePath(); g.fill(); }
      g.lineWidth = 3; g.strokeStyle = "rgba(40,20,15,0.45)"; for (let x = CX - 80; x <= CX + 80; x += 14) { g.beginPath(); g.moveTo(x, 508); g.lineTo(x, 521); g.stroke(); }   // resorte
    } else if (ropa === "saco") {
      g.fillStyle = "#fff8ef"; g.beginPath(); g.moveTo(CX - 34, 318); g.lineTo(CX, 470); g.lineTo(CX + 34, 318); g.closePath(); g.fill();                // camisa
      if (a.corbata) { g.fillStyle = a.corbata; g.beginPath(); g.moveTo(CX - 12, 330); g.lineTo(CX + 12, 330); g.lineTo(CX + 17, 430); g.lineTo(CX, 456); g.lineTo(CX - 17, 430); g.closePath(); g.fill(); g.stroke(); }
      g.fillStyle = det;                                                              // solapas
      for (const s of [-1, 1]) { g.beginPath(); g.moveTo(CX + s * 34, 318); g.lineTo(CX + s * 4, 468); g.lineTo(CX + s * 58, 400); g.closePath(); g.fill(); g.stroke(); }
      g.fillStyle = LINEA; for (const y of [488, 510]) { g.beginPath(); g.arc(CX + 6, y, 5, 0, 7); g.fill(); }                                          // botones
      g.fillStyle = "#fff8ef"; g.fillRect(CX + 40, 404, 24, 9);                         // pañuelo
    } else if (ropa === "bata") {
      g.fillStyle = det; g.beginPath(); g.moveTo(CX - 30, 318); g.lineTo(CX, 380); g.lineTo(CX + 30, 318); g.closePath(); g.fill(); g.stroke();          // blusa
      g.beginPath(); g.moveTo(CX, 380); g.lineTo(CX, 560); g.stroke();
      for (const s of [-1, 1]) { g.fillStyle = "#ffffff"; g.beginPath(); g.moveTo(CX + s * 30, 318); g.lineTo(CX, 380); g.lineTo(CX + s * 50, 372); g.closePath(); g.fill(); g.stroke(); }
      g.strokeRect(CX + 26, 440, 36, 40);
      g.fillStyle = LINEA; for (const y of [410, 450, 490]) { g.beginPath(); g.arc(CX - 12, y, 4.5, 0, 7); g.fill(); }
    } else if (ropa === "sudadera") {
      g.beginPath(); g.arc(CX, 318, 34, 0.15, Math.PI - 0.15); g.stroke();
      for (const s of [-1, 1]) { g.beginPath(); g.moveTo(CX + s * 14, 350); g.lineTo(CX + s * 16, 398); g.stroke(); }
      g.fillStyle = "rgba(0,0,0,0.14)"; g.beginPath(); g.moveTo(CX - 50, 460); g.lineTo(CX + 50, 460); g.lineTo(CX + 62, 512); g.lineTo(CX - 62, 512); g.closePath(); g.fill(); g.stroke();
    } else {
      g.beginPath(); g.arc(CX, 322, 30, 0.2, Math.PI - 0.2); g.stroke();
      g.fillStyle = det; g.beginPath(); g.arc(CX, 430, 26, 0, 7); g.fill();             // estampado
    }
    if (a.plumas) {
      g.lineWidth = 4; g.strokeStyle = LINEA; g.fillStyle = "#fff8ef"; g.fillRect(CX + 22, 398, 34, 30); g.strokeRect(CX + 22, 398, 34, 30);
      for (const [dx, col] of [[30, "#2f6fd6"], [40, "#d9482f"], [50, "#2b2b33"]] as const) { g.strokeStyle = col; g.lineWidth = 5; g.beginPath(); g.moveTo(CX + dx, 384); g.lineTo(CX + dx, 404); g.stroke(); }
    }
    sombrear(CX, 442, 118);
    g.restore();
    g.strokeStyle = LINEA; g.lineWidth = 10; frijol(); g.stroke();

    // brazos (líneas) y manos (bolitas). Si la mano sube hasta la cara, ese brazo se dibuja al final,
    // encima de la cabeza (por ejemplo, el dedo en la boca).
    const brazo = (lado: "i" | "d") => {
      const s = lado === "i" ? -1 : 1;
      const [ex, ey] = this.codo[lado], [mx, my] = this.manoP[lado];
      g.strokeStyle = LINEA; g.lineWidth = 13; g.beginPath(); g.moveTo(CX + s * HOMBRO_X, HOMBRO_Y); g.lineTo(ex, ey); g.lineTo(mx, my); g.stroke();
      g.lineWidth = 7; g.fillStyle = PIEL; g.beginPath(); g.arc(mx, my, 16, 0, 7); g.fill(); g.stroke();
    };
    const sobreLaCara = (lado: "i" | "d") => this.manoP[lado][1] < 330 && Math.abs(this.manoP[lado][0] - CX) < 125;
    for (const lado of ["i", "d"] as const) if (!sobreLaCara(lado)) brazo(lado);

    // ---- cabeza
    const hx = CX, hy = 206, R = 118, m = this.mira;
    g.save(); g.translate(hx, hy + R); g.rotate(this.ladea); g.translate(-hx, -(hy + R));   // la cabeza se ladea desde el cuello
    const oscuro = new THREE.Color(a.colorPelo).multiplyScalar(0.5).getStyle();
    if (a.pelo === "mono") { g.lineWidth = 10; g.fillStyle = a.colorPelo; g.beginPath(); g.arc(hx, hy - R - 22, 44, 0, 7); g.fill(); g.stroke(); }
    g.lineWidth = 10; g.fillStyle = PIEL; g.beginPath(); g.arc(hx, hy, R, 0, 7); g.fill();
    g.save(); g.clip();
    sombrear(hx, hy, R);
    g.fillStyle = a.colorPelo;
    const mechones = (x: number, y: number, rx: number, ry: number, giro = 0) => {      // rayitas que dan textura al pelo
      g.strokeStyle = oscuro; g.lineWidth = 4;
      for (const k of [0.45, 0.7]) { g.beginPath(); g.ellipse(x, y, rx * k, ry * k, giro, Math.PI * 0.15, Math.PI * 0.85); g.stroke(); }
    };
    if (a.pelo === "lado") { g.beginPath(); g.ellipse(hx - 34, hy - 104, 150, 74, -0.18, 0, 7); g.fill(); g.beginPath(); g.ellipse(hx - R, hy - 30, 34, 74, 0, 0, 7); g.fill(); mechones(hx - 34, hy - 104, 150, 74, -0.18); }
    if (a.pelo === "corto") { g.beginPath(); g.ellipse(hx, hy - 112, 140, 62, 0, 0, 7); g.fill(); mechones(hx, hy - 112, 140, 62); }
    if (a.pelo === "mono") { g.beginPath(); g.ellipse(hx, hy - 104, 150, 70, 0, 0, 7); g.fill(); mechones(hx, hy - 104, 150, 70); }
    if (a.pelo === "calvo") { for (const s of [-1, 1]) { g.beginPath(); g.ellipse(hx + s * R, hy - 6, 30, 52, 0, 0, 7); g.fill(); } }
    g.restore();
    g.strokeStyle = LINEA; g.lineWidth = 10; g.beginPath(); g.arc(hx, hy, R, 0, 7); g.stroke();

    // ---- cara
    const fx = hx + m * 26, ey = hy - 6 + this.miraY * 20, sep = 42;
    const c = this.cara;
    if (c === "feliz" || c === "risa") { g.fillStyle = "rgba(255,120,130,0.38)"; for (const s of [-1, 1]) { g.beginPath(); g.ellipse(fx + s * 74, ey + 44, 20, 12, 0, 0, 7); g.fill(); } }   // chapitas
    g.fillStyle = LINEA; g.lineWidth = 8;
    for (const s of [-1, 1]) {
      const x = fx + s * sep;
      if (a.gafas) { g.save(); g.lineWidth = 7; g.fillStyle = "rgba(190,225,255,0.55)"; g.beginPath(); g.arc(x, ey, 33, 0, 7); g.fill(); g.stroke();
        g.strokeStyle = "rgba(255,255,255,0.85)"; g.lineWidth = 5; g.beginPath(); g.arc(x, ey, 24, Math.PI * 1.1, Math.PI * 1.4); g.stroke(); g.restore(); }
      g.beginPath();
      if (parpadeo) { g.moveTo(x - 14, ey); g.lineTo(x + 14, ey); g.stroke(); }
      else if (c === "feliz" || c === "risa") { g.arc(x, ey + 8, 16, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); }
      else {
        const rad = c === "sorpresa" ? 15 : 11;
        g.arc(x + m * 3, ey + this.miraY * 3, rad, 0, 7); g.fill();
        g.fillStyle = "#fff"; g.beginPath(); g.arc(x + m * 3 - rad * 0.35, ey + this.miraY * 3 - rad * 0.35, rad * 0.33, 0, 7); g.fill(); g.fillStyle = LINEA;
        if (this.parpado > 0.05) {          // párpado: tapa la parte de arriba del ojo y deja una raya
          const borde = ey - rad - 3 + (rad * 2 + 3) * Math.min(1, this.parpado);
          g.fillStyle = a.gafas ? "#dcebf7" : PIEL; g.fillRect(x + m * 3 - rad - 4, ey - rad - 6, rad * 2 + 8, borde - (ey - rad - 6));
          g.lineWidth = 6; g.beginPath(); g.moveTo(x + m * 3 - rad - 5, borde); g.lineTo(x + m * 3 + rad + 5, borde); g.stroke(); g.lineWidth = 8; g.fillStyle = LINEA;
        }
      }
      // cejas
      const cy = ey - (c === "sorpresa" ? 50 : 40) - (a.gafas ? 6 : 0);
      const giro = this.ceja !== null ? this.ceja * 14 : c === "serio" ? 11 : c === "triste" ? -11 : 0;   // serio: ceja baja por dentro
      g.lineWidth = 9; g.beginPath(); g.moveTo(x - s * 18, cy + giro); g.lineTo(x + s * 18, cy - giro); g.stroke(); g.lineWidth = 8;
    }
    if (a.gafas) { g.lineWidth = 7; g.beginPath(); g.moveTo(fx - sep + 33, ey); g.lineTo(fx + sep - 33, ey); g.stroke(); }

    // boca
    const by = hy + 56 + this.miraY * 14;
    g.lineWidth = 8;
    if (a.bigote) { g.fillStyle = a.colorPelo; g.lineWidth = 5; g.beginPath(); g.ellipse(fx - 22, by - 16, 30, 14, 0.25, 0, 7); g.fill(); g.stroke(); g.beginPath(); g.ellipse(fx + 22, by - 16, 30, 14, -0.25, 0, 7); g.fill(); g.stroke(); g.fillStyle = LINEA; g.lineWidth = 8; }
    g.beginPath();
    if (c === "risa") {
      g.arc(fx, by - 6, 34, 0, Math.PI); g.closePath(); g.fillStyle = "#5a1f22"; g.fill(); g.stroke();
      g.fillStyle = "#ffffff"; g.fillRect(fx - 22, by - 5, 44, 9);
      g.fillStyle = "#ff8a80"; g.beginPath(); g.ellipse(fx, by + 20, 16, 8, 0, 0, 7); g.fill();
    } else if (c === "sorpresa") { g.ellipse(fx, by + 4, 13, 17 + this.habla * 6, 0, 0, 7); g.fillStyle = "#5a1f22"; g.fill(); g.stroke(); }
    else if (this.habla > 0.12) { g.ellipse(fx, by + 2, 15, 4 + this.habla * 15, 0, 0, 7); g.fillStyle = "#5a1f22"; g.fill(); g.stroke(); }
    else if (c === "feliz") { g.arc(fx, by - 10, 24, Math.PI * 0.15, Math.PI * 0.85); g.stroke(); }
    else if (c === "triste") { g.arc(fx, by + 22, 20, Math.PI * 1.15, Math.PI * 1.85); g.stroke(); }
    else { g.moveTo(fx - 13, by); g.lineTo(fx + 13, by); g.stroke(); }
    g.restore();   // fin de la cabeza ladeada
    for (const lado of ["i", "d"] as const) if (sobreLaCara(lado)) brazo(lado);
    g.restore();
  }
}
