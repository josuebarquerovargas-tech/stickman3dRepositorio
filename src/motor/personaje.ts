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
  private codo: Record<"i" | "d", Punto> = { i: [0, 0], d: [0, 0] };
  private manoP: Record<"i" | "d", Punto> = { i: [0, 0], d: [0, 0] };

  constructor(private a: Aspecto, private semilla = 1) {
    const [c, g] = lienzo(T * ESCALA, T * ESCALA);
    this.g = g;
    this.tex = textura(c);
    const mat = new THREE.MeshBasicMaterial({ map: this.tex, transparent: true, depthWrite: false, side: THREE.DoubleSide });
    this.lamina = new THREE.Mesh(new THREE.PlaneGeometry(T / PPU, T / PPU), mat);
    this.lamina.position.y = T / PPU / 2 - (T - SUELO) / PPU;
    this.sombra = new THREE.Mesh(new THREE.CircleGeometry(0.42, 24),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false }));
    this.sombra.rotation.x = -Math.PI / 2;
    this.sombra.position.y = 0.02;
    this.grupo.add(this.sombra, this.lamina);
    this.reiniciar();
  }

  /** Vuelve a la pose de descanso y lo esconde. Cada toma lo coloca de nuevo. */
  reiniciar() {
    this.grupo.visible = false;
    this.cara = "neutral"; this.mira = 0; this.habla = 0; this.paso = 0; this.inclina = 0; this.salto = 0;
    this.ojosCerrados = false;
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
    return this.alcanzar(lado, CX + l.x * PPU, SUELO - (l.y - this.salto) * PPU);
  }

  /** Posición de la mano en el mundo 3D. */
  mano(lado: "i" | "d") {
    const [x, y] = this.manoP[lado];
    this.grupo.updateMatrixWorld();
    return this.grupo.localToWorld(new THREE.Vector3((x - CX) / PPU, (SUELO - y) / PPU + this.salto, 0.06));
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
      this.inclina.toFixed(3), parpadeo, this.codo, this.manoP].flat(3).map((v) => (typeof v === "number" ? Math.round(v) : v)));
    if (firma === this.ultimo) return;
    this.ultimo = firma;
    this.dibujar(parpadeo);
    this.tex.needsUpdate = true;
  }

  // ------------------------------------------------------------------ dibujo
  private dibujar(parpadeo: boolean) {
    const g = this.g, a = this.a;
    g.setTransform(ESCALA, 0, 0, ESCALA, 0, 0);
    g.clearRect(0, 0, T, T);
    g.lineCap = "round"; g.lineJoin = "round"; g.strokeStyle = LINEA;

    // piernas
    const zanca = Math.sin(this.paso) * 34;
    for (const s of [-1, 1]) {
      const px = CX + s * 26 + s * zanca;
      const py = SUELO - 6 - Math.max(0, Math.sin(this.paso) * s) * 16;
      g.lineWidth = 12; g.beginPath(); g.moveTo(CX + s * 26, 540); g.lineTo(px, py); g.stroke();
      g.fillStyle = LINEA; g.beginPath(); g.ellipse(px + 9, py, 24, 11, 0, 0, 7); g.fill();
    }

    // lo demás se inclina junto (cuerpo, brazos y cabeza)
    g.save();
    g.translate(CX, 545); g.rotate(this.inclina); g.translate(-CX, -545);

    // cuerpo en forma de frijol
    g.lineWidth = 9;
    g.beginPath(); g.ellipse(CX, 442, 86, 116, 0, 0, 7);
    g.fillStyle = a.camisa; g.fill();
    g.save(); g.clip(); g.fillStyle = a.pantalon; g.fillRect(0, 520, T, 100); g.restore();
    if (a.corbata) {
      g.fillStyle = a.corbata; g.beginPath();
      g.moveTo(CX - 14, 332); g.lineTo(CX + 14, 332); g.lineTo(CX + 20, 450); g.lineTo(CX, 478); g.lineTo(CX - 20, 450); g.closePath(); g.fill();
      g.lineWidth = 6; g.stroke(); g.lineWidth = 9;
    }
    g.beginPath(); g.ellipse(CX, 442, 86, 116, 0, 0, 7); g.stroke();

    // brazos (líneas) y manos (bolitas). Si la mano sube hasta la cara, ese brazo se dibuja al final,
    // encima de la cabeza (por ejemplo, el dedo en la boca).
    const brazo = (lado: "i" | "d") => {
      const s = lado === "i" ? -1 : 1;
      const [ex, ey] = this.codo[lado], [mx, my] = this.manoP[lado];
      g.strokeStyle = LINEA; g.lineWidth = 12; g.beginPath(); g.moveTo(CX + s * HOMBRO_X, HOMBRO_Y); g.lineTo(ex, ey); g.lineTo(mx, my); g.stroke();
      g.lineWidth = 7; g.fillStyle = PIEL; g.beginPath(); g.arc(mx, my, 15, 0, 7); g.fill(); g.stroke();
    };
    const sobreLaCara = (lado: "i" | "d") => this.manoP[lado][1] < 330 && Math.abs(this.manoP[lado][0] - CX) < 125;
    for (const lado of ["i", "d"] as const) if (!sobreLaCara(lado)) brazo(lado);

    // cabeza
    const hx = CX, hy = 206, R = 118, m = this.mira;
    if (a.pelo === "mono") { g.lineWidth = 9; g.fillStyle = a.colorPelo; g.beginPath(); g.arc(hx, hy - R - 22, 44, 0, 7); g.fill(); g.stroke(); }
    g.lineWidth = 9; g.fillStyle = PIEL; g.beginPath(); g.arc(hx, hy, R, 0, 7); g.fill();
    g.save(); g.clip(); g.fillStyle = a.colorPelo;
    if (a.pelo === "lado") { g.beginPath(); g.ellipse(hx - 34, hy - 104, 150, 74, -0.18, 0, 7); g.fill(); g.beginPath(); g.ellipse(hx - R, hy - 30, 34, 74, 0, 0, 7); g.fill(); }
    if (a.pelo === "corto") { g.beginPath(); g.ellipse(hx, hy - 112, 140, 62, 0, 0, 7); g.fill(); }
    if (a.pelo === "mono") { g.beginPath(); g.ellipse(hx, hy - 104, 150, 70, 0, 0, 7); g.fill(); }
    if (a.pelo === "calvo") { for (const s of [-1, 1]) { g.beginPath(); g.ellipse(hx + s * R, hy - 6, 30, 52, 0, 0, 7); g.fill(); } }
    g.restore();
    g.beginPath(); g.arc(hx, hy, R, 0, 7); g.stroke();

    // cara
    const fx = hx + m * 26, ey = hy - 6, sep = 42;
    g.fillStyle = LINEA; g.lineWidth = 8;
    const c = this.cara;
    for (const s of [-1, 1]) {
      const x = fx + s * sep;
      if (a.gafas) { g.save(); g.lineWidth = 7; g.fillStyle = "rgba(190,225,255,0.55)"; g.beginPath(); g.arc(x, ey, 33, 0, 7); g.fill(); g.stroke(); g.restore(); }
      g.beginPath();
      if (parpadeo) { g.moveTo(x - 14, ey); g.lineTo(x + 14, ey); g.stroke(); }
      else if (c === "feliz" || c === "risa") { g.arc(x, ey + 8, 16, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); }
      else if (c === "sorpresa") { g.arc(x, ey, 15, 0, 7); g.fill(); g.fillStyle = "#fff"; g.beginPath(); g.arc(x - 5, ey - 5, 5, 0, 7); g.fill(); g.fillStyle = LINEA; }
      else { g.arc(x, ey, 10, 0, 7); g.fill(); }
      // cejas
      const cy = ey - (c === "sorpresa" ? 50 : 40) - (a.gafas ? 6 : 0);
      const giro = c === "serio" ? 11 : c === "triste" ? -11 : 0;   // serio: ceja baja por dentro
      g.beginPath(); g.moveTo(x - s * 18, cy + giro); g.lineTo(x + s * 18, cy - giro); g.stroke();
    }
    if (a.gafas) { g.lineWidth = 7; g.beginPath(); g.moveTo(fx - sep + 33, ey); g.lineTo(fx + sep - 33, ey); g.stroke(); }

    // boca
    const by = hy + 56;
    g.lineWidth = 8;
    if (a.bigote) { g.fillStyle = a.colorPelo; g.beginPath(); g.ellipse(fx - 22, by - 16, 28, 13, 0.25, 0, 7); g.ellipse(fx + 22, by - 16, 28, 13, -0.25, 0, 7); g.fill(); g.fillStyle = LINEA; }
    g.beginPath();
    if (c === "risa") {
      g.arc(fx, by - 6, 34, 0, Math.PI); g.closePath(); g.fillStyle = "#5a1f22"; g.fill(); g.stroke();
      g.fillStyle = "#ff8a80"; g.beginPath(); g.ellipse(fx, by + 20, 16, 8, 0, 0, 7); g.fill();
    } else if (c === "sorpresa") { g.ellipse(fx, by + 4, 13, 17 + this.habla * 6, 0, 0, 7); g.fillStyle = "#5a1f22"; g.fill(); g.stroke(); }
    else if (this.habla > 0.12) { g.ellipse(fx, by + 2, 15, 4 + this.habla * 15, 0, 0, 7); g.fillStyle = "#5a1f22"; g.fill(); g.stroke(); }
    else if (c === "feliz") { g.arc(fx, by - 10, 24, Math.PI * 0.15, Math.PI * 0.85); g.stroke(); }
    else if (c === "triste") { g.arc(fx, by + 22, 20, Math.PI * 1.15, Math.PI * 1.85); g.stroke(); }
    else { g.moveTo(fx - 13, by); g.lineTo(fx + 13, by); g.stroke(); }
    for (const lado of ["i", "d"] as const) if (sobreLaCara(lado)) brazo(lado);
    g.restore();
  }
}
