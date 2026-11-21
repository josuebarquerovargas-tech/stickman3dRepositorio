"""Genera la narración y los tiempos de cada palabra.

Dos motores de voz:
  - edge-tts (gratis, por defecto):     python3 scripts/voz.py
  - ElevenLabs (de pago, más natural):  ELEVENLABS_API_KEY=tu_clave python3 scripts/voz.py --elevenlabs
    (nunca escribas tu clave dentro de un archivo del repositorio)

Lee   src/historia/guion.json  (una frase por línea)
Crea  public/voz.mp3            (la narración completa)
      src/historia/tiempos.json (cuándo empieza cada frase y cada palabra)

Uso:  python3 scripts/voz.py
"""
import asyncio, base64, json, os, subprocess, sys, tempfile, urllib.request

VOZ = "es-MX-JorgeNeural"   # prueba otras con: edge-tts --list-voices | grep es-
VELOCIDAD = "+14%"          # más alto = habla más rápido
PAUSA = 0.16                # silencio (segundos) entre frases
# --- ElevenLabs ---
VOZ_11 = "dlGxemPxFMTY7iXagmOj"       # "Fernando Martinez" (español latino). Otras: https://elevenlabs.io/app/voice-library
MODELO_11 = "eleven_multilingual_v2"
VELOCIDAD_11 = 1.12                    # entre 0.7 y 1.2
USAR_11 = "--elevenlabs" in sys.argv
RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROXY = os.environ.get("HTTPS_PROXY") or None


def frase_elevenlabs(texto, ruta_mp3, antes, despues):
    """Igual que frase_a_audio pero con ElevenLabs. Devuelve los tiempos letra por letra y los juntamos en palabras."""
    cuerpo = json.dumps({"text": texto, "model_id": MODELO_11, "previous_text": antes, "next_text": despues,
                         "voice_settings": {"stability": 0.45, "similarity_boost": 0.8, "speed": VELOCIDAD_11}}).encode()
    req = urllib.request.Request(f"https://api.elevenlabs.io/v1/text-to-speech/{VOZ_11}/with-timestamps?output_format=mp3_44100_128",
                                 data=cuerpo, headers={"Content-Type": "application/json", "xi-api-key": os.environ.get("ELEVENLABS_API_KEY", "")})
    r = json.load(urllib.request.urlopen(req, timeout=120))
    open(ruta_mp3, "wb").write(base64.b64decode(r["audio_base64"]))
    a = r["alignment"]
    palabras, actual, ini, fin = [], "", 0.0, 0.0
    for letra, t0, t1 in zip(a["characters"], a["character_start_times_seconds"], a["character_end_times_seconds"]):
        if letra.isspace():
            if actual: palabras.append((ini, fin - ini, actual))
            actual = ""
        else:
            if not actual: ini = t0
            actual += letra; fin = t1
    if actual: palabras.append((ini, fin - ini, actual))
    limpia = lambda w: w.strip("¿¡.,:;…?!\"")
    return [(t, d, limpia(w)) for (t, d, w) in palabras if limpia(w)]


async def frase_a_audio(texto, ruta_mp3):
    """Convierte una frase en mp3 y devuelve [(inicio, duracion, palabra), ...] en segundos."""
    import edge_tts
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
        if USAR_11:
            ws = frase_elevenlabs(texto, mp3, " ".join(guion[:i])[-300:], " ".join(guion[i + 1:])[:300])
        else:
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
