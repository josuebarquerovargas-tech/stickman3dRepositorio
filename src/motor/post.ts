// "Revelado" de la imagen, como en una cámara de cine. Primero se dibuja el mundo 3D en una imagen
// interna y luego se le aplican, en orden:
//   1. desenfoque de lente (lo que está lejos o muy cerca del punto de enfoque se ve borroso)
//   2. brillo (las cosas muy luminosas "sangran" luz: lámparas, pantallas, destellos)
//   3. color final (saturación, tinte, viñeta y un poco de grano)
import * as THREE from "three";
import { FullScreenQuad } from "three/examples/jsm/postprocessing/Pass.js";

export interface Look {
  foco: number;          // distancia (unidades 3D) a la que la imagen está nítida
  apertura: number;      // 0 = todo nítido; 1 = fondo muy borroso
  brillo: number;        // fuerza del resplandor
  tinte: [number, number, number];   // color que tiñe toda la imagen
  saturacion: number;    // 1 = normal
  exposicion: number;    // 1 = normal
}
export const lookNormal = (): Look => ({ foco: 6, apertura: 0.45, brillo: 0.7, tinte: [1, 1, 1], saturacion: 1.18, exposicion: 1 });

const VERT = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

const DOF = `
varying vec2 vUv;
uniform sampler2D tColor, tDepth;
uniform float near, far, foco, apertura, maxPx;
uniform vec2 px;
float zLineal(vec2 uv){ float z = texture2D(tDepth, uv).x * 2.0 - 1.0; return 2.0 * near * far / (far + near - z * (far - near)); }
float coc(float z){ return clamp(apertura * abs(z - foco) / max(z, 0.01), 0.0, 1.0) * maxPx; }
void main(){
  vec3 col = texture2D(tColor, vUv).rgb;
  float z = zLineal(vUv), c = coc(z);
  if (c < 0.6) { gl_FragColor = vec4(col, 1.0); return; }
  vec3 acc = col; float peso = 1.0;
  for (int i = 0; i < 40; i++) {                       // 40 muestras en espiral
    float r = sqrt((float(i) + 0.5) / 40.0) * c, a = float(i) * 2.39996;
    vec2 uv = vUv + vec2(cos(a), sin(a)) * r * px;
    float zs = zLineal(uv);
    // algo nítido que está delante no debe "embarrarse" sobre lo borroso de atrás
    float w = zs > z - 0.15 ? 1.0 : clamp(coc(zs) / max(r, 0.5), 0.0, 1.0);
    acc += texture2D(tColor, uv).rgb * w; peso += w;
  }
  gl_FragColor = vec4(acc / peso, 1.0);
}`;

const CLARO = `
varying vec2 vUv; uniform sampler2D tColor; uniform float umbral;
void main(){ vec3 c = texture2D(tColor, vUv).rgb; gl_FragColor = vec4(max(c - umbral, 0.0), 1.0); }`;

const BORROSO = `
varying vec2 vUv; uniform sampler2D tColor; uniform vec2 dir;
void main(){
  vec3 c = texture2D(tColor, vUv).rgb * 0.227;
  c += (texture2D(tColor, vUv + dir * 1.385).rgb + texture2D(tColor, vUv - dir * 1.385).rgb) * 0.316;
  c += (texture2D(tColor, vUv + dir * 3.231).rgb + texture2D(tColor, vUv - dir * 3.231).rgb) * 0.070;
  gl_FragColor = vec4(c, 1.0);
}`;

const FINAL = `
varying vec2 vUv;
uniform sampler2D tColor, tBrillo;
uniform float brillo, saturacion, exposicion, semilla;
uniform vec3 tinte;
float azar(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233)) + semilla) * 43758.5453); }
void main(){
  vec3 c = texture2D(tColor, vUv).rgb + texture2D(tBrillo, vUv).rgb * brillo;
  c *= exposicion * tinte;
  float gris = dot(c, vec3(0.2126, 0.7152, 0.0722));
  c = mix(vec3(gris), c, saturacion);
  c = mix(c, 0.8 + (1.0 - exp(-(c - 0.8) * 4.0)) * 0.2, step(0.8, c));   // las luces altas se aplanan suave
  c = pow(max(c, 0.0), vec3(1.0 / 2.2));                                 // a colores de pantalla
  c = c * c * (3.0 - 2.0 * c) * 0.35 + c * 0.65;                         // un poco más de contraste
  vec2 d = vUv - vec2(0.5, 0.52);
  c *= 1.0 - smoothstep(0.35, 0.95, length(d * vec2(1.0, 0.8))) * 0.42;  // viñeta
  c += (azar(vUv * 900.0) - 0.5) * 0.022;                                // grano
  gl_FragColor = vec4(c, 1.0);
}`;

