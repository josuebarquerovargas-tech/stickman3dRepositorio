// Imprime segundos útiles para sacar fotos: "palabra+desfase" de una frase.
// Uso:  node scripts/momentos.mjs 0:cámara+0.2 3:16+0.5 9:fin-0.3 5:inicio+1
import fs from "node:fs";
const t = JSON.parse(fs.readFileSync("src/historia/tiempos.json", "utf8"));
const salida = process.argv.slice(2).map((arg) => {
  const [, n, palabra, desfase] = arg.match(/^(\d+):(.+?)([+-][\d.]+)?$/);
  const linea = t.lineas[Number(n)];
  let base;
  if (palabra === "inicio") base = linea.inicio;
  else if (palabra === "fin") base = linea.fin;
  else {
    const w = t.palabras.filter((x) => x.linea === Number(n)).find((x) => x.texto.toLowerCase().startsWith(palabra.toLowerCase()));
    if (!w) throw new Error(`No encuentro "${palabra}" en la frase ${n}`);
    base = w.t;
  }
  return (base + Number(desfase ?? 0)).toFixed(2);
});
console.log(salida.join(","));
