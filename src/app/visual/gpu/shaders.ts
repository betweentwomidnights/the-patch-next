// WGSL for the WebGPU engine.
//
// The simulation is MLS-MPM (Hu et al. 2018) for a weakly compressible fluid:
// particles carry mass, velocity and an affine matrix C; each step scatters
// them to a grid (P2G), solves pressure and viscosity there, and gathers the
// result back (G2P). There is no neighbour search, which is why it scales to
// a few hundred thousand particles in real time. The grid is accumulated with
// atomic fixed-point adds because WGSL has no float atomics.
//
// Rendering is screen-space: particles are drawn as sphere impostors into a
// depth target, the depth is smoothed with a bilateral filter so the blobs
// merge into one surface, and a final pass shades that surface like ink on
// paper (flat tones, hatching in the shadows, a white highlight).

const common = /* wgsl */ `
const FP: f32 = 262144.0;

struct Sim {
  center: vec3f, gridN: f32,
  pointerO: vec3f, wallR: f32,
  pointerD: vec3f, pointerF: f32,
  swirlAxis: vec3f, swirl: f32,
  count: u32, dt: f32, time: f32, gravity: f32,
  pull: f32, kick: f32, kickSeed: f32, turb: f32,
  stiffness: f32, restDensity: f32, viscosity: f32, springK: f32,
  damping: f32, imgR: f32, gravR: f32, form: f32,
  // snare twist (signed), hat, how hard the spectrum pushes, the bands' average
  fx: vec4f,
  // sixteen spectrum bands, low to high
  bands: array<vec4f, 4>,
}

struct Particle {
  pos: vec3f, seed: f32,
  vel: vec3f, pad: f32,
  C: mat3x3f,
}

struct Target { pos: vec3f, color: u32 }

fn weights(diff: vec3f) -> array<vec3f, 3> {
  return array<vec3f, 3>(
    0.5 * (0.5 - diff) * (0.5 - diff),
    0.75 - diff * diff,
    0.5 * (0.5 + diff) * (0.5 + diff),
  );
}
`;

export const p2g1 = /* wgsl */ `${common}
struct Cell { vx: atomic<i32>, vy: atomic<i32>, vz: atomic<i32>, mass: atomic<i32> }

@group(0) @binding(0) var<uniform> sim: Sim;
@group(0) @binding(1) var<storage, read> particles: array<Particle>;
@group(0) @binding(2) var<storage, read_write> cells: array<Cell>;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  if (gid.x >= sim.count) { return; }
  let p = particles[gid.x];
  let n = i32(sim.gridN);
  let base = vec3i(floor(p.pos));
  let diff = p.pos - (vec3f(base) + 0.5);
  var w = weights(diff);

  for (var gx = 0; gx < 3; gx++) {
    for (var gy = 0; gy < 3; gy++) {
      for (var gz = 0; gz < 3; gz++) {
        let c = base + vec3i(gx - 1, gy - 1, gz - 1);
        if (any(c < vec3i(0)) || any(c >= vec3i(n))) { continue; }
        let weight = w[gx].x * w[gy].y * w[gz].z;
        let dist = (vec3f(c) + 0.5) - p.pos;
        let mv = weight * (p.vel + p.C * dist);
        let idx = u32(c.x + n * (c.y + n * c.z));
        atomicAdd(&cells[idx].mass, i32(weight * FP));
        atomicAdd(&cells[idx].vx, i32(mv.x * FP));
        atomicAdd(&cells[idx].vy, i32(mv.y * FP));
        atomicAdd(&cells[idx].vz, i32(mv.z * FP));
      }
    }
  }
}
`;

