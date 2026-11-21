// Saca fotos de prueba de algunos segundos del video (mucho más rápido que renderizar todo).
// Uso:  node scripts/fotos.mjs 1.5,12,30 [escala] [carpeta]     -> out/fotos/s_1.5.jpg, ...
// Con tarjeta gráfica es más rápido:  GL=angle node scripts/fotos.mjs 1.5,12,30
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import fs from "node:fs";

const segundos = (process.argv[2] ?? "1,10,20,30,40,50").split(",").map(Number);
const escala = Number(process.argv[3] ?? 0.5);
const carpeta = process.argv[4] ?? "out/fotos";
const opciones = { chromiumOptions: { gl: process.env.GL || "swangle" }, browserExecutable: process.env.NAVEGADOR || undefined, inputProps: { audio: false, subtitulos: true } };
fs.mkdirSync(carpeta, { recursive: true });
const serveUrl = await bundle({ entryPoint: "src/index.ts" });
const composition = await selectComposition({ serveUrl, id: "Short", ...opciones });
for (const s of segundos) {
  const output = `${carpeta}/s_${s}.jpg`;
  await renderStill({ composition, serveUrl, frame: Math.round(s * composition.fps), output, imageFormat: "jpeg", scale: escala, ...opciones,
    onBrowserLog: (l) => l.type === "error" && console.log("  navegador:", l.text) });
  console.log("foto", output);
}
