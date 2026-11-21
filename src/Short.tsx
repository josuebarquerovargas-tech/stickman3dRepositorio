// La composición final: mundo 3D + subtítulos + audio.
import React, { useMemo, useState, useEffect } from "react";
import * as THREE from "three";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame, useVideoConfig, delayRender, continueRender } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import "@fontsource/montserrat/900.css";
import { crearMundo } from "./historia/mundo";
import { aplicarToma, destelloPantalla } from "./historia/tomas";
import { Subtitulos } from "./Subtitulos";

const Escena: React.FC = () => {
  const cuadro = useCurrentFrame();
  const { fps } = useVideoConfig();
  const camara = useThree((x) => x.camera) as THREE.PerspectiveCamera;
  const mundo = useMemo(() => crearMundo(), []);
  aplicarToma(mundo, camara, cuadro / fps, cuadro);   // coloca todo para este cuadro
  return <primitive object={mundo.escena} />;
};

export const Short: React.FC<{ subtitulos?: boolean; audio?: boolean }> = ({ subtitulos = true, audio = true }) => {
  const { width, height, fps } = useVideoConfig();
  const s = useCurrentFrame() / fps;
  // Esperamos a que cargue la letra antes de dibujar carteles y subtítulos.
  const [lista, setLista] = useState(false);
  const [espera] = useState(() => delayRender("fuente"));
  useEffect(() => { document.fonts.load("900 40px Montserrat").then(() => { setLista(true); continueRender(espera); }); }, [espera]);
  if (!lista) return null;
  return (
    <AbsoluteFill style={{ backgroundColor: "#101018" }}>
      <ThreeCanvas width={width} height={height} shadows camera={{ fov: 40, near: 0.1, far: 200 }} gl={{ antialias: true }}>
        <Escena />
      </ThreeCanvas>
      {/* viñeta: oscurece un poco las orillas */}
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 55%, rgba(10,5,30,0.38) 100%)" }} />
      <AbsoluteFill style={{ backgroundColor: "white", opacity: destelloPantalla(s) }} />
      {subtitulos && <Subtitulos />}
      {audio && <Audio src={staticFile("voz.mp3")} />}
      {audio && <Audio src={staticFile("musica.wav")} volume={0.5} />}
    </AbsoluteFill>
  );
};