export const p2g2 = /* wgsl */ `${common}
struct Cell { vx: atomic<i32>, vy: atomic<i32>, vz: atomic<i32>, mass: atomic<i32> }

@group(0) @binding(0) var<uniform> sim: Sim;
@group(0) @binding(1) var<storage, read> particles: array<Particle>;
@group(0) @binding(2) var<storage, read_write> cells: array<Cell>;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  if (gid.x >= sim.count) { return; }
  let p = particles[gid.x];
  let n = i32(sim.gridN);
  let base = vec3i(floor(p.pos));
  let diff = p.pos - (vec3f(base) + 0.5);
  var w = weights(diff);

  var density = 0.0;
  for (var gx = 0; gx < 3; gx++) {
    for (var gy = 0; gy < 3; gy++) {
      for (var gz = 0; gz < 3; gz++) {
        let c = base + vec3i(gx - 1, gy - 1, gz - 1);
        if (any(c < vec3i(0)) || any(c >= vec3i(n))) { continue; }
        let weight = w[gx].x * w[gy].y * w[gz].z;
        let idx = u32(c.x + n * (c.y + n * c.z));
        density += weight * f32(atomicLoad(&cells[idx].mass)) / FP;
      }
    }
  }

  // Tait equation of state. The ratio is capped so a crowd of particles
  // (a formed image is far denser than the fluid at rest) pushes apart
  // firmly instead of exploding.
  let volume = 1.0 / max(density, 0.001);
  let ratio = min(density / sim.restDensity, 1.7);
  let pressure = max(-0.1, sim.stiffness * (pow(ratio, 5.0) - 1.0));
  var stress = mat3x3f(-pressure, 0.0, 0.0, 0.0, -pressure, 0.0, 0.0, 0.0, -pressure);
  stress += sim.viscosity * (p.C + transpose(p.C));
  let term = (-volume * 4.0 * sim.dt) * stress;

  for (var gx = 0; gx < 3; gx++) {
    for (var gy = 0; gy < 3; gy++) {
      for (var gz = 0; gz < 3; gz++) {
        let c = base + vec3i(gx - 1, gy - 1, gz - 1);
        if (any(c < vec3i(0)) || any(c >= vec3i(n))) { continue; }
        let weight = w[gx].x * w[gy].y * w[gz].z;
        let dist = (vec3f(c) + 0.5) - p.pos;
        let mom = (term * dist) * weight;
        let idx = u32(c.x + n * (c.y + n * c.z));
        atomicAdd(&cells[idx].vx, i32(mom.x * FP));
        atomicAdd(&cells[idx].vy, i32(mom.y * FP));
        atomicAdd(&cells[idx].vz, i32(mom.z * FP));
      }
    }
  }
}
`;

// Momentum -> velocity, then the container. Velocities are written back into
// the same integer buffer as float bits, for G2P to read.
export const gridUpdate = /* wgsl */ `${common}
struct Cell { vx: i32, vy: i32, vz: i32, mass: i32 }

@group(0) @binding(0) var<uniform> sim: Sim;
@group(0) @binding(1) var<storage, read_write> cells: array<Cell>;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let n = u32(sim.gridN);
  let idx = gid.x;
  if (idx >= n * n * n) { return; }
  let c = cells[idx];
  if (c.mass <= 0) {
    cells[idx].vx = 0; cells[idx].vy = 0; cells[idx].vz = 0;
    return;
  }
  var v = vec3f(f32(c.vx), f32(c.vy), f32(c.vz)) / f32(c.mass);

  let x = idx % n;
  let y = (idx / n) % n;
  let z = idx / (n * n);
  if (x < 2u || x > n - 3u) { v.x = 0.0; }
  if (y < 2u || y > n - 3u) { v.y = 0.0; }
  if (z < 2u || z > n - 3u) { v.z = 0.0; }

  // An invisible spherical bowl: nothing leaves through the wall.
  let d = vec3f(f32(x), f32(y), f32(z)) + 0.5 - sim.center;
  let r = length(d);
  if (r > sim.wallR) {
    let nrm = d / r;
    let vn = dot(v, nrm);
    if (vn > 0.0) { v -= nrm * vn; }
  }

  cells[idx].vx = bitcast<i32>(v.x);
  cells[idx].vy = bitcast<i32>(v.y);
  cells[idx].vz = bitcast<i32>(v.z);
}
`;

