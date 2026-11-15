// The fallback engine, for browsers without WebGPU. No fluid here: every
// particle's position is worked out from scratch each frame in the vertex
// shader (a spot in a turning ball, a spot in the image, and a push from the
// last few kicks), so there is no simulation state to keep and it runs on
// almost anything. It keeps the same shapes, colours and timing as the real
// thing; it just moves like a cloud of dots instead of a liquid.

import type { Engine, FrameInput, TargetSet } from '../types';
import { INK_RED } from '../types';

const FOV_TAN = Math.tan((14 * Math.PI) / 180);
const MAX_KICKS = 4;

const VS = /* glsl */ `#version 300 es
precision highp float;
layout(location = 0) in vec4 aBall;    // xyz in the unit ball, w = seed
layout(location = 1) in vec3 aTarget;  // xyz in image space, [-1, 1]
layout(location = 2) in vec4 aColor;

uniform mat3 uRot;
uniform vec4 uStage;   // scale, scale, offset x, offset y
uniform vec4 uShape;   // form, how far toward the image, ball radius, image radius
uniform vec4 uCam;     // tanHalf, aspect, camDist, point scale (px per unit at the centre)
uniform vec4 uAudio;   // bass, mid, high, time
uniform vec4 uKicks[${MAX_KICKS}]; // age (s), strength, seed, unused
uniform vec3 uInk;
uniform float uBands[16];
uniform float uPresence;
uniform float uBandMean;
uniform float uEmergence;

out vec3 vColor;
out vec3 vNormal;
out float vFlat;
out float vEmergence;

float hash(float x) { return fract(sin(x * 127.1) * 43758.5453); }

float bandAt(float u) {
  float x = clamp(u, 0.0, 1.0) * 15.0;
  int i = int(floor(x));
  int j = min(i + 1, 15);
  return mix(uBands[i], uBands[j], fract(x));
}

void main() {
  float seed = aBall.w;
  float t = uAudio.w;
  float form = uShape.x;

  // the ball: slowly turning shells, breathing with the bass
  vec3 b = aBall.xyz;
  float r = length(b);
  float ang = t * (0.25 + 0.5 * (1.0 - r)) + uAudio.y * 1.5 * r;
  float ca = cos(ang), sa = sin(ang);
  b = vec3(b.x * ca + b.z * sa, b.y, -b.x * sa + b.z * ca);
  b += 0.05 * uAudio.z * vec3(sin(t * 7.0 + seed * 40.0), sin(t * 6.0 + seed * 23.0), sin(t * 8.0 + seed * 31.0));
  // the spectrum, as lobes around the ball and rings through the image
  vec3 bn = normalize(b + vec3(1e-4));
  float around = abs(fract((atan(bn.z, bn.x) / 6.2832 + 0.5) * 2.0) * 2.0 - 1.0);
  float lobe = (bandAt(around) - uBandMean) * (1.0 - bn.y * bn.y) * uPresence;
  vec3 ball = b * uShape.z * (1.0 + uAudio.x * 0.14 + lobe * 0.7 * r);
  float ringB = (bandAt(length(aTarget.xy)) - uBandMean) * uPresence;
  vec3 image = vec3(aTarget.xy * (1.0 + ringB * 0.09), aTarget.z) * uShape.w * (1.0 + uAudio.x * 0.05);
  vec3 pos = mix(ball, image, uShape.y);

  // each recent kick throws the particle out and lets it fall back
  vec3 nrm = normalize(pos + vec3(1e-4));
  vec3 flatDir = normalize(vec3(nrm.xy * 0.75, sign(seed - 0.5) * (0.35 + hash(seed * 91.7))));
  vec3 kdir = normalize(mix(nrm, flatDir, form));
  for (int i = 0; i < ${MAX_KICKS}; i++) {
    float age = uKicks[i].x;
    if (age < 0.0 || age > 1.6) continue;
    float j1 = sin(dot(nrm, vec3(3.1, 2.3, 4.7)) * 1.9 + uKicks[i].z * 6.283);
    float j2 = sin(dot(nrm, vec3(-2.1, 4.3, 1.7)) * 2.3 + uKicks[i].z * 3.7);
    float jet = 0.3 + 1.5 * pow(0.5 + 0.5 * j1 * j2, 2.0);
    float x = age / 0.13;
    float push = x * exp(1.0 - x);
    pos += kdir * push * uKicks[i].y * jet * (0.5 + hash(seed * 17.3)) * uShape.z * 0.3;
  }

  // Stagger the particles' arrival from the centre. Once open, this is an
  // identity transform and ordinary shape changes keep their existing flow.
  float delay = seed * 0.22 + min(length(pos) / uShape.w, 1.0) * 0.12;
  float opening = smoothstep(delay, 1.0, uEmergence);
  vec3 view = uRot * (pos * opening) + vec3(0.0, 0.0, -uCam.z);
  float z = -view.z;
  vec2 ndc = vec2(view.x / (z * uCam.x * uCam.y), view.y / (z * uCam.x));
  ndc = ndc * uStage.xy + uStage.zw;
  gl_Position = vec4(ndc, clamp((z - uCam.z * 0.4) / (uCam.z * 1.2), 0.0, 1.0) * 2.0 - 1.0, 1.0);
  gl_PointSize = max(1.5, uCam.w * (uCam.z / z) * (0.8 + 0.4 * seed)) * sqrt(opening);

  vColor = mix(uInk, aColor.rgb, form);
  vNormal = uRot * normalize(mix(nrm, vec3(0.0, 0.0, 1.0), form));
  vFlat = form;
  vEmergence = opening;
}
`;

