# Stickman 3D — shorts animados hechos con código

Videos verticales (1080×1920) con **personajes 2D planos dentro de un mundo 3D**, narración y subtítulos
palabra por palabra. No usa ningún generador de video con IA: todo se dibuja con código y se renderiza en tu compu.

Corto incluido: **"El invento que Kodak escondió"** (~57 s).

## Cómo funciona (en 4 piezas)

| Pieza | Qué hace | Dónde está |
|---|---|---|
| **three.js** | Dibuja el mundo 3D | `src/motor/`, `src/historia/mundo.ts` |
| **Remotion** | Convierte el código en un video, cuadro por cuadro | `src/Short.tsx`, `src/Root.tsx` |
| **edge-tts** o **ElevenLabs** (Python) | Crea la voz y dice en qué segundo cae cada palabra | `scripts/voz.py` |
| **numpy** (Python) | Crea la música y los efectos de sonido | `scripts/musica.py` |

Qué le da el aspecto "de calidad" (todo está en `src/motor/`):

- **Texturas pintadas** (`formas.ts` → `pintura`): madera, ladrillo, baldosa, hojas, pasto... se dibujan por código.
- **Contorno de tinta** en cada pieza 3D y **sombras reales**, también las de los personajes.
- **Personajes con ropa y sombreado** (`personaje.ts`): suéter, saco, bata, sudadera.
- **"Revelado" de la imagen** (`post.ts`): desenfoque de lente, resplandor de luces, color, viñeta y grano.
- **Relleno del mundo**: matas de pasto, piedras, cerros, estrellas, lámparas que iluminan.

La idea clave: **el video es una función del tiempo**. Para cada cuadro, el código pregunta
"¿en qué segundo voy?" y coloca la cámara, los personajes y los objetos donde toca.

## Requisitos

