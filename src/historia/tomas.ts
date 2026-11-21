// La "dirección" del corto: para cada frase del guion, dónde está la cámara y qué hace cada quien.
// Todo depende solo del segundo `s`, así el mismo cuadro siempre sale igual.
import * as THREE from "three";
import tiempos from "./tiempos.json";
import { Mundo } from "./mundo";
import { Personaje } from "../motor/personaje";
import { c01, lerp, tramo, suave, suave2, rebote, azar } from "../motor/util";

export const FPS = 30;
export const DURACION = tiempos.duracion;
const CX = 384;   // centro del lienzo del personaje (para `alcanzar`)

/** Segundo en que empieza la frase n. */
const L = (n: number) => tiempos.lineas[n].inicio;
/** Segundo en que se dice una palabra de la frase n (la primera que empiece con ese texto). */
function P(n: number, palabra: string) {
  const deLaFrase = tiempos.palabras.filter((x) => x.linea === n);
  // primero buscamos respetando mayúsculas ("Una" no es "una"); si no aparece, sin respetarlas
  const w = deLaFrase.find((x) => x.texto.startsWith(palabra)) ?? deLaFrase.find((x) => x.texto.toLowerCase().startsWith(palabra.toLowerCase()));
  if (!w) throw new Error(`No encuentro "${palabra}" en la frase ${n}`);
  return w.t;
}
/** ¿Qué frase suena en el segundo s? */
export const fraseEn = (s: number) => { let n = 0; tiempos.lineas.forEach((l, i) => { if (s >= l.inicio) n = i; }); return n; };

type V3 = [number, number, number];
const v = (a: V3) => new THREE.Vector3(...a);

// LA LUZ CUENTA EL PASO DEL TIEMPO: mañana dorada -> tarde -> anochecer -> noche -> amanecer rosa -> ocaso apagado.
// En las escenas oscuras el ambiente es azul violeta y las lámparas dejan charcos de luz cálida.
interface Luz {
  amb: number; ambColor: number;            // luz general y su color
  sol: number; solColor: number; solPos: V3;   // luz principal (sol o luna) y de dónde viene
  cielo: "dia" | "gris" | "noche" | "amanecer" | "ocaso";
  pj: number;                               // tinte de los personajes (son dibujos planos: no reciben luz)
  niebla: number; tinte: V3; sat: number; brillo: number;
  techo: number; mesa: number; farol: number;   // fuerza de las lámparas de techo, de escritorio y de los faroles
  ventana: number;                          // color de la ventana del laboratorio
}
const LUCES = {
  dia:       { amb: 1.3,  ambColor: 0xffffff, sol: 2.6,  solColor: 0xffe2b4, solPos: [-9, 7.5, 7],  cielo: "dia",      pj: 0xffffff, niebla: 0xd8ecff, tinte: [1.05, 1.0, 0.94],  sat: 1.2,  brillo: 0.7,  techo: 1,    mesa: 1,   farol: 0,  ventana: 0xa8e0ff },
  interior:  { amb: 0.78, ambColor: 0xffffff, sol: 1.05, solColor: 0xffe9c8, solPos: [-6, 11, 8],   cielo: "dia",      pj: 0xfff4e6, niebla: 0xcfeaff, tinte: [1.03, 1.0, 0.95],  sat: 1.12, brillo: 0.8,  techo: 1,    mesa: 1,   farol: 0,  ventana: 0xa8e0ff },
  tarde:     { amb: 0.55, ambColor: 0xffdcc0, sol: 0.95, solColor: 0xff9a58, solPos: [-10, 5, 6],   cielo: "dia",      pj: 0xffe8d0, niebla: 0xffd9b8, tinte: [1.07, 0.98, 0.88], sat: 1.16, brillo: 0.95, techo: 1.2,  mesa: 1.5, farol: 0,  ventana: 0xffb06a },
  anochecer: { amb: 0.34, ambColor: 0x8f8cff, sol: 0.28, solColor: 0x7f7cf0, solPos: [-6, 11, 8],   cielo: "noche",    pj: 0xd9d2f2, niebla: 0x2a2f7a, tinte: [0.98, 0.95, 1.07], sat: 1.16, brillo: 1.2,  techo: 0.55, mesa: 2.4, farol: 1,  ventana: 0x4a4fb4 },
  sala:      { amb: 0.46, ambColor: 0xc8b4ff, sol: 0.4,  solColor: 0xffd0a0, solPos: [-6, 11, 8],   cielo: "noche",    pj: 0xfff0dc, niebla: 0x2a2f7a, tinte: [1.04, 0.98, 0.93], sat: 1.14, brillo: 1.0,  techo: 0.8,  mesa: 1,   farol: 1,  ventana: 0x4a4fb4 },

  drama:     { amb: 0.3,  ambColor: 0x8f8cff, sol: 0.5,  solColor: 0x9a8cff, solPos: [-6, 11, 8],   cielo: "noche",    pj: 0xcbc4ea, niebla: 0x2a2f7a, tinte: [0.92, 0.92, 1.12], sat: 1.1,  brillo: 1.25, techo: 0.3,  mesa: 2.4, farol: 1,  ventana: 0x2a2f7a },
  noche:     { amb: 0.5,  ambColor: 0xb0b8ff, sol: 0.85, solColor: 0x8f9cff, solPos: [-6, 11, 8],   cielo: "noche",    pj: 0xdfdff6, niebla: 0x2a2f7a, tinte: [0.95, 0.95, 1.1],  sat: 1.25, brillo: 1.3,  techo: 1,    mesa: 1,   farol: 1,  ventana: 0x2a2f7a },
  amanecer:  { amb: 0.95, ambColor: 0xffe0f0, sol: 1.9,  solColor: 0xffa890, solPos: [10, 4.5, 7],  cielo: "amanecer", pj: 0xfff0ee, niebla: 0xf5c8d0, tinte: [1.05, 0.97, 1.0],  sat: 1.2,  brillo: 0.95, techo: 1,    mesa: 1,   farol: 0.45, ventana: 0xffc0c8 },
  ocaso:     { amb: 0.72, ambColor: 0xe6d6ea, sol: 0.9,  solColor: 0xff9a78, solPos: [9, 3.6, 6],   cielo: "ocaso",    pj: 0xd9d0d6, niebla: 0xb9a6ae, tinte: [1.0, 0.97, 1.03],  sat: 0.8,  brillo: 0.75, techo: 1,    mesa: 1,   farol: 0.9, ventana: 0xffb06a },
} satisfies Record<string, Luz>;
type TipoLuz = keyof typeof LUCES;
const mezclaColor = (a: number, b: number, k: number) => new THREE.Color(a).lerp(new THREE.Color(b), k);

