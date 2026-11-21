"""Genera la narración con edge-tts (gratis) y los tiempos de cada palabra.

Lee   src/historia/guion.json  (una frase por línea)
Crea  public/voz.mp3            (la narración completa)
      src/historia/tiempos.json (cuándo empieza cada frase y cada palabra)

Uso:  python3 scripts/voz.py
"""
import asyncio, json, os, subprocess, tempfile
import edge_tts

VOZ = "es-MX-JorgeNeural"   # prueba otras con: edge-tts --list-voices | grep es-
VELOCIDAD = "+14%"          # más alto = habla más rápido
PAUSA = 0.16                # silencio (segundos) entre frases
RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROXY = os.environ.get("HTTPS_PROXY") or None


async def frase_a_audio(texto, ruta_mp3):
    """Convierte una frase en mp3 y devuelve [(inicio, duracion, palabra), ...] en segundos."""
    tts = edge_tts.Communicate(texto, VOZ, rate=VELOCIDAD, proxy=PROXY, boundary="WordBoundary")
    palabras = []
    with open(ruta_mp3, "wb") as f:
        async for trozo in tts.stream():
            if trozo["type"] == "audio":
                f.write(trozo["data"])
            elif trozo["type"] == "WordBoundary":
                # edge-tts mide el tiempo en unidades de 100 nanosegundos
                palabras.append((trozo["offset"] / 1e7, trozo["duration"] / 1e7, trozo["text"]))
    return palabras


async def main():
    guion = json.load(open(os.path.join(RAIZ, "src/historia/guion.json"), encoding="utf-8"))
    tmp = tempfile.mkdtemp()
    lineas, palabras, trozos, reloj = [], [], [], 0.0
    for i, texto in enumerate(guion):
        mp3 = os.path.join(tmp, f"{i}.mp3")
        ws = await frase_a_audio(texto, mp3)
        dur = ws[-1][0] + ws[-1][1] + PAUSA      # cortamos el silencio sobrante del final
        wav = os.path.join(tmp, f"{i}.wav")
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", mp3, "-t", f"{dur:.3f}",
                        "-af", f"apad=whole_dur={dur:.3f}", "-ar", "48000", "-ac", "1", wav], check=True)
        lineas.append({"inicio": round(reloj, 3), "fin": round(reloj + dur, 3), "texto": texto})
        for (t, d, w) in ws:
            palabras.append({"t": round(reloj + t, 3), "d": round(d, 3), "texto": w, "linea": i})
        trozos.append(wav)
        reloj += dur
        print(f"{i:2d} {lineas[-1]['inicio']:6.2f}s  {texto}")
    lista = os.path.join(tmp, "lista.txt")
    open(lista, "w").write("".join(f"file '{w}'\n" for w in trozos))
    salida = os.path.join(RAIZ, "public/voz.mp3")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", lista,
                    "-af", "loudnorm=I=-15:TP=-1.5", "-ar", "48000", "-b:a", "192k", salida], check=True)
    json.dump({"duracion": round(reloj + 0.5, 3), "lineas": lineas, "palabras": palabras},
              open(os.path.join(RAIZ, "src/historia/tiempos.json"), "w", encoding="utf-8"),
              ensure_ascii=False, indent=1)
    print(f"Listo: {reloj:.1f} s de voz -> public/voz.mp3")


asyncio.run(main())