export const g2p = /* wgsl */ `${common}
struct Cell { vx: i32, vy: i32, vz: i32, mass: i32 }

@group(0) @binding(0) var<uniform> sim: Sim;
@group(0) @binding(1) var<storage, read_write> particles: array<Particle>;
@group(0) @binding(2) var<storage, read> cells: array<Cell>;
@group(0) @binding(3) var<storage, read> targets: array<Target>;

fn hash(x: f32) -> f32 { return fract(sin(x * 127.1) * 43758.5453); }

// the spectrum at u (0 = lowest band, 1 = highest), smoothly between bands
fn bandAt(u: f32) -> f32 {
  let x = clamp(u, 0.0, 1.0) * 15.0;
  let i = u32(floor(x));
  let j = min(i + 1u, 15u);
  return mix(sim.bands[i / 4u][i % 4u], sim.bands[j / 4u][j % 4u], x - floor(x));
}

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  if (gid.x >= sim.count) { return; }
  var p = particles[gid.x];
  let n = i32(sim.gridN);
  let base = vec3i(floor(p.pos));
  let diff = p.pos - (vec3f(base) + 0.5);
  var w = weights(diff);

  var v = vec3f(0.0);
  var b0 = vec3f(0.0);
  var b1 = vec3f(0.0);
  var b2 = vec3f(0.0);
  for (var gx = 0; gx < 3; gx++) {
    for (var gy = 0; gy < 3; gy++) {
      for (var gz = 0; gz < 3; gz++) {
        let c = base + vec3i(gx - 1, gy - 1, gz - 1);
        if (any(c < vec3i(0)) || any(c >= vec3i(n))) { continue; }
        let weight = w[gx].x * w[gy].y * w[gz].z;
        let idx = u32(c.x + n * (c.y + n * c.z));
        let cell = cells[idx];
        let cv = vec3f(bitcast<f32>(cell.vx), bitcast<f32>(cell.vy), bitcast<f32>(cell.vz));
        let dist = (vec3f(c) + 0.5) - p.pos;
        let wv = weight * cv;
        v += wv;
        b0 += wv * dist.x;
        b1 += wv * dist.y;
        b2 += wv * dist.z;
      }
    }
  }
  p.C = mat3x3f(b0 * 4.0, b1 * 4.0, b2 * 4.0);

  // ---- forces ----
  let rel = p.pos - sim.center;
  let r = max(length(rel), 0.0001);
  let nrm = rel / r;
  var a = vec3f(0.0);

  // gravity toward the middle holds the ink together as a ball
  // (and pulls harder the further a splash strays, so it always comes home)
  let reach = min(r / sim.gravR, 1.0) + max(r - sim.gravR * 2.0, 0.0) * 0.14;
  a -= nrm * sim.gravity * reach * (1.0 - sim.pull);

  // Springs pull each particle to its place in the image. The grid can only
  // move ink a cell at a time, far too coarse to draw with, so as the pull
  // takes over each particle keeps its own velocity instead of the fluid's.
  // Let go (a kick drops the pull) and it is liquid again.
  v = mix(v, p.vel, sim.pull);
  // The picture is a spectrum too, in rings: lows at the centre, highs at
  // the rim. Each ring swells and lifts off the page with its band.
  let tpos = targets[gid.x].pos;
  let ring = (bandAt(length(tpos.xy)) - sim.fx.w) * sim.fx.z;
  let tgt = sim.center + vec3f(tpos.xy * (1.0 + ring * 0.09), tpos.z + max(ring, 0.0) * 0.16) * sim.imgR;
  a += sim.pull * (sim.springK * (tgt - p.pos) - sim.damping * v);

  // a kick throws the ink outward in uneven jets; when an image is formed
  // it also comes off the page toward (and away from) the viewer
  let j1 = sin(dot(nrm, vec3f(3.1, 2.3, 4.7)) * 1.9 + sim.kickSeed * 6.283);
  let j2 = sin(dot(nrm, vec3f(-2.1, 4.3, 1.7)) * 2.3 + sim.kickSeed * 3.7);
  let jet = 0.3 + 1.5 * pow(0.5 + 0.5 * j1 * j2, 2.0);
  let side = sign(p.seed - 0.5) * (0.35 + hash(p.seed * 91.7));
  let flatDir = normalize(vec3f(nrm.xy * 0.75, side));
  let kdir = normalize(mix(nrm, flatDir, sim.form));
  a += kdir * sim.kick * jet * (0.6 + 0.8 * hash(p.seed * 17.3));

  // The ball is a spectrum: going around it, each direction listens to its
  // own band (mirrored, so it reads as lobes rather than a lopsided lump) and
  // swells or sinks with it. Calm at the poles, and only the outer shell
  // moves; the core just holds everything together.
  let lon = atan2(nrm.z, nrm.x) / 6.2832 + 0.5;
  let around = abs(fract(lon * 2.0) * 2.0 - 1.0);
  let shell = smoothstep(sim.gravR * 0.6, sim.gravR * 1.5, r);
  let lobe = (bandAt(around) - sim.fx.w) * (1.0 - nrm.y * nrm.y);
  a += nrm * lobe * sim.fx.z * shell * (1.0 - sim.pull);

  // a snare wrings it: a quick twist that the fluid then has to shake off
  a += cross(vec3f(0.0, 1.0, 0.0), rel) / max(r, 2.0) * sim.fx.x * shell * (1.0 - sim.pull);

  // mids stir it: ease toward turning as one body around a wandering axis.
  // (A plain sideways push would spin it up forever and flatten it to a disc.)
  a += (cross(sim.swirlAxis, rel) * sim.swirl - v) * 0.06 * (1.0 - sim.pull);

  // highs make the surface nervous
  let t = sim.time;
  // (hats land on the skin only, as a fizz)
  a += (sim.turb + sim.fx.y * shell) * (1.0 - sim.pull) * vec3f(
    sin(p.pos.y * 0.9 + t * 1.3 + p.seed * 6.0),
    sin(p.pos.z * 0.8 + t * 1.7 + p.seed * 4.0),
    sin(p.pos.x * 0.85 + t * 1.1 + p.seed * 5.0),
  );

  // the pointer pushes ink out of its way
  if (sim.pointerF > 0.0) {
    let op = p.pos - sim.pointerO;
    let perp = op - sim.pointerD * dot(op, sim.pointerD);
    let pd = length(perp);
    let pr = sim.wallR * 0.22;
    if (pd < pr) {
      let f = 1.0 - pd / pr;
      a += (perp / max(pd, 0.001)) * sim.pointerF * f * f;
    }
  }

  var vel = v + a * sim.dt;
  let speed = length(vel);
  if (speed > 4.0) { vel *= 4.0 / speed; }
  var pos = p.pos + vel * sim.dt;

  let rp = pos - sim.center;
  let rl = length(rp);
  let lim = sim.wallR - 1.0;
  if (rl > lim) {
    let nn = rp / rl;
    pos = sim.center + nn * lim;
    let vn = dot(vel, nn);
    if (vn > 0.0) { vel -= nn * vn * 1.4; }
  }
  pos = clamp(pos, vec3f(1.5), vec3f(sim.gridN - 1.5));

  // if anything ever goes non-finite, drop the particle back at its target
  if (!(dot(vel, vel) < 1000.0) || !(dot(pos, pos) < 1.0e9)) {
    pos = clamp(tgt, vec3f(2.0), vec3f(sim.gridN - 2.0));
    vel = vec3f(0.0);
    p.C = mat3x3f(vec3f(0.0), vec3f(0.0), vec3f(0.0));
  }

  p.pos = pos;
  p.vel = vel;
  particles[gid.x] = p;
}
`;

