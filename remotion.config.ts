import { Config } from "@remotion/cli/config";
Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
// Si Remotion no puede descargar su navegador, usa uno ya instalado:
//   NAVEGADOR=/ruta/a/chrome npm run video
if (process.env.NAVEGADOR) Config.setBrowserExecutable(process.env.NAVEGADOR);