const FS = /* glsl */ `#version 300 es
precision highp float;
in vec3 vColor;
in vec3 vNormal;
in float vFlat;
in float vEmergence;
uniform float uDim;
out vec4 outColor;

void main() {
  if (vEmergence <= 0.0) discard;
  vec2 c = gl_PointCoord * 2.0 - 1.0;
  if (dot(c, c) > 1.0) discard;
  // the same three flat tones as the fluid: shadow, body, highlight
  vec3 L = normalize(vec3(-0.48, 0.62, 0.62));
  float ndl = dot(normalize(vNormal), L);
  vec3 col = vColor * mix(0.34, 1.0, step(0.05, ndl));
  col = mix(col, vec3(1.0, 0.96, 0.93), step(0.93, ndl) * (1.0 - vFlat));
  col = mix(col, vColor, vFlat * 0.9);
  outColor = vec4(col * uDim, uDim);
}
`;

const GLOW_VS = /* glsl */ `#version 300 es
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2)) * 2.0 - 1.0;
  gl_Position = vec4(p, 0.999, 1.0);
}
`;

const GLOW_FS = /* glsl */ `#version 300 es
precision highp float;
uniform vec4 uStagePx; // centre x, centre y, radius, glow
uniform vec3 uInk;
uniform float uDim;
uniform float uHeight;
out vec4 outColor;
void main() {
  vec2 p = vec2(gl_FragCoord.x, uHeight - gl_FragCoord.y);
  float rr = length(p - uStagePx.xy) / max(uStagePx.z, 1.0);
  float halo = exp(-max(rr - 0.45, 0.0) * 2.4) * uStagePx.w;
  outColor = vec4(uInk * halo * 0.42, halo * 0.3) * uDim;
}
`;

function program(gl: WebGL2RenderingContext, vs: string, fs: string): WebGLProgram {
  const compile = (type: number, src: string) => {
    const shader = gl.createShader(type)!;
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) ?? 'shader failed');
    return shader;
  };
  const prog = gl.createProgram()!;
  gl.attachShader(prog, compile(gl.VERTEX_SHADER, vs));
  gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog) ?? 'link failed');
  return prog;
}