const viewStruct = /* wgsl */ `
struct View {
  rot: mat3x3f,
  center: vec3f, radius: f32,
  stage: vec4f,
  res: vec2f, tanHalf: f32, aspect: f32,
  camDist: f32, near: f32, far: f32, form: f32,
  time: f32, glow: f32, level: f32, kick: f32,
  stageC: vec2f, stageR: f32, dim: f32,
  ink: vec3f, lineW: f32,
  // emergence, hat, snare, brightness
  fx: vec4f,
}
const FAR_HALF: f32 = 5000.0;
`;

export const particleDraw = /* wgsl */ `${viewStruct}
struct Particle {
  pos: vec3f, seed: f32,
  vel: vec3f, pad: f32,
  C: mat3x3f,
}
struct Target { pos: vec3f, color: u32 }

@group(0) @binding(0) var<uniform> view: View;
@group(0) @binding(1) var<storage, read> particles: array<Particle>;
@group(0) @binding(2) var<storage, read> targets: array<Target>;

struct VSOut {
  @builtin(position) pos: vec4f,
  @location(0) uv: vec2f,
  @location(1) @interpolate(flat) color: vec4f,
  @location(2) @interpolate(flat) zr: vec2f,
}

@vertex
fn vs(@builtin(vertex_index) vi: u32, @builtin(instance_index) ii: u32) -> VSOut {
  var corners = array<vec2f, 6>(
    vec2f(-1.0, -1.0), vec2f(1.0, -1.0), vec2f(-1.0, 1.0),
    vec2f(-1.0, 1.0), vec2f(1.0, -1.0), vec2f(1.0, 1.0),
  );
  let p = particles[ii];
  let c = corners[vi];
  // Render the first second as a staggered emergence from the centre.
  // Leave the fluid simulation at its normal density throughout.
  let rel = p.pos - view.center;
  let delay = p.seed * 0.22 + min(length(rel) / (view.camDist * 0.22), 1.0) * 0.12;
  let opening = smoothstep(delay, 1.0, view.fx.x);
  let radius = view.radius * (0.82 + 0.36 * p.seed) * sqrt(opening);
  let center = view.rot * (rel * opening) + vec3f(0.0, 0.0, -view.camDist);
  let vp = center + vec3f(c * radius, 0.0);
  let z = -vp.z;
  var ndc = vec2f(vp.x / (z * view.tanHalf * view.aspect), vp.y / (z * view.tanHalf));
  ndc = ndc * view.stage.xy + view.stage.zw;

  let tc = targets[ii].color;
  let tcol = vec3f(f32(tc & 0xffu), f32((tc >> 8u) & 0xffu), f32((tc >> 16u) & 0xffu)) / 255.0;
  let energy = smoothstep(2.4, 4.0, length(p.vel));

  var out: VSOut;
  out.pos = vec4f(ndc, clamp((z - view.near) / (view.far - view.near), 0.0, 1.0), 1.0);
  out.uv = c;
  out.color = vec4f(mix(view.ink, tcol, view.form), energy);
  out.zr = vec2f(z, radius);
  return out;
}

struct FSOut {
  @location(0) albedo: vec4f,
  @location(1) depth: vec4f,
}

@fragment
fn fs(in: VSOut) -> FSOut {
  let r2 = dot(in.uv, in.uv);
  if (r2 > 1.0) { discard; }
  var out: FSOut;
  out.albedo = in.color;
  out.depth = vec4f(in.zr.x - sqrt(1.0 - r2) * in.zr.y, 0.0, 0.0, 1.0);
  return out;
}
`;

