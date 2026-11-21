// Subtítulos: una o dos palabras a la vez, sincronizadas con la voz.
import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import tiempos from "./historia/tiempos.json";

// Agrupamos las palabras cortas con la siguiente ("la cámara", "en un").
type Grupo = { desde: number; hasta: number; texto: string };
const grupos: Grupo[] = [];
const palabras = tiempos.palabras;
for (let i = 0; i < palabras.length; i++) {
  const p = palabras[i], sig = palabras[i + 1];
  let texto = p.texto, fin = p.t + p.d;
  if (sig && sig.linea === p.linea && p.texto.length <= 3 && sig.t - fin < 0.25 && (p.texto + sig.texto).length <= 13) {
    texto += " " + sig.texto; fin = sig.t + sig.d; i++;
  }
  grupos.push({ desde: p.t, hasta: fin, texto: texto.toLowerCase() });
}
grupos.forEach((g, i) => { const sig = grupos[i + 1]; g.hasta = sig ? Math.min(sig.desde, g.hasta + 0.35) : g.hasta + 0.4; });

export const Subtitulos: React.FC = () => {
  const s = useCurrentFrame() / useVideoConfig().fps;
  const g = grupos.find((x) => s >= x.desde - 0.03 && s < x.hasta);
  if (!g) return null;
  const entra = Math.min(1, (s - g.desde + 0.03) / 0.07);
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: "66%", textAlign: "center", fontFamily: "Montserrat, sans-serif",
      fontWeight: 900, fontSize: 84, color: "white", WebkitTextStroke: "16px #14101a", paintOrder: "stroke fill",
      transform: `scale(${0.85 + 0.15 * entra})`, letterSpacing: -1 }}>
      {g.texto}
    </div>
  );
};