const pase = (frag: string, uniforms: Record<string, unknown>) =>
  new FullScreenQuad(new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: frag, depthTest: false, depthWrite: false,
    uniforms: Object.fromEntries(Object.entries(uniforms).map(([k, v]) => [k, { value: v }])) }));

export class Post {
  private escena: THREE.WebGLRenderTarget;
  private enfocada: THREE.WebGLRenderTarget;
  private b: THREE.WebGLRenderTarget[];
  private dof; private claro; private borroso; private final;

  constructor(private gl: THREE.WebGLRenderer, private w: number, private h: number) {
    const hdr = { type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter };
    this.escena = new THREE.WebGLRenderTarget(w, h, { ...hdr, samples: 4 });   // samples: 4 = bordes suaves
    this.escena.depthTexture = new THREE.DepthTexture(w, h);
    this.enfocada = new THREE.WebGLRenderTarget(w, h, hdr);
    this.b = [0, 1, 2, 3].map((i) => new THREE.WebGLRenderTarget(w >> (i < 2 ? 2 : 3), h >> (i < 2 ? 2 : 3), hdr));
    this.dof = pase(DOF, { tColor: this.escena.texture, tDepth: this.escena.depthTexture, near: 0.1, far: 200, foco: 6, apertura: 0.4,
      maxPx: h * 0.019, px: new THREE.Vector2(1 / w, 1 / h) });
    this.claro = pase(CLARO, { tColor: this.enfocada.texture, umbral: 1.0 });
    this.borroso = pase(BORROSO, { tColor: null, dir: new THREE.Vector2() });
    this.final = pase(FINAL, { tColor: this.enfocada.texture, tBrillo: this.b[2].texture, brillo: 0.7, saturacion: 1.15, exposicion: 1,
      semilla: 0, tinte: new THREE.Vector3(1, 1, 1) });
  }

  render(escena: THREE.Scene, camara: THREE.PerspectiveCamera, look: Look, cuadro: number) {
    const gl = this.gl, u = (q: FullScreenQuad) => (q.material as THREE.ShaderMaterial).uniforms;
    gl.setRenderTarget(this.escena); gl.clear(); gl.render(escena, camara);
    Object.assign(u(this.dof), { near: { value: camara.near }, far: { value: camara.far }, foco: { value: look.foco }, apertura: { value: look.apertura } });
    u(this.dof).tColor.value = this.escena.texture; u(this.dof).tDepth.value = this.escena.depthTexture;
    u(this.dof).maxPx.value = this.h * 0.019; u(this.dof).px.value.set(1 / this.w, 1 / this.h);
    gl.setRenderTarget(this.enfocada); this.dof.render(gl);
    gl.setRenderTarget(this.b[0]); this.claro.render(gl);
    // desenfocamos lo brillante dos veces: a 1/4 y a 1/8 del tamaño, horizontal y vertical
    const borrar = (de: number, a: number, x: number, y: number) => {
      u(this.borroso).tColor.value = this.b[de].texture; u(this.borroso).dir.value.set(x / this.b[a].width, y / this.b[a].height);
      gl.setRenderTarget(this.b[a]); this.borroso.render(gl);
    };
    borrar(0, 1, 1, 0); borrar(1, 0, 0, 1); borrar(0, 2, 1, 0); borrar(2, 3, 0, 1); borrar(3, 2, 1.5, 0); borrar(2, 3, 0, 1.5);
    Object.assign(u(this.final), { brillo: { value: look.brillo }, saturacion: { value: look.saturacion }, exposicion: { value: look.exposicion },
      semilla: { value: cuadro * 0.37 }, tBrillo: { value: this.b[3].texture }, tColor: { value: this.enfocada.texture } });
    u(this.final).tinte.value.set(...look.tinte);
    gl.setRenderTarget(null); this.final.render(gl);
  }
}