const fullscreenVs = /* wgsl */ `
@vertex
fn vs(@builtin(vertex_index) vi: u32) -> @builtin(position) vec4f {
  var tri = array<vec2f, 3>(vec2f(-1.0, -1.0), vec2f(3.0, -1.0), vec2f(-1.0, 3.0));
  return vec4f(tri[vi], 0.0, 1.0);
}
`;

// One direction of a separable bilateral blur over the depth target.
export const depthBlur = /* wgsl */ `
struct Blur { dir: vec2f, taps: f32, stride: f32, sigmaDepth: f32, pad0: f32, pad1: f32, pad2: f32 }
const FAR_HALF: f32 = 5000.0;

@group(0) @binding(0) var<uniform> blur: Blur;
@group(0) @binding(1) var src: texture_2d<f32>;
${fullscreenVs}
@fragment
fn fs(@builtin(position) fc: vec4f) -> @location(0) vec4f {
  let p = vec2i(fc.xy);
  let d0 = textureLoad(src, p, 0).r;
  if (d0 > FAR_HALF) { return vec4f(d0, 0.0, 0.0, 1.0); }
  let size = vec2i(textureDimensions(src));
  let taps = i32(blur.taps);
  let sigma = max(blur.taps * 0.5, 0.5);
  var sum = 0.0;
  var wsum = 0.0;
  for (var i = -taps; i <= taps; i++) {
    let q = clamp(p + vec2i(blur.dir * f32(i) * blur.stride), vec2i(0), size - vec2i(1));
    let d = textureLoad(src, q, 0).r;
    let fi = f32(i);
    let ws = exp(-fi * fi / (2.0 * sigma * sigma));
    let dd = (d - d0) / blur.sigmaDepth;
    let wd = exp(-dd * dd);
    sum += d * ws * wd;
    wsum += ws * wd;
  }
  return vec4f(sum / max(wsum, 0.0001), 0.0, 0.0, 1.0);
}
`;

