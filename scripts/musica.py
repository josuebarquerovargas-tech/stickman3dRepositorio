"""Crea la música de fondo y los efectos de sonido con puras matemáticas (numpy), sin descargar nada.

Lee   src/historia/tiempos.json
Crea  public/musica.wav   (música + efectos, del mismo largo que la voz)

Uso:  python3 scripts/musica.py
"""
import json, os, wave
import numpy as np

SR = 48000
RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
T = json.load(open(os.path.join(RAIZ, "src/historia/tiempos.json"), encoding="utf-8"))
DUR = T["duracion"]
pista = np.zeros(int(DUR * SR) + SR)
rng = np.random.default_rng(7)


def L(n): return T["lineas"][n]["inicio"]
def P(n, palabra):
    ws = [w for w in T["palabras"] if w["linea"] == n]
    for w in ws:
        if w["texto"].startswith(palabra): return w["t"]
    return next(w["t"] for w in ws if w["texto"].lower().startswith(palabra.lower()))


def poner(sonido, t, vol=1.0):
    i = int(t * SR)
    if i < 0 or i >= len(pista): return
    sonido = sonido[: len(pista) - i]
    pista[i:i + len(sonido)] += sonido * vol


def nota(frec, dur, tipo="marimba"):
    t = np.arange(int(dur * SR)) / SR
    if tipo == "marimba":   # golpe de madera: se apaga rápido
        return (np.sin(2 * np.pi * frec * t) + 0.3 * np.sin(2 * np.pi * frec * 4 * t) * np.exp(-t * 30)) * np.exp(-t * 9)
    if tipo == "bajo":
        return np.tanh(2 * np.sin(2 * np.pi * frec * t)) * np.exp(-t * 5) * 0.9
    return np.sin(2 * np.pi * frec * t) * np.exp(-t * 4)


def midi(n): return 440 * 2 ** ((n - 69) / 12)

# ---------------------------------------------------------------- música
BPM = 112
paso = 60 / BPM / 2                      # corcheas
ALEGRE = [[60, 64, 67, 72], [57, 60, 64, 69], [53, 57, 60, 65], [55, 59, 62, 67]]     # Do, La m, Fa, Sol
TRISTE = [[57, 60, 64, 69], [53, 57, 60, 65], [50, 53, 57, 62], [52, 56, 59, 64]]     # La m, Fa, Re m, Mi
def animo(t):                            # la música se pone seria cuando la historia se pone seria
    return TRISTE if (L(7) <= t < L(10)) or t >= L(11) else ALEGRE

i = 0
t = 0.0
while t < DUR:
    acordes = animo(t)
    acorde = acordes[(i // 8) % 4]
    serio = acordes is TRISTE
    patron = [0, 2, 1, 2, 3, 2, 1, 2]
    poner(nota(midi(acorde[patron[i % 8]] + 12), 0.5), t, 0.16 if not serio else 0.12)
    if i % 4 == 0: poner(nota(midi(acorde[0] - 24), 0.7, "bajo"), t, 0.22)
    if i % 2 == 1 and not serio:         # shaker en los contratiempos
        r = rng.standard_normal(int(0.05 * SR)) * np.exp(-np.arange(int(0.05 * SR)) / SR * 70)
        poner(r, t, 0.035)
    if i % 4 == 0:                       # bombo suave
        tt = np.arange(int(0.18 * SR)) / SR
        poner(np.sin(2 * np.pi * (48 + 60 * np.exp(-tt * 30)) * tt) * np.exp(-tt * 18), t, 0.2)
    i += 1
    t += paso

# ---------------------------------------------------------------- efectos
def ruido(dur): return rng.standard_normal(int(dur * SR))
def env(n, sube, baja):
    t = np.arange(n) / SR
    return np.minimum(1, t / max(sube, 1e-4)) * np.exp(-np.maximum(0, t - sube) * baja)

def golpe():        # algo pesado cae
    t = np.arange(int(0.4 * SR)) / SR
    return np.sin(2 * np.pi * (45 + 80 * np.exp(-t * 25)) * t) * np.exp(-t * 10) + ruido(0.4) * np.exp(-t * 40) * 0.3
def pop(frec=700):  # algo aparece
    t = np.arange(int(0.09 * SR)) / SR
    return np.sin(2 * np.pi * frec * (1 + 2 * t) * t) * np.exp(-t * 45)
def soplo(dur=0.35):  # cambio de escena
    r = ruido(dur); k = np.ones(200) / 200
    return np.convolve(r, k, "same") * np.sin(np.linspace(0, np.pi, len(r))) ** 2 * 6
def clic():         # obturador de cámara
    return np.concatenate([ruido(0.012) * 0.8, np.zeros(int(0.05 * SR)), ruido(0.02)]) * 0.7
def campana(frec=1568):
    t = np.arange(int(0.5 * SR)) / SR
    return (np.sin(2 * np.pi * frec * t) + 0.5 * np.sin(2 * np.pi * frec * 2.01 * t)) * np.exp(-t * 9)
def tic():
    t = np.arange(int(0.03 * SR)) / SR
    return np.sin(2 * np.pi * 2200 * t) * np.exp(-t * 150)

poner(golpe(), P(0, "escondió") + 0.12, 0.9)
for n in (1, 8, 10): poner(soplo(), L(n) - 0.12, 0.35)
poner(campana(1318), P(1, "reina") + 0.1, 0.22)
poner(campana(2093), P(2, "nuevo"), 0.18)
for k in range(3): poner(pop(600 + k * 150), P(3, "aparato") + k * 0.18, 0.3)
poner(pop(500), P(3, "tostadora"), 0.3); poner(campana(1760), P(3, "tostadora") + 0.35, 0.15)
for k in range(16): poner(pop(900 + k * 25), P(3, "16") + k * 0.045, 0.14)
poner(clic(), P(3, "casete") + 0.15, 0.5)
poner(clic(), P(4, "foto"), 0.8)
t0, t1 = P(4, "Tarda"), T["lineas"][4]["fin"] - 0.25
for k in range(12): poner(tic(), t0 + (t1 - t0) * k / 12, 0.3)
poner(campana(1760), t1, 0.2)
for k in range(10): poner(tic(), L(5) + 0.15 + k * 0.115, 0.12)
for k in range(14): poner(campana(1900 + (k % 5) * 180)[: int(0.2 * SR)], P(8, "ganaba") + 0.45 + k * 0.11, 0.1)
poner(golpe(), P(8, "peor"), 0.5)
poner(golpe(), P(9, "cajón") + 0.2, 0.9); poner(clic(), P(9, "cajón") + 0.5, 0.5)
for k in range(6): poner(clic(), L(10) + 0.3 + k * 0.42, 0.35)
poner(golpe(), P(11, "bancarrota") + 0.33, 1.0)

# ---------------------------------------------------------------- guardar
pista = pista[: int(DUR * SR)]
pista[-SR // 2:] *= np.linspace(1, 0, SR // 2)       # se apaga al final
pista = np.tanh(pista * 1.4) * 0.8
with wave.open(os.path.join(RAIZ, "public/musica.wav"), "wb") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((pista * 32767).astype(np.int16).tobytes())
print(f"Listo: {DUR:.1f} s -> public/musica.wav")
