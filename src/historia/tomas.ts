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

export function aplicarToma(m: Mundo, cam: THREE.PerspectiveCamera, s: number, cuadro: number) {
  const { steve, jefe, jefe2, jefe3, ayudante } = m.actores;
  m.reiniciar();
  Personaje.camara = cam;

  // --- ayudas -------------------------------------------------------------
  /** Coloca la cámara: va de (pos0, mira0) a (pos1, mira1) según u. */
  const camara = (u: number, pos0: V3, mira0: V3, pos1: V3 = pos0, mira1: V3 = mira0, fov = 40) => {
    cam.position.lerpVectors(v(pos0), v(pos1), u);
    cam.lookAt(v(mira0).lerp(v(mira1), u));
    cam.fov = fov; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
  };
  /** Ambiente de luz. */
  const luz = (tipo: "dia" | "interior" | "drama" | "noche" | "gris") => {
    const t = { dia: [1.5, 2.4, 0xfff1dd, "dia"], interior: [1.7, 1.7, 0xfff0d8, "dia"], drama: [0.7, 1.3, 0xb9a8ff, "noche"],
      noche: [1.0, 1.5, 0xaab4ff, "noche"], gris: [1.25, 0.9, 0xcfd6e6, "gris"] }[tipo] as [number, number, number, "dia" | "gris" | "noche"];
    m.ambiente.intensity = t[0]; m.sol.intensity = t[1]; m.sol.color.set(t[2]);
    (m.boveda.material as THREE.MeshBasicMaterial).map = m.cielos[t[3]];
    const tinte = tipo === "drama" ? 0xb4a8d8 : tipo === "noche" ? 0xc4c8f0 : tipo === "gris" ? 0xd6d8de : 0xffffff;
    m.todos.forEach((p) => p.tinte(tinte));
  };
  const ver = (o: THREE.Object3D, x: number, y: number, z: number, escala = 1) => { o.visible = true; o.position.set(x, y, z); o.scale.setScalar(escala); return o; };
  const hablar = (p: Personaje, desde: number, hasta: number) => { if (s > desde && s < hasta) p.habla = Math.abs(Math.sin(s * 13)) * 0.9; };
  /** La cámara digital sostenida frente al cuerpo de un personaje. */
  const sostener = (p: Personaje, alto = 0.72, adelante = 0.45) => {
    const g = p.grupo.position;
    const dir = new THREE.Vector3(Math.sin(p.grupo.rotation.y), 0, Math.cos(p.grupo.rotation.y));
    ver(m.camara, g.x + dir.x * adelante, alto, g.z + dir.z * adelante);
    m.camara.rotation.y = p.grupo.rotation.y;
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
      camara(atras, [0, 0.95, 2.2], [0, 0.95, 0.4], [0.5 - u * 0.3, 1.5, 5.6 - u * 0.5], [0, 1.2, 0.4]);
      steve.poner(0, 0.4); steve.cara = "feliz"; steve.salto = Math.abs(Math.sin(t * 7)) * 0.05 * (1 - tramo(s, P(0, "empresa"), P(0, "escondió")));
      sostener(steve);
      // la caja "TOP SECRETO" le cae encima
      const cae = tramo(s, P(0, "empresa") - 0.1, P(0, "escondió") + 0.12);
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
      else if (t < tReina) camara(suave(tramo(t, tSteve - 0.25, tReina)), [1.4, 1.5, z + 5.6], [-0.3, 1.3, z], [1.0, 1.5, z + 4.6], [-0.3, 1.35, z]);
      else camara(suave(tramo(t, tReina, tReina + 0.5)), [0.5, 2.2, 6], [0.6, 3.6, -6], [0.2, 3.0, 4.2], [1.4, 5.7, -6], 38);
      if (t > tSteve - 0.25) steve.poner(-0.3, z); steve.cara = "feliz"; steve.paso = z > 2.25 ? t * 10 : 0; steve.salto = z > 2.25 ? Math.abs(Math.sin(t * 10)) * 0.05 : 0;
      if (s > P(1, "24")) steve.brazo("d", 2.5 + Math.sin(t * 12) * 0.25, 0.2);       // saluda
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
      const cerca = suave(tramo(s, P(2, "dice") - 0.1, P(2, "dice") + 0.35));
      camara(cerca, [0, 1.45, 6.0 - u * 0.5], [0, 1.25, 0.3], [0.1, 1.5, 4.9], [0.05, 1.35, 0.3]);
      jefe.poner(-0.78, 0.3); jefe.mira = 1; steve.poner(0.78, 0.3); steve.mira = -1;
      const pase = suave2(tramo(s, P(2, "pasa"), P(2, "nuevo")));
      jefe.alcanzar("d", CX + lerp(90, 190, c01(pase * 2) - c01(pase * 2 - 1.4) * 0.6), lerp(470, 395, c01(pase * 2)));
      steve.alcanzar("i", CX - lerp(100, 185, pase) + (pase >= 1 ? 60 * suave(tramo(s, P(2, "nuevo"), P(2, "nuevo") + 0.4)) : 0), lerp(470, 400, pase) - (pase >= 1 ? 60 * suave(tramo(s, P(2, "nuevo"), P(2, "nuevo") + 0.4)) : 0));
      const a = jefe.mano("d"), b = steve.mano("i");
      const pos = pase < 0.5 ? a : b;
      ver(m.chip, pos.x, pos.y + 0.1, pos.z + 0.1); m.chip.rotation.set(0.9, t * 2, 0);
      ver(m.destellos[0], pos.x + 0.16, pos.y + 0.3, pos.z + 0.2, 0.28 + Math.abs(Math.sin(t * 6)) * 0.14);
      steve.cara = pase >= 1 ? "sorpresa" : "neutral";
      if (s > P(2, "a")) { jefe.cara = "feliz"; jefe.brazo("i", 1.0, 1.3).brazo("d", 1.0, 1.3); hablar(jefe, P(2, "a"), L(3) - 0.15); }
      break;
    }
    // 3 — "Steve arma un aparato del tamaño de una tostadora. Pesa casi 4 kilos, usa 16 pilas y guarda las fotos en un casete."
    case 3: {
      m.sets.lab.visible = true; luz("interior");
      camara(suave2(u), [0.5, 2.1, 3.2], [0, 1.4, -1.3], [-0.3, 2.0, 2.9], [0, 1.4, -1.3], 42);
      steve.poner(0, -2.0); steve.cara = "feliz";
      const tA = P(3, "aparato"), tT = P(3, "tostadora"), tP = P(3, "Pesa"), tK = P(3, "4"), tU = P(3, "usa"), tPi = P(3, "16"), tC = P(3, "casete");
      // la cámara aparece por partes
      const sube = suave2(tramo(s, tP, tK + 0.2)) * (1 - suave2(tramo(s, tU - 0.35, tU)));
      const tiembla = sube > 0.2 ? Math.sin(s * 40) * 0.012 : 0;
      ver(m.camara, -0.32 + tiembla, 1.07 + sube * 0.5, -1.32); m.camara.rotation.y = 0.25;
      m.camCuerpo.scale.setScalar(rebote(tramo(s, tA, tA + 0.3)) || 0.001);
      m.camLente.scale.setScalar(rebote(tramo(s, tA + 0.18, tA + 0.48)) || 0.001);
      m.camPlacas.scale.setScalar(rebote(tramo(s, tA + 0.36, tA + 0.66)) || 0.001);
      if (s < tA) { steve.alcanzar("i", CX - 120, 400 + Math.sin(s * 18) * 45); steve.alcanzar("d", CX + 20, 400 - Math.sin(s * 18) * 45); }
      else if (sube > 0.02) { steve.cara = "serio"; steve.inclina = Math.sin(s * 30) * 0.02; steve.alcanzar("i", CX - 190, 400 - sube * 150); steve.alcanzar("d", CX - 20, 400 - sube * 150); }
      // la tostadora, para comparar
      const tost = rebote(tramo(s, tT, tT + 0.3)) * (1 - suave(tramo(s, tP - 0.3, tP)));
      if (tost > 0.01) { ver(m.tostadora, 0.62, 1.07, -1.2, tost); m.tostadora.rotation.y = -0.2; m.panes.forEach((p) => (p.position.y = 0.3 + Math.abs(Math.sin(c01((s - tT - 0.35) * 2.2) * Math.PI)) * 0.3)); }
      if (s > tT && s < tP) steve.brazo("d", 1.5, 0.2);
      if (sube > 0.3) ver(m.kilos, -0.3, 2.75, -1.1, 0.9 * rebote(tramo(s, tK, tK + 0.25)));
      // 16 pilas en fila
      m.pilas.forEach((p, i) => { const k = rebote(tramo(s, tPi + i * 0.045, tPi + i * 0.045 + 0.2)); if (k > 0) ver(p, -0.86 + i * 0.115, 1.135, -0.76, k); });
      // el casete vuela a su ranura
      const kc = tramo(s, tC - 0.45, tC + 0.15);
      if (s > tC - 0.6 && kc < 1) { ver(m.casete, lerp(0.95, 0.05, suave2(kc)), lerp(2.2, 1.3, kc * kc), -1.2, 1.25); m.casete.rotation.z = (1 - kc) * 3; steve.alcanzar("d", CX + 230, 300); }
      if (kc >= 1) { m.camara.position.y += Math.abs(Math.sin((s - tC - 0.15) * 14)) * 0.05 * Math.max(0, 1 - (s - tC - 0.15) * 2); steve.brazo("i", 2.6, 0.2).brazo("d", 2.6, 0.2); }
      break;
    }
    // 4 — "Toma su primera foto. Tarda 23 segundos en grabarse."
    case 4: {
      m.sets.lab.visible = true; luz("interior");
      camara(suave2(u), [0, 1.5, 6.6], [0, 1.3, 0.4], [0, 1.5, 6.0], [0, 1.3, 0.4]);
      steve.poner(-0.85, 0.4); steve.mira = 1; ayudante.poner(0.85, 0.4); ayudante.mira = -1;
      const tF = P(4, "foto"), tT = P(4, "Tarda"), fin = tiempos.lineas[4].fin;
      const p = steve.grupo.position;
      ver(m.camara, p.x + 0.62, 0.95, p.z + 0.15); m.camara.rotation.y = Math.PI / 2;
      steve.alcanzar("i", CX + 60, 440); steve.alcanzar("d", CX + 200, 440);
      const aburre = tramo(s, tT + 0.4, fin - 0.3);
      ayudante.cara = aburre > 0.55 ? "triste" : aburre > 0.15 ? "serio" : "feliz";
      ayudante.brazo("d", lerp(2.7, 0.2, suave2(aburre)), 0.25); ayudante.brazo("i", lerp(1.1, 0.2, suave2(aburre)), lerp(1.4, 0.1, aburre));
      steve.cara = s < tT ? "feliz" : "neutral";
      const fl = tramo(s, tF, tF + 0.3);
      if (fl > 0 && fl < 1) ver(m.destellos[0], p.x + 1.0, 1.2, p.z + 0.4, 2.2 * (1 - fl));
      if (s > tT) { const seg = Math.round(lerp(0, 23, tramo(s, tT, fin - 0.25))); m.contador.texto(`${seg} s`, seg >= 23 ? "#7dff9a" : "#ffffff"); ver(m.contador.sprite, 0, 2.75, 0.5); m.contador.sprite.scale.set(1.5, 0.75, 1); }
      break;
    }
    // 5 — "Y sale en blanco y negro, en un televisor, con apenas 100 por 100 puntitos."
    case 5: {
      m.sets.lab.visible = true; luz("interior");
      const z = suave2(tramo(s, P(5, "con"), P(5, "100") + 0.6));
      camara(z, [0.5 - u * 0.4, 1.5, 5.2 - u * 0.6], [-0.2, 1.25, 0.2], [-0.12, 1.22, 2.0], [-0.12, 1.2, 0.4], 42);
      ver(m.tele, 0, 0, 0); m.pantalla(tramo(t, 0.15, 1.3));
      steve.poner(-1.05, -0.2); steve.mira = 1; steve.cara = "feliz";
      if (t > 1.3) { steve.brazo("i", 2.6, 0.2).brazo("d", 2.6, 0.2); steve.salto = Math.abs(Math.sin(t * 9)) * 0.12; }
      break;
    }
    // 6 — "Se la muestra a los jefes. Ellos se ríen: ¿quién va a querer ver sus fotos en una tele?"
    case 6: {
      m.sets.sala.visible = true; luz("interior"); m.pantalla(1);
      const tR = P(6, "Ellos"), tQ = P(6, "quién"), tV = P(6, "fotos");
      if (s < tR - 0.1) camara(suave(u * 2.5), [0, 2.6, 9.5], [0, 1.4, -0.6], [0, 2.3, 8.6], [0, 1.4, -0.6], 46);
      else if (s < tV) camara(tramo(s, tR, tV), [0, 1.9, 3.9], [0, 1.75, -2.1], [0, 1.85, 3.5], [0, 1.75, -2.1], 50);
      else camara(suave2(tramo(s, tV, L(7))), [0.2, 1.5, 5.6], [0.1, 1.25, 0.8], [0.2, 1.5, 5.0], [0.1, 1.25, 0.8]);
      const jefes = [jefe2, jefe, jefe3];
      jefes.forEach((j, i) => {
        j.poner((i - 1) * 1.0, -2.1);
        if (s > tR) { j.cara = "risa"; j.salto = Math.abs(Math.sin(s * 11 + i * 2)) * 0.07; j.inclina = Math.sin(s * 11 + i * 2) * 0.05; }
      });
      if (s > tQ) { jefe.brazo("i", 1.45, 0.15); }
      if (s < tR - 0.1 || s >= tV) {      // en el acercamiento a los jefes no se ven Steve ni la tele
        steve.poner(-0.72, 0.9); steve.mira = 0.6;
        ver(m.tele, 0.78, 0, 0.7); m.tele.rotation.y = -0.15;
        if (s < tR) { steve.cara = "feliz"; steve.brazo("d", 1.4, 0.3); } else steve.cara = "triste";
      }
      if (s > tR && s < tV) m.risas.forEach((r, i) => { const f = ((s - tR) * 0.9 + i * 0.37) % 1; ver(r, (azar(i) - 0.5) * 2.4, 2.35 + f * 0.7, -1.5, 0.45 + f * 0.2); r.material.opacity = 1 - f * f; r.material.rotation = (azar(i + 9) - 0.5) * 0.6; });
      break;
    }
    // 7 — "Y le dicen: qué lindo… pero no se lo cuentes a nadie."
    case 7: {
      m.sets.sala.visible = true;
      const tL = P(7, "qué"), tN = P(7, "pero");
      luz(s > tN ? "drama" : "interior");
      camara(suave2(u), [0.25, 1.8, 1.9], [0, 1.7, -2.1], [0.1, 1.78, 0.9], [0, 1.7, -2.1], 36);
      jefe.poner(0, -2.1);
      if (s < tN) { jefe.cara = "feliz"; hablar(jefe, tL, tN - 0.25); jefe.brazo("i", 1.0, 1.4); }
      else { jefe.cara = "serio"; jefe.alcanzar("d", CX + 8, lerp(420, 268, suave(tramo(s, tN, tN + 0.25)))); }
      break;
    }
    // 8 — "Fíjate: Kodak ganaba una fortuna vendiendo rollos. Una cámara sin rollo era su peor enemigo."
    case 8: {
      m.sets.noche.visible = true; luz("noche");
      const tG = P(8, "ganaba"), tU = P(8, "Una"), tE = P(8, "peor");
      if (s < tU - 0.1) {
        camara(suave(tramo(t, 0, 0.6)), [0, 3.4, 9], [0, 1.2, 0], [0.2, 1.7, 6.6 - u * 0.8], [0, 1.25, 0], 42);
        jefe.poner(0.85, 0.3); jefe.cara = "feliz"; jefe.mira = -0.5;
        if (s > tG) { jefe.brazo("i", 2.6, 0.2).brazo("d", 2.6, 0.2); jefe.salto = Math.abs(Math.sin(s * 9)) * 0.1; }
        m.monedas.forEach((mo, i) => {
          const k = tramo(s, tG + i * 0.11, tG + i * 0.11 + 0.55);
          if (k <= 0) return;
          const x = 0.2 + azar(i) * 1.9 - (i % 3 === 0 ? 1.6 : 0), z = 0.5 + azar(i + 5) * 1.2;
          ver(mo, x, lerp(7, 0.05, k * k) + (k >= 1 ? 0 : 0), z); if (k >= 1) mo.rotation.x = 0; else mo.rotation.x = s * 9 + i;
        });
      } else {
        camara(suave(tramo(s, tU - 0.1, tU + 0.5)), [0.4, 1.6, 4.2], [0, 1.2, 0.3], [0.3, 1.5, 5.4], [0.15, 1.15, 0.3], 42);
        m.pila.visible = false; m.pedestal.visible = true;
        ver(m.camara, -0.3, 0.8, 0.4, 1.25); m.camara.rotation.y = 0.35;
        jefe.poner(1.0, 0.3); jefe.mira = -1; jefe.cara = "sorpresa";
        const mal = tramo(s, tE, tE + 0.3);
        m.foco.position.set(-0.3, 1.9, 1.6); m.foco.intensity = mal * 14;
        if (mal > 0) {
          m.cuernos.forEach((c, i) => ver(c, -0.3 + (i ? 0.2 : -0.2) + 0.06, 1.62, 0.4, rebote(mal)));
          jefe.inclina = 0.12; jefe.brazo("i", 2.3, 0.4).brazo("d", 2.3, 0.4); jefe.salto = Math.abs(Math.sin(s * 22)) * 0.03;
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
      camara(suave2(u), [1.5 + golpe, 2.1, 5.6], [0, 1.05, 0.6], [1.1 + golpe, 1.9, 5.0], [0, 1.05, 0.6]);
      ver(m.archivero, 0.45, 0, 0.3);
      m.cajon.position.z = 0.85 * (1 - cierra);
      const cae = tramo(s, tI - 0.5, tI + 0.1);
      if (cierra < 0.6) { ver(m.camara, 0.45, lerp(2.9, 0.82, suave2(cae)), 0.3 + m.cajon.position.z, 0.85); m.camara.rotation.y = 0.3; }
      jefe.poner(-0.62, 0.9); jefe.mira = 1; jefe.cara = "serio";
      jefe.alcanzar("d", CX + lerp(200, 150, cierra), 430);
      if (cierra >= 1) {
        const k = tramo(s, tC + 0.22, tC + 0.75);
        m.polvos.slice(0, 4).forEach((p, i) => { ver(p, 0.45 + (i - 1.5) * (0.5 + k * 0.5), 1.0 + (i % 2) * 0.35 + k * 0.4, 0.95, 0.5 + k * 0.6); p.material.opacity = 1 - k; });
        ver(m.candado, 0.45, 1.02, 0.92, rebote(tramo(s, tC + 0.3, tC + 0.55)) * 1.3);
      }
      break;
    }
    // 10 — "Años después, el mundo entero se pasó a lo digital."
    case 10: {
      m.sets.calle.visible = true; luz("dia");
      camara(suave2(u), [-1.0, 1.8, 8.6], [-0.4, 1.45, 0], [1.0, 1.7, 7.8], [0.4, 1.45, 0], 46);
      m.gente.forEach((p, i) => {
        p.poner(-2.1 + i * 0.84, (i % 2) * -1.0 + 0.6); p.cara = i % 3 === 1 ? "risa" : "feliz";
        p.salto = Math.abs(Math.sin(s * 8 + i)) * 0.05;
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
      m.sets.fuera.visible = true; luz("gris");
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
        camara(suave2(u), [1.2, 2.6, 9.5], [0, 2.4, -6], [0.6, 2.2, 7.2], [0, 2.2, -6], 42);
        jefe.poner(-2.1, -1.0); jefe.cara = "triste"; jefe.mira = 0.7; jefe.brazo("i", 0.1, 0).brazo("d", 0.1, 0);
      } else {
        const tQ = P(12, "quebró");
        camara(suave2(u), [0.7, 1.5, 7.2], [0.15, 1.3, 3], [0.3, 1.9, 9.2], [0, 1.7, 0], 40);
        steve.poner(0, 3); sostener(steve);
        steve.cara = s < tQ ? "neutral" : "triste"; steve.mira = s < tQ ? -0.5 : 0;   // al final mira a la cámara
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
