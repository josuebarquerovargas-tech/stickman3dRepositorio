// Miniatura (portada) del corto: un cuadro del video, sin subtítulos, con el titular encima.
// Se genera con:  npm run miniatura   ->  out/miniatura.png
// Para usar otro momento del video de fondo, cambia --frame en package.json (cuadro = segundo x 30).
import React from "react";
import { AbsoluteFill } from "remotion";
import { Short } from "./Short";

const TINTA = "#14101a";
const letra: React.CSSProperties = { fontFamily: "Montserrat, sans-serif", fontWeight: 900, textAlign: "center", paintOrder: "stroke fill", letterSpacing: -2 };

export const Miniatura: React.FC = () => (
  <AbsoluteFill>
    <Short subtitulos={false} audio={false} />
    {/* un poco de sombra arriba y abajo para que el texto se lea */}
    <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(20,16,26,0.55) 0%, rgba(20,16,26,0) 24%, rgba(20,16,26,0) 62%, rgba(20,16,26,0.6) 100%)" }} />
    <div style={{ ...letra, position: "absolute", left: 0, right: 0, top: 70, fontSize: 112, lineHeight: 1.02, color: "white", WebkitTextStroke: `20px ${TINTA}` }}>
      INVENTÓ LA<br /><span style={{ color: "#ffd23f" }}>CÁMARA DIGITAL</span>
    </div>
    <div style={{ position: "absolute", left: 0, right: 0, top: 1330, display: "flex", justifyContent: "center" }}>
      <div style={{ ...letra, fontSize: 98, lineHeight: 1.04, whiteSpace: "nowrap", color: "white", background: "#d9482f", padding: "26px 44px 30px", border: `12px solid ${TINTA}`,

        borderRadius: 18, transform: "rotate(-5deg)", boxShadow: `14px 16px 0 ${TINTA}`, WebkitTextStroke: `6px ${TINTA}` }}>
        …Y SU EMPRESA<br />LA ESCONDIÓ
      </div>
    </div>
    <div style={{ ...letra, position: "absolute", right: 60, top: 1130, fontSize: 92, color: "#ffd23f", WebkitTextStroke: `16px ${TINTA}`, transform: "rotate(8deg)" }}>1975</div>
  </AbsoluteFill>
);