export function aplicarToma(m: Mundo, cam: THREE.PerspectiveCamera, s: number, cuadro: number) {
  const { steve, jefe, jefe2, jefe3, ayudante } = m.actores;
  m.reiniciar();
  Personaje.camara = cam;
  Object.assign(m.look, { apertura: 0.45, exposicion: 1 });

  // --- ayudas -------------------------------------------------------------
  /** Coloca la cámara: va de (pos0, mira0) a (pos1, mira1) según u. */
  // Criterio: cámara BAJA (a la altura de la cintura o menos) y CERCA, mirando un poco hacia arriba,
  // para que los personajes llenen más de media pantalla. Con dos personajes, la cámara se pone
  // en diagonal: uno queda cerca y el otro detrás, en vez de los dos chiquitos de frente.
  let anclas: { p: THREE.Vector3; q: THREE.Quaternion; fov: number }[] = [];
  const camara = (u: number, pos0: V3, mira0: V3, pos1: V3 = pos0, mira1: V3 = mira0, fov = 40, fov1 = fov) => {
    anclas = ([[pos0, mira0, fov], [pos1, mira1, fov1]] as const).map(([p, mi, f]) => {
      cam.position.set(...p); cam.lookAt(v(mi)); return { p: cam.position.clone(), q: cam.quaternion.clone(), fov: f }; });
    cam.position.lerpVectors(v(pos0), v(pos1), u);
    cam.lookAt(v(mira0).lerp(v(mira1), u));
    cam.fov = lerp(fov, fov1, u); cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    m.look.foco = cam.position.distanceTo(v(mira0).lerp(v(mira1), u));   // enfoca a lo que mira
  };
  /** Objeto borroso en primer plano. (fx, fy) = lugar en la pantalla, de -1 a 1; d = distancia a la cámara.
   *  `k` dice desde qué momento de la toma se mide ese lugar (0 = inicio, 1 = final). Con k fijo el objeto queda
   *  quieto en el mundo y se desliza cuando la cámara se mueve; con k = avance de la toma, acompaña a la cámara. */
  const frente = (o: THREE.Object3D, fx: number, fy: number, d: number, escala = 1, giro = 0, k = 1) => {
    const [p0, p1] = anclas.map((a) => { const h = d * Math.tan((a.fov * Math.PI) / 360); return new THREE.Vector3(fx * h * 9 / 16, fy * h, -d).applyQuaternion(a.q).add(a.p); });
    o.visible = true; o.position.lerpVectors(p0, p1, k); o.scale.setScalar(escala); o.rotation.y = giro; return o;
  };
  /** Ambiente de luz de la escena. Con dos tipos y `k` (0..1) pasa poco a poco de uno a otro: así avanza el día. */
  const luz = (tipoA: TipoLuz, tipoB: TipoLuz = tipoA, k = 0) => {
    const a: Luz = LUCES[tipoA], b: Luz = LUCES[tipoB], n = (x: number, y: number) => lerp(x, y, k);
    m.ambiente.intensity = n(a.amb, b.amb); m.ambiente.color.copy(mezclaColor(a.ambColor, b.ambColor, k));
    m.sol.intensity = n(a.sol, b.sol); m.sol.color.copy(mezclaColor(a.solColor, b.solColor, k));
    m.sol.position.lerpVectors(v(a.solPos), v(b.solPos), k);
    const cielo = k < 0.5 ? a.cielo : b.cielo;
    (m.boveda.material as THREE.MeshBasicMaterial).map = m.cielos[cielo];
    const pj = mezclaColor(a.pj, b.pj, k); m.todos.forEach((p) => p.tinte(pj));
    (m.escena.fog as THREE.Fog).color.copy(mezclaColor(a.niebla, b.niebla, k));
    m.look.tinte = [n(a.tinte[0], b.tinte[0]), n(a.tinte[1], b.tinte[1]), n(a.tinte[2], b.tinte[2])];
    m.look.saturacion = n(a.sat, b.sat); m.look.brillo = n(a.brillo, b.brillo);
    m.lucesNoche.visible = cielo === "noche";
    // lámparas: cuanto más oscuro el ambiente, más mandan sus charcos de luz cálida
    const techo = n(a.techo, b.techo), mesa = n(a.mesa, b.mesa), farol = n(a.farol, b.farol);
    m.luzLab.intensity = 11 * techo; m.luzSala.intensity = 12 * techo; m.luzMesa.intensity = 7 * mesa;
    m.apliques.forEach((l) => (l.intensity = 7 * techo)); m.faroles.forEach((l) => (l.intensity = 16 * farol));
    m.luzNoche.intensity = 5;
    const oscuro = 1 - c01((n(a.amb, b.amb) - 0.3) / 0.7);          // los conos de luz se notan más a oscuras
    m.haces.forEach((h) => ((h.material as THREE.MeshBasicMaterial).opacity = h.userData.fuerza * (0.3 + oscuro * 0.9)));
    (m.ventanaLab.material as THREE.MeshBasicMaterial).color.copy(mezclaColor(a.ventana, b.ventana, k)).multiplyScalar(1.5);
    m.foquitos.forEach((f, i) => (f.visible = Math.sin(s * (3 + (i % 5)) + i * 1.7) > -0.3));   // foquitos que parpadean
  };
  /** Vapor o humo que sube desde un punto (una taza, un cautín): bolitas blancas que se desvanecen. */
  const vapor = (x: number, y: number, z: number, desde = 0, cuantos = 3, alto = 0.5) => {
    for (let i = 0; i < cuantos; i++) {
      const f = (s * 0.45 + i / cuantos) % 1, p = m.vapores[desde + i];
      ver(p, x + Math.sin(f * 6 + i * 2) * 0.04, y + f * alto, z, 0.1 + f * 0.16); p.material.opacity = 0.45 * Math.sin(f * Math.PI);
    }
  };
  const ver = (o: THREE.Object3D, x: number, y: number, z: number, escala = 1) => { o.visible = true; o.position.set(x, y, z); o.scale.setScalar(escala); return o; };
  const hablar = (p: Personaje, desde: number, hasta: number) => { if (s > desde && s < hasta) p.habla = Math.abs(Math.sin(s * 13)) * 0.9; };
  /** La cámara digital sostenida frente al cuerpo de un personaje. */
  const sostener = (p: Personaje, alto = 0.72, adelante = 0.45, cosa: THREE.Object3D = m.camara) => {
    const g = p.grupo.position;
    const dir = new THREE.Vector3(Math.sin(p.grupo.rotation.y), 0, Math.cos(p.grupo.rotation.y));
    ver(cosa, g.x + dir.x * adelante, alto - p.agacha * 0.3, g.z + dir.z * adelante);   // si se agacha, la cosa baja con él
    cosa.rotation.y = p.grupo.rotation.y;
    p.alcanzar("i", CX - 108, 752 - (alto + 0.25) * 320); p.alcanzar("d", CX + 108, 752 - (alto + 0.25) * 320);
  };

  const n = fraseEn(s);
  const t = s - L(n);                                   // segundos desde que empezó la frase
  const u = c01(t / (tiempos.lineas[n].fin - L(n)));    // avance de la frase, 0..1

  switch (n) {
    // 0 — GANCHO: "Este ingeniero inventó la cámara digital… y su propia empresa la escondió."
    case 0: {
      m.sets.lab.visible = true; luz("interior");
      const atras = suave(tramo(t, 0.05, 0.5));
      const caeCam = suave2(tramo(s, P(0, "empresa") - 0.35, P(0, "escondió")));
      if (caeCam <= 0) { camara(atras, [0.3, 0.62, 2.2], [0, 0.92, 0.75], [0.85, 0.62, 3.5], [0, 1.28, 0.5]); frente(m.primeros.libros, -0.8, -1.02, 1.3, 0.9, 0.5, lerp(0.35, 1, atras)); }
      else { camara(caeCam, [0.85, 0.62, 3.5], [0, 1.28, 0.5], [0.45, 0.6, 4.7], [0, 1.02, 0.9], 40, 46); frente(m.primeros.libros, -0.8 - caeCam, -1.02 - caeCam * 0.4, 1.3, 0.9, 0.5, caeCam); }
      steve.poner(0, 0.4); steve.cara = "feliz"; steve.salto = Math.abs(Math.sin(t * 7)) * 0.05 * (1 - tramo(s, P(0, "empresa"), P(0, "escondió")));
      // la caja "TOP SECRETO" le cae encima
      const cae = tramo(s, P(0, "empresa") - 0.1, P(0, "escondió") + 0.12);
      // ACCIÓN: levanta su invento para presumirlo; cuando ve venir la caja, se encoge y cierra los ojos
      const presume = suave2(tramo(s, P(0, "cámara") - 0.25, P(0, "cámara") + 0.2)) * (1 - suave2(tramo(s, P(0, "empresa") - 0.5, P(0, "empresa") - 0.1)));
      steve.ladea = Math.sin(t * 5) * 0.07 * presume;
      steve.agacha = suave(cae) * 0.75;
      sostener(steve, 0.72 + presume * 0.08);
      if (cae > 0.05 && cae < 0.5) { steve.miraY = -0.8; steve.ceja = -1; }
      if (cae >= 0.5) { steve.ojosCerrados = true; steve.ceja = -1; }
      if (cae > 0) {
        const y = lerp(7, 0, cae * cae) + (cae >= 1 ? Math.abs(Math.sin((s - P(0, "escondió")) * 16)) * 0.08 * Math.max(0, 1 - (s - P(0, "escondió")) * 2.5) : 0);
        ver(m.secreto, 0, y, 1.0);
        steve.cara = "sorpresa"; steve.salto = 0;
        if (cae >= 1) m.polvos.slice(0, 3).forEach((p, i) => { const k = tramo(s, P(0, "escondió") + 0.12, P(0, "escondió") + 0.6); ver(p, (i - 1) * (0.9 + k), 0.25 + k * 0.3, 1.5, 0.7 + k * 0.6); p.material.opacity = 1 - k; });
      }
      break;
    }
    // 1 — "Año 1975. Steve tiene 24 años y trabaja en Kodak, la reina de los rollos de fotos."
    case 1: {
      m.sets.fuera.visible = true; luz("dia");
      const tSteve = P(1, "Steve") - L(1), tReina = P(1, "la") - L(1);
      const z = lerp(8.5, 2.2, suave2(tramo(t, tSteve - 0.6, tReina + 0.3)));
      if (t < tSteve - 0.25) camara(suave(tramo(t, 0, tSteve - 0.25)), [3.5, 9, 22], [0, 3.5, -6], [1.5, 3.4, 15], [0, 3.2, -6]);
      else if (t < tReina) camara(suave(tramo(t, tSteve - 0.25, tReina)), [1.82, 0.5, z + 3.3], [-0.3, 1.3, z], [1.72, 0.55, z + 2.7], [-0.3, 1.38, z]);   // pegada a la cerca: los postes pasan borrosos
      else { camara(suave(tramo(t, tReina, tReina + 0.5)), [0.5, 1.6, 6.4], [0.6, 3.6, -6], [0.2, 2.6, 4.6], [1.4, 5.7, -6], 38); frente(m.primeros.hojas, -0.7, 0.72, 1.3, 1.2); }
      if (t > tSteve - 0.25) steve.poner(-0.3, z); steve.cara = "feliz"; steve.paso = z > 2.25 ? t * 10 : 0; steve.salto = z > 2.25 ? Math.abs(Math.sin(t * 10)) * 0.05 : 0;
      if (s > P(1, "24")) steve.brazo("d", 2.5 + Math.sin(t * 12) * 0.25, 0.2);       // saluda
      // ACCIÓN: llega al trabajo cargando su maletín, que se balancea al caminar
      if (steve.grupo.visible) {
        steve.brazo("i", 0.2 + Math.sin(steve.paso) * 0.22, 0.05);
        const h = steve.mano("i"); ver(m.maletin, h.x, h.y, h.z + 0.02); m.maletin.rotation.y = steve.grupo.rotation.y; m.maletin.rotation.z = -Math.sin(steve.paso) * 0.12;
        steve.ladea = Math.sin(steve.paso) * 0.04;
        if (s > P(1, "trabaja")) { steve.miraY = -0.7; steve.ceja = -0.5; }           // levanta la vista hacia la fábrica
      }
      // la corona cae sobre el rollo gigante: "la reina de los rollos"
      const k = tramo(s, P(1, "reina") - 0.15, P(1, "reina") + 0.25);
      m.corona.position.y = 6.5 + (1 - rebote(k)) * 5;
      m.corona.rotation.y = t;
      m.humos.forEach((h, i) => { const f = (t * 0.35 + i / 4) % 1; ver(h, -2.4 + (i % 2) * -0.5 + f * 0.8, 6.9 + f * 2.6, -6.8, 0.8 + f * 1.3); h.material.opacity = 1 - f; });
      break;
    }
    // 2 — "Su jefe le pasa un sensor nuevo y le dice: a ver qué haces con esto."
    case 2: {
      m.sets.lab.visible = true; luz("interior");
      vapor(1.5, 1.1, -1.0, 0, 3, 0.45);
      const cerca = suave(tramo(s, P(2, "dice") - 0.1, P(2, "dice") + 0.35));
      camara(cerca, [2.0 - u * 0.2, 0.75, 4.1 - u * 0.3], [0.05, 1.32, 0.3], [1.55, 0.8, 3.2], [0.2, 1.38, 0.3], 46);
      frente(m.primeros.rollos, 0.72, -1.0, 1.25, 0.7, 0.4, lerp(0.3, 1, cerca));
      jefe.poner(-0.78, 0.3); jefe.mira = 1; steve.poner(0.78, 0.3); steve.mira = -1;
      const pase = suave2(tramo(s, P(2, "pasa"), P(2, "nuevo")));
      jefe.alcanzar("d", CX + lerp(90, 190, c01(pase * 2) - c01(pase * 2 - 1.4) * 0.6), lerp(470, 395, c01(pase * 2)));
      steve.alcanzar("i", CX - lerp(100, 185, pase) + (pase >= 1 ? 60 * suave(tramo(s, P(2, "nuevo"), P(2, "nuevo") + 0.4)) : 0), lerp(470, 400, pase) - (pase >= 1 ? 60 * suave(tramo(s, P(2, "nuevo"), P(2, "nuevo") + 0.4)) : 0));
      const a = jefe.mano("d"), b = steve.mano("i");
      const pos = pase < 0.5 ? a : b;
      ver(m.chip, pos.x, pos.y + 0.1, pos.z + 0.1); m.chip.rotation.set(0.9, t * 2, 0);
      ver(m.destellos[0], pos.x + 0.16, pos.y + 0.3, pos.z + 0.2, 0.28 + Math.abs(Math.sin(t * 6)) * 0.14);
      steve.cara = pase >= 1 ? "sorpresa" : "neutral";
      // ACCIÓN: Steve se inclina a examinar el sensor; el jefe se lo señala con el dedo y una mano en la cintura
      const examina = suave2(tramo(s, P(2, "nuevo"), P(2, "nuevo") + 0.5));
      steve.ladea = -0.14 * examina; steve.agacha = 0.18 * examina; steve.ceja = -0.7 * examina; steve.miraY = 0.25 * examina;
      if (s > P(2, "a")) {
        jefe.cara = "feliz"; jefe.parpado = 0.5; jefe.ladea = 0.08; hablar(jefe, P(2, "a"), L(3) - 0.15);
        jefe.alcanzar("d", CX + 196, 392 + Math.sin(s * 9) * 12); jefe.alcanzar("i", CX - 96, 470);
      }
      break;
    }
    // 3 — "Steve arma un aparato del tamaño de una tostadora. Pesa casi 4 kilos, usa 16 pilas y guarda las fotos en un casete."
    case 3: {
      m.sets.lab.visible = true; luz("interior", "tarde", suave2(u));   // se le va la tarde armándolo
      const tA = P(3, "aparato"), tT = P(3, "tostadora"), tP = P(3, "Pesa"), tK = P(3, "4"), tU = P(3, "usa"), tPi = P(3, "16"), tC = P(3, "casete");
      // la cámara aparece por partes
      const sube = suave2(tramo(s, tP, tK + 0.2)) * (1 - suave2(tramo(s, tU - 0.35, tU)));
      // a la altura de la mesa y en diagonal: la fila de pilas se aleja desde el primer plano
      const lado = suave2(tramo(s, tU - 0.35, tPi + 0.25));
      camara(lado, [0.55, 1.5, 1.8], [0.08, 1.5 + sube * 0.5, -1.5], [-1.55, 1.3, 0.1], [0.15, 1.27, -1.25], 46);

      steve.poner(0, -2.0); steve.cara = "feliz";
      const tiembla = sube > 0.2 ? Math.sin(s * 40) * 0.012 : 0;
      ver(m.camara, -0.32 + tiembla, 1.07 + sube * 0.5, -1.32); m.camara.rotation.y = 0.25;
      m.camCuerpo.scale.setScalar(rebote(tramo(s, tA, tA + 0.3)) || 0.001);
      m.camLente.scale.setScalar(rebote(tramo(s, tA + 0.18, tA + 0.48)) || 0.001);
      m.camPlacas.scale.setScalar(rebote(tramo(s, tA + 0.36, tA + 0.66)) || 0.001);
      // ACCIÓN: martilla las piezas (una mano sujeta, la otra da los golpes y saltan chispas)
      if (s < tA + 0.75) {
        const arriba = Math.abs(Math.sin(s * 13));          // 1 = martillo arriba, 0 = golpe
        steve.alcanzar("i", CX - 170, 418); steve.alcanzar("d", CX - 70, 418 - arriba * 62);
        const h = steve.mano("d"); ver(m.martillo, h.x, h.y, h.z + 0.03); m.martillo.rotation.y = steve.grupo.rotation.y; m.martillo.rotation.z = 1.45 - arriba * 1.2;
        steve.miraY = 0.7; steve.ceja = 0.6; steve.cara = "neutral"; steve.ladea = 0.05 - arriba * 0.05;
        if (arriba < 0.25) ver(m.destellos[1], -0.3 + azar(Math.floor(s * 13 / Math.PI)) * 0.2, 1.42, -1.25, 0.5 * (1 - arriba * 4));
      }
      else if (sube > 0.02) { steve.cara = "serio"; steve.inclina = Math.sin(s * 30) * 0.02; steve.alcanzar("i", CX - 190, 400 - sube * 150); steve.alcanzar("d", CX - 20, 400 - sube * 150); }
      // la tostadora, para comparar
      const tost = rebote(tramo(s, tT, tT + 0.3)) * (1 - suave(tramo(s, tP - 0.3, tP)));
      if (tost > 0.01) { ver(m.tostadora, 0.62, 1.07, -1.2, tost); m.tostadora.rotation.y = -0.2; m.panes.forEach((p) => (p.position.y = 0.3 + Math.abs(Math.sin(c01((s - tT - 0.35) * 2.2) * Math.PI)) * 0.3)); }
      if (s > tT && s < tP) steve.brazo("d", 1.5, 0.2);
      if (sube > 0.3) ver(m.kilos, -0.3, 2.55, -1.1, 0.9 * rebote(tramo(s, tK, tK + 0.25)));

      // 16 pilas en fila
      m.pilas.forEach((p, i) => { const k = rebote(tramo(s, tPi + i * 0.045, tPi + i * 0.045 + 0.2)); if (k > 0) ver(p, -0.86 + i * 0.115, 1.135, -0.76, k); });
      if (s > tPi - 0.2 && s < tC - 0.6) {                    // las va contando con el dedo, siguiéndolas con la cabeza
        const va = tramo(s, tPi, tPi + 0.85);
        steve.alcanzar(va < 0.5 ? "i" : "d", CX + lerp(-200, 200, va), 455); steve.mira = lerp(-1, 1, va); steve.miraY = 0.7; steve.ladea = lerp(-0.1, 0.1, va);
      }
      // el casete vuela a su ranura
      const kc = tramo(s, tC - 0.45, tC + 0.15);
      if (s > tC - 0.6 && kc < 1) { ver(m.casete, lerp(0.95, 0.05, suave2(kc)), lerp(2.2, 1.3, kc * kc), -1.2, 1.25); m.casete.rotation.z = (1 - kc) * 3; steve.alcanzar("d", CX + 230, 300); }
      if (kc >= 1) { m.camara.position.y += Math.abs(Math.sin((s - tC - 0.15) * 14)) * 0.05 * Math.max(0, 1 - (s - tC - 0.15) * 2); steve.brazo("i", 2.6, 0.2).brazo("d", 2.6, 0.2); }
      break;
    }
    // 4 — "Toma su primera foto. Tarda 23 segundos en grabarse."
    case 4: {
      m.sets.lab.visible = true; luz("tarde", "anochecer", suave2(u));   // y mientras espera, anochece
      camara(suave2(tramo(s, P(4, "Tarda") - 0.2, tiempos.lineas[4].fin)), [-1.9, 0.8, 4.3], [0, 1.35, 0.4], [-1.25, 0.9, 3.0], [0.45, 1.5, 0.4], 48, 46);
      frente(m.primeros.libros, 0.8, -1.05, 1.3, 0.8, -0.6, 0.15);
      steve.poner(-0.85, 0.4); steve.mira = 1; ayudante.poner(0.85, 0.4); ayudante.mira = -1;
      const tF = P(4, "foto"), tT = P(4, "Tarda"), fin = tiempos.lineas[4].fin;
      const p = steve.grupo.position;
      ver(m.camara, p.x + 0.62, 0.95, p.z + 0.15); m.camara.rotation.y = Math.PI / 2;
      steve.alcanzar("i", CX + 60, 440); steve.alcanzar("d", CX + 200, 440);
      const aburre = tramo(s, tT + 0.4, fin - 0.3);
      ayudante.cara = aburre > 0.55 ? "triste" : aburre > 0.15 ? "serio" : "feliz";
      ayudante.brazo("d", lerp(2.7, 0.2, suave2(aburre)), 0.25); ayudante.brazo("i", lerp(1.1, 0.2, suave2(aburre)), lerp(1.4, 0.1, aburre));
      steve.cara = s < tT ? "feliz" : "neutral";
      // ACCIÓN: Steve aprieta el botón y se agacha a vigilar el aparato; ella mira su reloj y acaba bostezando
      if (s < tF + 0.25) steve.alcanzar("d", CX + 150, lerp(330, 392, suave(tramo(s, tF - 0.25, tF))));
      const vigila = suave2(tramo(s, tT - 0.2, tT + 0.5));
      steve.agacha = 0.4 * vigila; steve.ladea = 0.12 * vigila; steve.miraY = 0.5 * vigila; steve.ceja = vigila > 0.5 ? 0.5 : null;
      if (aburre > 0.2 && aburre <= 0.62) { ayudante.alcanzar("i", CX - 52, 318); ayudante.miraY = 0.7; ayudante.mira = -0.6; ayudante.parpado = 0.5; ayudante.ladea = -0.1; }
      if (aburre > 0.62) { ayudante.alcanzar("d", CX + 12, 266); ayudante.habla = 0.9; ayudante.ojosCerrados = true; ayudante.cara = "neutral"; ayudante.ladea = 0.16; ayudante.ceja = -0.8; }
      const fl = tramo(s, tF, tF + 0.3);
      if (fl > 0 && fl < 1) ver(m.destellos[0], p.x + 1.0, 1.2, p.z + 0.4, 2.2 * (1 - fl));
      if (s > tT) { const seg = Math.round(lerp(0, 23, tramo(s, tT, fin - 0.25))); m.contador.texto(`${seg} s`, seg >= 23 ? "#7dff9a" : "#ffffff"); ver(m.contador.sprite, 0.1, 2.5, 0.4); m.contador.sprite.scale.set(1.3, 0.65, 1); }
      break;
    }
    // 5 — "Y sale en blanco y negro, en un televisor, con apenas 100 por 100 puntitos."
    case 5: {
      m.sets.lab.visible = true; luz("anochecer");
      m.luzTele.intensity = 9 * tramo(t, 0.15, 1.3);            // la pantalla le alumbra la cara
      const z = suave2(tramo(s, P(5, "con"), P(5, "100") + 0.6));
      camara(z, [1.0 - u * 0.3, 0.7, 2.9 - u * 0.3], [-0.4, 1.25, 0.2], [-0.12, 1.22, 2.0], [-0.12, 1.2, 0.4], 42);
      if (z < 0.5) frente(m.primeros.rollos, -0.78, -1.0, 1.3, 0.7, -0.3, 0);
      ver(m.tele, 0, 0, 0); m.pantalla(tramo(t, 0.15, 1.3));
      // ACCIÓN: se asoma por un lado del televisor, señala la pantalla y luego celebra
      const asoma = suave(tramo(t, 0.15, 0.8));
      steve.poner(lerp(-0.55, -1.05, asoma), -0.3); steve.mira = 1; steve.cara = "feliz";
      steve.inclina = -0.3 * (1 - asoma); steve.ladea = -0.2 * (1 - asoma); steve.agacha = 0.35 * (1 - asoma);
      if (t > 0.8 && t <= 1.3) { steve.alcanzar("d", CX + 195, 372 + Math.sin(t * 14) * 10); steve.ceja = -0.6; }
      if (t > 1.3) { steve.brazo("i", 2.6, 0.2).brazo("d", 2.6, 0.2); steve.salto = Math.abs(Math.sin(t * 9)) * 0.12; }
      break;
    }
    // 6 — "Se la muestra a los jefes. Ellos se ríen: ¿quién va a querer ver sus fotos en una tele?"
    case 6: {
      m.sets.sala.visible = true; luz("sala"); m.pantalla(1); m.luzTele.intensity = 7;
      vapor(-0.3, 1.22, -0.8, 0, 3, 0.4); vapor(0.7, 1.22, -0.8, 3, 3, 0.4);
      const tR = P(6, "Ellos"), tQ = P(6, "quién"), tV = P(6, "fotos");
      if (s < tR - 0.1) { camara(suave(u * 2.5), [-2.1, 0.8, 4.0], [0.15, 1.4, -0.6], [-1.8, 0.85, 3.5], [0.15, 1.4, -0.6], 48); frente(m.primeros.silla, 0.7, -1.45, 1.1, 1, 0.5); }
      else if (s < tV) camara(tramo(s, tR, tV), [1.9, 1.15, 0.5], [-0.1, 1.72, -2.1], [1.7, 1.15, 0.2], [-0.1, 1.72, -2.1], 52);   // en diagonal, al ras de la mesa
      else camara(suave2(tramo(s, tV, L(7))), [-1.6, 0.85, 3.6], [-0.45, 1.5, 0.9], [-1.45, 0.9, 3.3], [-0.45, 1.52, 0.9]);
      const jefes = [jefe2, jefe, jefe3];
      jefes.forEach((j, i) => {
        j.poner((i - 1) * 1.0, -2.1);
        if (s > tR) { j.cara = "risa"; j.salto = Math.abs(Math.sin(s * 11 + i * 2)) * 0.07; j.inclina = Math.sin(s * 11 + i * 2) * 0.05; j.ladea = Math.sin(s * 11 + i * 2 + 1) * 0.13; }
      });
      // ACCIÓN: uno golpea la mesa de la risa, otro se agarra la panza y el del centro señala a Steve
      if (s > tR) {
        jefe2.alcanzar("d", CX + 96, 452 - Math.abs(Math.sin(s * 9)) * 130);
        jefe3.alcanzar("i", CX - 34, 466).alcanzar("d", CX + 34, 470); jefe3.inclina += 0.1;
      }
      if (s > tQ) { jefe.brazo("i", 1.45, 0.15); }
      if (s < tR - 0.1 || s >= tV) {      // en el acercamiento a los jefes no se ven Steve ni la tele
        steve.poner(-0.72, 0.9); steve.mira = 0.6;
        ver(m.tele, 0.78, 0, 0.7); m.tele.rotation.y = -0.15;
        if (s < tR) { steve.cara = "feliz"; steve.brazo("d", 1.4 + Math.sin(t * 9) * 0.12, 0.3); steve.salto = Math.abs(Math.sin(t * 8)) * 0.04; steve.ceja = -0.5; }
        else { steve.cara = "triste"; const baja = suave2(tramo(s, tV, tV + 0.5)); steve.miraY = 0.8 * baja; steve.ladea = -0.12 * baja; steve.parpado = 0.4 * baja; steve.agacha = 0.12 * baja; }   // agacha la cabeza
      }
      if (s > tR && s < tV) m.risas.forEach((r, i) => { const f = ((s - tR) * 0.9 + i * 0.37) % 1; ver(r, (azar(i) - 0.5) * 2.4, 2.35 + f * 0.7, -1.5, 0.45 + f * 0.2); r.material.opacity = 1 - f * f; r.material.rotation = (azar(i + 9) - 0.5) * 0.6; });
      break;
    }
    // 7 — "Y le dicen: qué lindo… pero no se lo cuentes a nadie."
    case 7: {
      m.sets.sala.visible = true;
      const tL = P(7, "qué"), tN = P(7, "pero");
      luz("sala", "drama", suave(tramo(s, tN - 0.1, tN + 0.35)));
      vapor(-0.3, 1.22, -0.8, 0, 3, 0.4);
      camara(suave2(u), [0.5, 1.22, 1.0], [0, 1.72, -2.1], [0.2, 1.27, -0.05], [0, 1.72, -2.1], 38);
      // ACCIÓN: aplaude con desgana; luego se echa hacia adelante sobre la mesa y pide silencio con el dedo
      const encima = suave2(tramo(s, tN - 0.1, tN + 0.4));
      jefe.poner(0, -2.1 + encima * 0.45);
      if (s < tN) { jefe.cara = "feliz"; hablar(jefe, tL, tN - 0.25); const palmas = Math.abs(Math.sin(s * 10)); jefe.alcanzar("i", CX - 14 - palmas * 46, 418).alcanzar("d", CX + 14 + palmas * 46, 418); jefe.parpado = 0.45; jefe.ladea = 0.07; }
      else { jefe.cara = "serio"; jefe.alcanzar("d", CX + 8, lerp(420, 268, suave(tramo(s, tN, tN + 0.25)))); jefe.ladea = -0.1 * encima; jefe.parpado = 0.4; jefe.mira = Math.sin((s - tN) * 5) * 0.5 * (1 - tramo(s, tN + 0.3, tN + 1.2)); }
      break;
    }
    // 8 — "Fíjate: Kodak ganaba una fortuna vendiendo rollos. Una cámara sin rollo era su peor enemigo."
    case 8: {
      m.sets.noche.visible = true; luz("noche");
      const tG = P(8, "ganaba"), tU = P(8, "Una"), tE = P(8, "peor");
      if (s < tU - 0.1) {
        camara(suave(tramo(t, 0, 0.6)), [0.2, 0.7, 6.2], [0, 1.15, 0], [0.45, 0.38, 4.4 - u * 0.5], [0.05, 1.22, 0], 46);
        jefe.poner(0.85, 0.3); jefe.cara = "feliz"; jefe.mira = -0.5;
        // ACCIÓN: atrapa las monedas que caen, doblando las rodillas y estirándose a cada lado
        if (s > tG) { const lado = Math.sin(s * 4.5); jefe.alcanzar("i", CX - 150 - lado * 40, 250 + lado * 60).alcanzar("d", CX + 150 - lado * 40, 250 - lado * 60);
          jefe.agacha = 0.3 + 0.3 * Math.sin(s * 9); jefe.ladea = lado * 0.12; jefe.inclina = lado * 0.06; jefe.miraY = -0.8; jefe.cara = "risa"; }
        m.monedas.forEach((mo, i) => {
          const k = tramo(s, tG + i * 0.11, tG + i * 0.11 + 0.55);
          if (k <= 0) return;
          const x = 0.2 + azar(i) * 1.9 - (i % 3 === 0 ? 1.6 : 0), z = 0.5 + azar(i + 5) * 1.2;
          ver(mo, x, lerp(7, 0.05, k * k) + (k >= 1 ? 0 : 0), z); if (k >= 1) mo.rotation.x = 0; else mo.rotation.x = s * 9 + i;
        });
      } else {
        camara(suave(tramo(s, tU - 0.1, tU + 0.5)), [-0.8, 0.5, 2.5], [0.15, 1.15, 0.35], [-1.0, 0.4, 3.1], [0.2, 1.2, 0.35], 46);
        frente(m.primeros.rollos, 0.78, -1.02, 1.3, 0.7, 0.8);
        m.pila.visible = false; m.pedestal.visible = true;
        ver(m.camara, -0.3, 0.8, 0.4, 1.25); m.camara.rotation.y = 0.35;
        const mal = tramo(s, tE, tE + 0.3);
        // ACCIÓN: al verla como enemigo, da un traspié hacia atrás
        const susto = tramo(s, tE, tE + 0.5);
        jefe.poner(1.0 + 0.32 * suave(susto), 0.3); jefe.mira = -1; jefe.cara = "sorpresa";
        jefe.agacha = 0.4 * Math.sin(susto * Math.PI); jefe.ceja = susto > 0 ? -1 : null;
        if (susto <= 0) { jefe.ladea = -0.1; jefe.alcanzar("i", CX - 20, 300); }       // antes, se rasca la barbilla mirándola
        m.foco.position.set(-0.3, 1.9, 1.6); m.foco.intensity = mal * 14;
        if (mal > 0) {
          m.cuernos.forEach((c, i) => ver(c, -0.3 + (i ? 0.2 : -0.2) + 0.06, 1.62, 0.4, rebote(mal)));
          jefe.inclina = 0.12 + 0.22 * Math.sin(susto * Math.PI); jefe.brazo("i", 2.3, 0.4).brazo("d", 2.3, 0.4); jefe.salto = Math.abs(Math.sin(s * 22)) * 0.03;
        }
      }
      break;
    }
    // 9 — "Así que guardaron el invento en un cajón."
    case 9: {
      m.sets.lab.visible = true; luz("drama");
      const tI = P(9, "invento"), tC = P(9, "cajón");
      const cierra = suave(tramo(s, tC, tC + 0.22));
      const golpe = cierra >= 1 ? Math.sin((s - tC) * 60) * 0.03 * Math.max(0, 1 - (s - tC - 0.22) * 4) : 0;
      camara(suave2(u), [-1.5 + golpe, 0.85, 4.3], [0.3, 1.25, 0.6], [-1.2 + golpe, 0.9, 3.8], [0.35, 1.2, 0.6], 46);

      frente(m.primeros.carton, 0.85, -1.15, 1.4, 0.8, 0.4);
      ver(m.archivero, 0.45, 0, 0.3);
      m.cajon.position.z = 0.85 * (1 - cierra);
      // ACCIÓN: el jefe carga el invento hasta el cajón, se agacha para meterlo, lo cierra de un empujón y se sacude las manos
      const cae = suave2(tramo(s, tI - 0.55, tI + 0.1));
      jefe.poner(lerp(-1.0, -0.62, suave(tramo(t, 0, 0.5))), 0.9); jefe.mira = 1; jefe.cara = "serio";
      jefe.agacha = 0.5 * cae * (1 - cierra); jefe.miraY = 0.6 * (1 - cierra); jefe.parpado = 0.4;
      if (cierra < 0.6) {
        const jx = jefe.grupo.position.x;
        ver(m.camara, lerp(jx + 0.62, 0.45, cae), lerp(0.98, 0.82, cae), lerp(1.05, 0.3 + m.cajon.position.z, cae), 0.85); m.camara.rotation.y = 0.3;
        if (cae < 1) { const c = m.camara.position; jefe.alcanzarMundo("d", new THREE.Vector3(c.x + 0.1, c.y + 0.22, c.z)); jefe.alcanzarMundo("i", new THREE.Vector3(c.x - 0.25, c.y + 0.12, c.z)); }
      }
      if (cae >= 1) jefe.alcanzar("d", CX + lerp(200, 150, cierra), 430);
      if (cierra >= 1) {
        const k = tramo(s, tC + 0.22, tC + 0.75);
        m.polvos.slice(0, 4).forEach((p, i) => { ver(p, 0.45 + (i - 1.5) * (0.5 + k * 0.5), 1.0 + (i % 2) * 0.35 + k * 0.4, 0.95, 0.5 + k * 0.6); p.material.opacity = 1 - k; });
        ver(m.candado, 0.45, 1.02, 0.92, rebote(tramo(s, tC + 0.3, tC + 0.55)) * 1.3);
        if (s > tC + 0.45) { const sac = Math.sin(s * 16); jefe.alcanzar("i", CX - 22, 424 + sac * 24).alcanzar("d", CX + 22, 424 - sac * 24); jefe.miraY = 0; jefe.mira = 0; }
      }
      break;
    }
    // 10 — "Años después, el mundo entero se pasó a lo digital."
    case 10: {
      m.sets.calle.visible = true; luz("amanecer", "dia", suave2(u) * 0.55);   // un día nuevo: amanece rosa
      camara(suave2(u), [-3.3, 0.85, 2.7], [0.1, 1.6, 0.1], [-2.7, 0.95, 3.1], [0.3, 1.6, 0.1], 48);
      frente(m.primeros.hidrante, 0.66, -1.5, 1.0, 1, 0.3);
      m.gente.forEach((p, i) => {
        p.poner(-2.1 + i * 0.84, (i % 2) * -1.0 + 0.6); p.cara = i % 3 === 1 ? "risa" : "feliz";
        p.salto = Math.abs(Math.sin(s * 8 + i)) * 0.05;
        p.ladea = Math.sin(s * 3 + i * 1.7) * 0.11; p.miraY = -0.5; if (i % 3 === 2) p.agacha = 0.45;   // posan para la selfi: cabeza ladeada, alguno agachado
        const lado = i % 2 ? "i" : "d";
        p.alcanzar(lado, CX + (i % 2 ? -185 : 185), 240);
        const h = p.mano(lado);
        ver(m.telefonos[i], h.x, h.y + 0.12, h.z + 0.05); m.telefonos[i].rotation.y = p.grupo.rotation.y;
        const f = ((s * 1.6 + azar(i) * 3) % 1);
        if (f < 0.25) ver(m.destellos[i + 1], h.x, h.y + 0.2, h.z + 0.15, 1.3 * (1 - f * 4));
      });
      break;
    }
    // 11 — "Y en 2012, Kodak se declaró en bancarrota."   12 — "La empresa que inventó el futuro… quebró por no usarlo."
    case 11:
    case 12: {
      m.sets.fuera.visible = true; luz("ocaso");

      m.cerrado.visible = true; m.corona.visible = false;
      const tB = P(11, "bancarrota");
      const cae = tramo(s, tB, tB + 0.35), ladea = suave(tramo(s, P(11, "Kodak"), P(11, "Kodak") + 0.3));
      // el letrero se ladea y se cae
      m.letreroFabrica.rotation.z = -0.22 * ladea - cae * cae * 0.2;
      m.letreroFabrica.position.y = 2.75 - ladea * 0.25 - cae * cae * 2.2;
      m.letreroFabrica.position.z = -3.9 + cae * 0.6;
      m.rolloGigante.rotation.z = -0.35 * ladea;
      if (cae >= 1) { const k = tramo(s, tB + 0.35, tB + 0.95); if (k < 1) m.polvos.forEach((p, i) => { ver(p, (i - 2) * (0.9 + k), 0.4 + k * 0.6, -3.0, 1.2 + k); p.material.opacity = 1 - k; }); }
      if (n === 11) {
        camara(suave2(u), [-3.2, 0.7, 2.9], [-0.7, 2.0, -3.9], [-2.9, 0.75, 2.3], [-0.7, 1.9, -3.9], 44);
        frente(m.primeros.hojas, 0.8, 0.85, 1.4, 1.1); m.look.foco = 4.6; m.look.apertura = 0.3;
        // ACCIÓN: sale cargando una caja con sus cosas, cabizbajo; cuando el letrero se cae, da un respingo y voltea
        jefe.poner(-2.1, -1.0); jefe.cara = "triste";
        const respingo = tramo(s, tB, tB + 0.5);
        jefe.salto = Math.sin(respingo * Math.PI) * 0.14 * (respingo < 1 ? 1 : 0);
        sostener(jefe, 0.8, 0.4, m.primeros.carton);

        if (respingo > 0 && respingo < 1) { jefe.cara = "sorpresa"; jefe.mira = 1; jefe.ceja = -1; }
        else { jefe.miraY = 0.8; jefe.parpado = 0.4; jefe.ladea = -0.1; jefe.mira = respingo >= 1 ? 0.8 : 0.3; }
      } else {
        const tQ = P(12, "quebró");
        camara(suave2(u), [0.7, 0.75, 5.5], [0.05, 1.3, 3], [0.45, 0.5, 6.5], [0, 1.6, 3], 40);
        frente(m.primeros.hierba, -0.7, -1.4, 1.1, 0.7); frente(m.primeros.hojas, 0.75, 0.8, 1.4, 1.2);
        // ACCIÓN: mira el aparato que tiene en las manos, lo va bajando, niega con la cabeza y al final nos mira
        steve.poner(0, 3); sostener(steve, lerp(0.78, 0.62, suave2(u)));
        const niega = tramo(s, tQ, tQ + 0.9);
        steve.cara = s < tQ ? "neutral" : "triste";
        if (s < tQ) { steve.miraY = 0.9; steve.parpado = 0.35; steve.ladea = 0.08; }
        else { steve.mira = Math.sin(niega * Math.PI * 3) * 0.7 * (1 - niega); steve.miraY = 0.5 * (1 - niega); steve.ladea = -0.06 * niega; }   // al final mira a la cámara

      }
      break;
    }
  }
  m.todos.forEach((p) => p.terminar(cuadro));
}

/** Destello blanco de pantalla completa (0..1): en la foto y en algunos cambios de lugar. */
export function destelloPantalla(s: number) {
  let o = 0;
  const pico = (t0: number, dur: number) => { const k = (s - t0) / dur; if (k >= 0 && k < 1) o = Math.max(o, 1 - k); };
  pico(P(4, "foto"), 0.3);
  [1, 8, 10].forEach((n) => pico(L(n), 0.14));
  return o;
}
