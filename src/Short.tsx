// La composición final: mundo 3D + subtítulos + audio.
import React, { useMemo, useState, useEffect } from "react";
import * as THREE from "three";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame, useVideoConfig, delayRender, continueRender } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree, useFrame } from "@react-three/fiber";
import "@fontsource/montserrat/900.css";
import { crearMundo } from "./historia/mundo";
import { aplicarToma, destelloPantalla, fundido } from "./historia/tomas";
import { Subtitulos } from "./Subtitulos";
import { Post } from "./motor/post";

const Escena: React.FC = () => {
  const cuadro = useCurrentFrame();
  const { fps } = useVideoConfig();
  const camara = useThree((x) => x.camera) as THREE.PerspectiveCamera;
  const gl = useThree((x) => x.gl);
  const mundo = useMemo(() => crearMundo(), []);
  const post = useMemo(() => { const t = gl.getDrawingBufferSize(new THREE.Vector2()); return new Post(gl, t.x, t.y); }, [gl]);
  aplicarToma(mundo, camara, cuadro / fps, cuadro);   // coloca todo para este cuadro
  // Dibujamos nosotros (en vez del dibujo automático) para pasar la imagen por el "revelado".
  useFrame(() => post.render(mundo.escena, camara, mundo.look, cuadro), 1);
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
      <AbsoluteFill style={{ backgroundColor: "white", opacity: destelloPantalla(s) }} />
      <AbsoluteFill style={{ backgroundColor: "#14101c", opacity: fundido(s) }} />

      {subtitulos && <Subtitulos />}
      {audio && <Audio src={staticFile("voz.mp3")} />}
      {audio && <Audio src={staticFile("musica.wav")} volume={0.5} />}
    </AbsoluteFill>
  );
};