// Shade the smoothed surface like ink on paper.
export const composite = /* wgsl */ `${viewStruct}
@group(0) @binding(0) var<uniform> view: View;
@group(0) @binding(1) var depthTex: texture_2d<f32>;
@group(0) @binding(2) var albedoTex: texture_2d<f32>;
${fullscreenVs}
fn viewPosAt(p: vec2f, d: f32) -> vec3f {
  let uv = p / view.res;
  var ndc = vec2f(uv.x * 2.0 - 1.0, 1.0 - uv.y * 2.0);
  ndc = (ndc - view.stage.zw) / view.stage.xy;
  return vec3f(ndc.x * view.tanHalf * view.aspect * d, ndc.y * view.tanHalf * d, -d);
}

fn depthAt(p: vec2i) -> f32 {
  let size = vec2i(textureDimensions(depthTex));
  return textureLoad(depthTex, clamp(p, vec2i(0), size - vec2i(1)), 0).r;
}

fn stripes(v: f32, period: f32, width: f32) -> f32 {
  let f = abs(fract(v / period) - 0.5) * 2.0;
  return smoothstep(width, width + 0.25, f);
}

@fragment
fn fs(@builtin(position) fc: vec4f) -> @location(0) vec4f {
  let p = vec2i(fc.xy);
  let d = depthAt(p);

  // a soft red glow behind the ink, breathing with the music
  let rr = length(fc.xy - view.stageC) / max(view.stageR, 1.0);
  let halo = exp(-max(rr - 0.45, 0.0) * 2.4) * view.glow;
  let bg = vec4f(view.ink * halo * 0.42, halo * 0.3);

  // hand-drawn lines "boil": they are redrawn a few times a second
  let boil = floor(view.time * 8.0);
  let wob = vec2f(sin(fc.y * 0.043 + boil * 1.7), cos(fc.x * 0.051 + boil * 2.3));

  let lw = max(view.lineW, 1.0);
  if (d > FAR_HALF) {
    return bg * view.dim;
  }

  let alb = textureLoad(albedoTex, p, 0);
  let P = viewPosAt(fc.xy, d);

  // normal from depth, taking the smoother side at edges
  let dxp = depthAt(p + vec2i(2, 0));
  let dxm = depthAt(p - vec2i(2, 0));
  let dyp = depthAt(p + vec2i(0, 2));
  let dym = depthAt(p - vec2i(0, 2));
  var ddx = viewPosAt(fc.xy + vec2f(2.0, 0.0), dxp) - P;
  if (abs(dxm - d) < abs(dxp - d)) { ddx = P - viewPosAt(fc.xy - vec2f(2.0, 0.0), dxm); }
  var ddy = viewPosAt(fc.xy + vec2f(0.0, 2.0), dyp) - P;
  if (abs(dym - d) < abs(dyp - d)) { ddy = P - viewPosAt(fc.xy - vec2f(0.0, 2.0), dym); }
  var n = normalize(cross(ddx, ddy));
  if (!(dot(n, n) > 0.5)) { n = vec3f(0.0, 0.0, 1.0); }
  if (n.z < 0.0) { n = -n; }

  // creases (ink in front of ink) and the silhouette
  var crease = 0.0;
  var bgCount = 0.0;
  let o = vec2i(round(wob * 1.3));
  let stp = i32(lw);
  var dirs = array<vec2i, 4>(vec2i(1, 0), vec2i(-1, 0), vec2i(0, 1), vec2i(0, -1));
  for (var i = 0; i < 4; i++) {
    let dn = depthAt(p + dirs[i] * stp + o);
    if (dn > FAR_HALF) { bgCount += 1.0; } else { crease = max(crease, dn - d); }
  }
  let creaseLine = smoothstep(view.radius * 1.6, view.radius * 3.2, crease);

  let L = normalize(vec3f(-0.48, 0.62, 0.62));
  let H = normalize(L + vec3f(0.0, 0.0, 1.0));
  let ndl = dot(n, L);
  let spec = pow(max(dot(n, H), 0.0), 48.0);
  let fres = pow(1.0 - max(n.z, 0.0), 2.2);

  let hc = fc.xy + wob * 1.6;
  let h1 = stripes(hc.x + hc.y, 7.0 * lw, 0.34);
  let h2 = stripes(hc.x - hc.y, 8.0 * lw, 0.3);

  let lit = smoothstep(-0.03, 0.03, ndl - 0.08 + wob.x * 0.015);
  let deep = 1.0 - smoothstep(-0.04, 0.04, ndl + 0.42);

  var col = alb.rgb;
  let shadow = alb.rgb * mix(0.2, 0.56, h1);
  col = mix(shadow, col, lit);
  col = mix(col, alb.rgb * 0.1, deep * (1.0 - h2) * 0.85);
  // a second, lighter tone near the light
  col = mix(col, mix(alb.rgb, vec3f(1.0, 0.36, 0.3), 0.5), smoothstep(0.0, 0.04, ndl - 0.8));
  // rim light so the dark side still reads against black
  col += view.ink * fres * (1.0 - lit) * 0.42;
  // hard white highlight
  // (hats open it up a little, so the highlights flicker with the top end)
  col = mix(col, vec3f(1.0, 0.96, 0.93), smoothstep(0.42, 0.5, spec + wob.y * 0.03 + view.fx.y * 0.16));
  // fast ink goes pale, like spray
  col = mix(col, vec3f(1.0, 0.82, 0.78), alb.a * alb.a * 0.6 * (1.0 - view.form));
  col = mix(col, vec3f(0.03, 0.0, 0.0), creaseLine * 0.92);

  // formed into an image, the picture's own colours win over the shading
  let flatCol = alb.rgb * (0.86 + 0.14 * lit);
  col = mix(col, flatCol, view.form * 0.9);

  let cover = 1.0 - bgCount * 0.16;
  let outc = vec4f(col * cover, cover) + bg * (1.0 - cover);
  return outc * view.dim;
}
`;