export function createGlEngine(canvas: HTMLCanvasElement): Engine | null {
  const gl = canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: false, depth: true });
  if (!gl) return null;
  const small = window.matchMedia('(pointer: coarse)').matches || Math.min(window.innerWidth, window.innerHeight) < 600;
  try {
    return new GlEngine(gl, small ? 28_000 : 64_000);
  } catch (err) {
    console.warn('[visual] webgl2 engine failed:', err);
    return null;
  }
}

class GlEngine implements Engine {
  readonly kind = 'webgl2' as const;
  readonly particleCount: number;
  private gl: WebGL2RenderingContext;
  private prog: WebGLProgram;
  private glow: WebGLProgram;
  private vao: WebGLVertexArrayObject;
  private targetBuf: WebGLBuffer;
  private colorBuf: WebGLBuffer;
  private ballBuf: WebGLBuffer;
  private active: number;
  private width = 1;
  private height = 1;
  private imgArea = 2;
  private kicks = new Float32Array(MAX_KICKS * 4).fill(-1);
  private kickSlot = 0;
  private lastSeed = -1;
  private lastKick = 0;
  private u: Record<string, WebGLUniformLocation | null> = {};
  private g: Record<string, WebGLUniformLocation | null> = {};

  constructor(gl: WebGL2RenderingContext, count: number) {
    this.gl = gl;
    this.particleCount = count;
    this.active = count;
    this.prog = program(gl, VS, FS);
    this.glow = program(gl, GLOW_VS, GLOW_FS);
    for (const name of ['uRot', 'uStage', 'uShape', 'uCam', 'uAudio', 'uKicks', 'uInk', 'uDim', 'uBands', 'uPresence', 'uBandMean', 'uEmergence']) {
      this.u[name] = gl.getUniformLocation(this.prog, name);
    }
    for (const name of ['uStagePx', 'uInk', 'uDim', 'uHeight']) this.g[name] = gl.getUniformLocation(this.glow, name);

    const ball = new Float32Array(count * 4);
    for (let i = 0; i < count; i++) {
      let x = 0, y = 0, z = 0;
      do {
        x = Math.random() * 2 - 1;
        y = Math.random() * 2 - 1;
        z = Math.random() * 2 - 1;
      } while (x * x + y * y + z * z > 1);
      // push toward the surface: only the outside of a ball of dots is seen
      const r = Math.hypot(x, y, z) || 1;
      const k = Math.pow(r, 0.35) / r;
      ball.set([x * k, y * k, z * k, Math.random()], i * 4);
    }

    this.vao = gl.createVertexArray()!;
    gl.bindVertexArray(this.vao);
    this.ballBuf = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.ballBuf);
    gl.bufferData(gl.ARRAY_BUFFER, ball, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 0, 0);

