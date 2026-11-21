import React from "react";
import { Composition } from "remotion";
import { Short } from "./Short";
import { DURACION, FPS } from "./historia/tomas";
import { Miniatura } from "./Miniatura";

export const Root: React.FC = () => (
  <>
    <Composition id="Short" component={Short} width={1080} height={1920} fps={FPS}
      durationInFrames={Math.ceil(DURACION * FPS)} defaultProps={{ subtitulos: true, audio: true }} />
    <Composition id="Miniatura" component={Miniatura} width={1080} height={1920} fps={FPS} durationInFrames={Math.ceil(DURACION * FPS)} />

  </>
);

