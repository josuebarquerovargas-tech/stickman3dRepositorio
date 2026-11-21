// Funciones matemáticas pequeñas que se usan en todas las animaciones.

/** Limita un número entre 0 y 1. */
export const c01 = (x: number) => Math.max(0, Math.min(1, x));

/** Mezcla a y b: u=0 da a, u=1 da b. */
export const lerp = (a: number, b: number, u: number) => a + (b - a) * u;

/** Progreso (0..1) de un tramo que empieza en `a` y termina en `b` (segundos). */
export const tramo = (s: number, a: number, b: number) => c01((s - a) / (b - a));

/** Arranca rápido y frena suave. */
export const suave = (u: number) => 1 - Math.pow(1 - c01(u), 3);

/** Lento al inicio y al final. */
export const suave2 = (u: number) => { const x = c01(u); return x * x * (3 - 2 * x); };

/** Aparece "saltando": se pasa un poco del tamaño final y regresa. */
export const rebote = (u: number) => {
  const x = c01(u) - 1;
  return c01(u) === 0 ? 0 : 1 + 2.7 * x * x * x + 1.7 * x * x;
};

/** Número "al azar" pero siempre igual para la misma semilla (necesario para que el video sea repetible). */
export const azar = (n: number) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