    this.targetBuf = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.targetBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(count * 3), gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);

    this.colorBuf = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Uint8Array(count * 4), gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(2, 4, gl.UNSIGNED_BYTE, true, 0, 0);
    gl.bindVertexArray(null);
  }

  setTargets(targets: TargetSet): void {
    const gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.targetBuf);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, targets.positions.subarray(0, this.particleCount * 3));
    gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuf);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, new Uint8Array(targets.colors.buffer, targets.colors.byteOffset, this.particleCount * 4));
    // fraction of the image square that is solid, to size the dots
    const cells = 64;
    const seen = new Uint8Array(cells * cells);
    let covered = 0;
    for (let i = 0; i < this.particleCount; i += 2) {
      const x = Math.min(cells - 1, Math.max(0, Math.floor((targets.positions[i * 3] * 0.5 + 0.5) * cells)));
      const y = Math.min(cells - 1, Math.max(0, Math.floor((targets.positions[i * 3 + 1] * 0.5 + 0.5) * cells)));
      if (!seen[y * cells + x]) {
        seen[y * cells + x] = 1;
        covered++;
      }
    }
    this.imgArea = (covered / (cells * cells)) * 4;
  }

  setActive(count: number): void {
    this.active = Math.max(1000, Math.min(this.particleCount, Math.floor(count)));
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }

  render(f: FrameInput): void {
    const gl = this.gl;
    const W = this.width;
    const H = this.height;
    gl.viewport(0, 0, W, H);
    gl.clearColor(0, 0, 0, 0);
    gl.clearDepth(1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // a new kick takes the oldest slot; all of them age
    for (let i = 0; i < MAX_KICKS; i++) if (this.kicks[i * 4] >= 0) this.kicks[i * 4] += f.dt;
    if (f.kickSeed !== this.lastSeed && f.kick > 0.2 && f.kick > this.lastKick) {
      this.lastSeed = f.kickSeed;
      this.kicks.set([0, f.kick, f.kickSeed, 0], this.kickSlot * 4);
      this.kickSlot = (this.kickSlot + 1) % MAX_KICKS;
    }
    this.lastKick = f.kick;

    // Same framing as the WebGPU engine: unit ball radius 1, image radius 1.5,
    // and the stage radius maps to 1.4 ball radii or the image's edge.
    const ballR = 1;
    const imgR = 1.5;
    const camDist = 8;
    const ref = ballR * 1.4 * (1 - f.form) + imgR * f.form;
    const scale = ((f.radius * 2) / H) * ((camDist * FOV_TAN) / ref);
    const pxPerUnit = f.radius / ref;
    const ballDot = 0.05 * pxPerUnit * Math.sqrt(64_000 / this.active);
    const imgDot = Math.sqrt((this.imgArea * imgR * imgR) / this.active) * pxPerUnit * 1.5;
    const dot = Math.max(2, (ballDot * (1 - f.form) + imgDot * f.form) * 2);

    const cy = Math.cos(f.yaw), sy = Math.sin(f.yaw);
    const cp = Math.cos(f.pitch), sp = Math.sin(f.pitch);

    gl.disable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.useProgram(this.glow);
    gl.uniform4f(this.g.uStagePx, f.cx, f.cy, f.radius * f.emergence, f.glow);
    gl.uniform3f(this.g.uInk, INK_RED[0], INK_RED[1], INK_RED[2]);
    gl.uniform1f(this.g.uDim, f.dim);
    gl.uniform1f(this.g.uHeight, H);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LESS);
    gl.disable(gl.BLEND);
    gl.useProgram(this.prog);
    // column-major Rx(pitch) * Ry(yaw)
    gl.uniformMatrix3fv(this.u.uRot, false, [cy, sp * sy, -cp * sy, 0, cp, sp, sy, -sp * cy, cp * cy]);
    gl.uniform4f(this.u.uStage, scale, scale, (f.cx / W) * 2 - 1, 1 - (f.cy / H) * 2);
    gl.uniform4f(this.u.uShape, f.form, f.form * f.form, ballR, imgR);
    gl.uniform4f(this.u.uCam, FOV_TAN, W / H, camDist, dot);
    gl.uniform4f(this.u.uAudio, f.bass, f.mid, f.high, f.time);
    gl.uniform4fv(this.u.uKicks, this.kicks);
    gl.uniform1fv(this.u.uBands, f.bands);
    gl.uniform1f(this.u.uPresence, f.presence);
    gl.uniform1f(this.u.uEmergence, f.emergence);
    let bandMean = 0;
    for (let i = 0; i < f.bands.length; i++) bandMean += f.bands[i];
    gl.uniform1f(this.u.uBandMean, bandMean / f.bands.length);
    gl.uniform3f(this.u.uInk, INK_RED[0], INK_RED[1], INK_RED[2]);
    gl.uniform1f(this.u.uDim, f.dim);
    gl.bindVertexArray(this.vao);
    gl.drawArrays(gl.POINTS, 0, this.active);
    gl.bindVertexArray(null);
  }

  dispose(): void {
    const gl = this.gl;
    gl.deleteBuffer(this.ballBuf);
    gl.deleteBuffer(this.targetBuf);
    gl.deleteBuffer(this.colorBuf);
    gl.deleteVertexArray(this.vao);
    gl.deleteProgram(this.prog);
    gl.deleteProgram(this.glow);
  }
}
