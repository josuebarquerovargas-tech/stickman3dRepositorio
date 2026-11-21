"""Arregla las pausas muertas de la narración SIN volver a generar la voz.

A veces el motor de voz deja casi un segundo de silencio (o un chasquido) al final de una frase,
y suena a que el audio "se quedó pegado". Este script deja la misma pausa corta después de cada
frase y vuelve a calcular los tiempos de las palabras.

Lee y reescribe  public/voz.mp3  y  src/historia/tiempos.json
Uso:  python3 scripts/pausas.py        (después corre: python3 scripts/musica.py)
"""
import json, os, subprocess
import numpy as np

SR = 48000
PAUSA = 0.22            # silencio que queda después de cada frase (segundos)
UMBRAL = 10 ** (-42 / 20)   # por debajo de esto lo contamos como silencio
RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MP3 = os.path.join(RAIZ, "public/voz.mp3")
JSON_T = os.path.join(RAIZ, "src/historia/tiempos.json")

T = json.load(open(JSON_T, encoding="utf-8"))
crudo = subprocess.run(["ffmpeg", "-v", "error", "-i", MP3, "-f", "s16le", "-ac", "1", "-ar", str(SR), "-"],
                       check=True, capture_output=True).stdout
audio = np.frombuffer(crudo, dtype=np.int16).astype(np.float64) / 32768

V = int(0.01 * SR)      # ventanas de 10 ms
def fin_del_habla(desde, hasta):
    """Segundo en que de verdad deja de hablar: el primer silencio de 0.2 s o más a partir de `desde`."""
    a, b = int(desde * SR), min(int(hasta * SR), len(audio))
    n = (b - a) // V
    if n <= 0: return hasta
    fuerza = np.sqrt((audio[a:a + n * V].reshape(n, V) ** 2).mean(axis=1))
    callado, racha = fuerza < UMBRAL, 0
    for i, c in enumerate(callado):
        racha = racha + 1 if c else 0
        if racha >= 20: return desde + (i - 19) * V / SR
    # no hubo un silencio largo: quitamos solo el silencio pegado al final
    ult = np.nonzero(~callado)[0]
    return desde + (ult[-1] + 1) * V / SR if len(ult) else hasta

trozos, lineas, palabras, reloj = [], [], [], 0.0
for i, l in enumerate(T["lineas"]):
    ws = [w for w in T["palabras"] if w["linea"] == i]
    fin = fin_del_habla(ws[-1]["t"], l["fin"])
    trozo = audio[int(l["inicio"] * SR):int((fin + 0.03) * SR)].copy()
    k = int(0.03 * SR); trozo[-k:] *= np.linspace(1, 0, k)          # se apaga suave: sin chasquidos
    trozo = np.concatenate([trozo, np.zeros(int(PAUSA * SR))])
    dur = len(trozo) / SR
    lineas.append({"inicio": round(reloj, 3), "fin": round(reloj + dur, 3), "texto": l["texto"]})
    for w in ws:
        t = w["t"] - l["inicio"]
        palabras.append({"t": round(reloj + t, 3), "d": round(min(w["d"], max(0.05, fin - w["t"])), 3), "texto": w["texto"], "linea": i})
    print(f"{i:2d}  antes {l['fin'] - l['inicio']:5.2f} s   ahora {dur:5.2f} s   (quitado {l['fin'] - l['inicio'] - dur:+.2f})")
    trozos.append(trozo); reloj += dur

salida = np.concatenate(trozos)
subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "s16le", "-ac", "1", "-ar", str(SR), "-i", "-", "-b:a", "192k", MP3],
               input=(np.clip(salida, -1, 1) * 32767).astype(np.int16).tobytes(), check=True)
json.dump({"duracion": round(reloj + 0.5, 3), "lineas": lineas, "palabras": palabras},
          open(JSON_T, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(f"Listo: {T['duracion']:.2f} s -> {reloj + 0.5:.2f} s")