- [Node.js](https://nodejs.org) 20 o más nuevo
- Python 3 con: `pip install edge-tts numpy`
- [ffmpeg](https://ffmpeg.org) (para unir el audio)

## Uso

```bash
npm install          # una sola vez

npm run voz          # 1. crea public/voz.mp3 y src/historia/tiempos.json (voz gratis)
npm run musica       # 2. crea public/musica.wav
npm run estudio      # 3. abre el editor en el navegador para ver el video y moverte por el tiempo
npm run video:gpu    # 4. renderiza out/video.mp4 usando tu tarjeta gráfica (recomendado en tu PC)
```

Voz más natural con ElevenLabs (de pago). La clave va en una variable, **nunca dentro de un archivo**:

```bash
ELEVENLABS_API_KEY=tu_clave python3 scripts/voz.py --elevenlabs
```

Para revisar rápido cómo se ve un momento sin renderizar todo:

```bash
node scripts/fotos.mjs 1.5,12,30     # guarda fotos de esos segundos en out/fotos/
GL=angle node scripts/fotos.mjs 1.5,12,30 0.4 out/prueba   # con tarjeta gráfica, a 40 % de tamaño, en otra carpeta
node scripts/momentos.mjs 3:16+0.5 9:cajón+0.6             # ¿en qué segundo cae una palabra? (frase:palabra+desfase)
sh scripts/hoja.sh out/fotos out/hoja.jpg 6x4               # junta las fotos en una sola hoja para compararlas
```

> **En Windows**, si `npm run voz` o `npm run musica` dicen que no encuentran `python3`, usa
> `py -3 scripts/voz.py` y `py -3 scripts/musica.py`. En PowerShell la clave de ElevenLabs se pasa así:
> `$env:ELEVENLABS_API_KEY="tu_clave"; py -3 scripts/voz.py --elevenlabs`

> Sin tarjeta gráfica usa `npm run video:servidor` (más lento). En Linux con GPU: agrega `--gl=angle-egl`.
> Si Remotion no logra descargar su navegador, usa un Chrome que ya tengas:
> `NAVEGADOR=/ruta/a/chrome npm run video`

## Mapa de archivos

```
src/
  historia/
    guion.json     <- EL TEXTO que se narra (una frase por línea)
    tiempos.json   <- lo genera voz.py: segundo de cada frase y de cada palabra
    mundo.ts       <- escenarios, objetos y actores (se construyen una vez)
    tomas.ts       <- la "dirección": qué pasa en cada frase (cámara, poses, efectos)
  motor/
    formas.ts      <- cajas, cilindros, carteles, texturas pintadas, pasto, estrellas
    personaje.ts   <- el monito 2D: caras, ropa, brazos, caminar
    post.ts        <- desenfoque de lente, resplandor y color final
    util.ts        <- matemáticas para animar (suavizar, rebotar...)
  Subtitulos.tsx   <- subtítulos de 1 o 2 palabras
  Short.tsx        <- junta todo: 3D + subtítulos + audio
scripts/
  voz.py  musica.py  fotos.mjs
```

## Cómo hacer tu propia historia

1. **Escribe el guion** en `src/historia/guion.json`. Unas 13 frases cortas (~170 palabras ≈ 1 minuto).
   Sigue la fórmula de `GUION.md`: gancho, lugar, escalada, "Fíjate…", remate.
2. **Genera la voz**: `npm run voz`. Para cambiar de voz edita `VOZ` en `scripts/voz.py`
   (lista de voces: `edge-tts --list-voices | grep es-`).
3. **Construye lo que se ve** en `mundo.ts`: escenarios y objetos con `caja(...)`, `cilindro(...)`, `cartel(...)`.
   Para que se vea pintado, pasa una trama: `caja(3, 0.1, 1, 0x9a6a44, 0.035, { trama: "madera" })`.
4. **Dirige cada frase** en `tomas.ts`. Hay un `case` por frase. Dentro usas:
   - `luz("dia" | "interior" | "tarde" | "anochecer" | "sala" | "drama" | "noche" | "amanecer" | "ocaso")` para el
     ambiente. Con dos tipos y un avance, `luz("tarde", "anochecer", u)`, la luz cambia poco a poco.
   - `camara(u, desde, miraA, hasta, miraA2)` para mover la cámara (enfoca sola a lo que mira). Criterio: cámara
     **baja y cerca**; con dos personajes, en diagonal para que uno quede delante y otro detrás.
   - `frente(objeto, fx, fy, distancia)` pone un objeto borroso en una esquina, pegado al lente.
   - `personaje.poner(x, z)`, `.cara = "feliz"`, `.brazo("d", ángulo)`, `.alcanzar(...)`.
   - Cuerpo y gesto: `.agacha` (rodillas), `.ladea` (cabeza), `.miraY` (mira arriba/abajo), `.parpado`, `.ceja`.
   - `sostener(personaje, alto, adelante, objeto)` para que cargue algo con las dos manos.
   - Transiciones: agrega el segundo del cambio a `BARRIDOS` (mismo lugar) o a `FUNDIDOS` (lugar nuevo).

   - `P(frase, "palabra")` para saber en qué segundo se dice una palabra y sincronizar una acción con ella.
5. **Mira fotos de prueba** con `node scripts/fotos.mjs` y ajusta.
6. **Música**: `npm run musica`, y luego `npm run video`.

## Reglas que conviene respetar

- Todo debe depender **solo del tiempo** (nada de `Math.random()`; usa `azar(n)`), porque Remotion
  renderiza los cuadros en desorden y en paralelo.
- Coloca la **cámara antes** que a los personajes en cada toma: ellos giran para mirarla.
- Cada frase se ilustra de forma literal: si la voz dice "16 pilas", aparecen 16 pilas.

## Créditos

El estilo y el flujo de trabajo están inspirados en el skill abierto
[claude-animated-shorts](https://github.com/mromidev/claude-animated-shorts) (MIT) y su versión en español
[shorts-animados-claude](https://github.com/luispablovillasenor-afk/shorts-animados-claude).
El motor de este repositorio es propio y más sencillo, pensado para aprender.
Letra: Montserrat (licencia OFL).
