/// <reference types="@webgpu/types" />
// The WebGPU engine: an MLS-MPM fluid of "ink" particles and a screen-space
// renderer that shades it like a drawing. See ./shaders.ts for how it works.

import type { Engine, FrameInput, TargetSet } from '../types';
import { INK_RED } from '../types';
import * as wgsl from './shaders';

export interface GpuTier {
  particles: number;
  grid: number;
}

const REST_DENSITY = 7;
const SIM_BYTES = 208;
const VIEW_BYTES = 240;
const PARTICLE_FLOATS = 20;
const FOV_TAN = Math.tan((14 * Math.PI) / 180);
const FAR_DEPTH = 10000;

/**
 * How much ink this machine gets. Integrated graphics hold 60fps at about 70k
 * particles; phones get fewer, discrete GPUs more. The controller trims the
 * count further if frames still run long.
 */
function pickTier(adapter: GPUAdapter): GpuTier {
  const override = Number(new URLSearchParams(window.location.search).get('ink'));
  if (override >= 1000) {
    const particles = Math.min(override, 400_000);
    return { particles, grid: particles > 180_000 ? 80 : particles > 100_000 ? 72 : particles > 55_000 ? 56 : 48 };
  }
  const small = window.matchMedia('(pointer: coarse)').matches || Math.min(window.innerWidth, window.innerHeight) < 600;
  if (small) return { particles: 40_000, grid: 48 };
  const vendor = (adapter.info?.vendor ?? '').toLowerCase();
  if (vendor === 'nvidia' || vendor === 'apple') return { particles: 140_000, grid: 72 };
  return { particles: 72_000, grid: 56 };
}

export async function createGpuEngine(canvas: HTMLCanvasElement): Promise<Engine | null> {
  if (typeof navigator === 'undefined' || !navigator.gpu) return null;
  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) return null;
  const tier = pickTier(adapter);
  const device = await adapter.requestDevice();
  // Compatibility-mode devices may not allow storage buffers in vertex shaders.
  const vertexStorage = (device.limits as unknown as Record<string, number>).maxStorageBuffersInVertexStage;
  if (vertexStorage !== undefined && vertexStorage < 2) {
    device.destroy();
    return null;
  }
  const context = canvas.getContext('webgpu');
  if (!context) {
    device.destroy();
    return null;
  }
  return new GpuEngine(canvas, device, context, tier);
}

class GpuEngine implements Engine {
  readonly kind = 'webgpu' as const;
  readonly particleCount: number;
  private active: number;

  private device: GPUDevice;
  private context: GPUCanvasContext;
  private format: GPUTextureFormat;
  private gridN: number;
  private wallR: number;
  private ballR: number;
  private imgR: number;
  private imgArea = 1000;
  private disposed = false;

  private particleBuf: GPUBuffer;
  private targetBuf: GPUBuffer;
  private gridBuf: GPUBuffer;
  private simBuf: GPUBuffer;
  private viewBuf: GPUBuffer;
  private blurBufH: GPUBuffer;
  private blurBufV: GPUBuffer;
  private simData = new ArrayBuffer(SIM_BYTES);
  private simF = new Float32Array(this.simData);
  private simU = new Uint32Array(this.simData);
  private viewF = new Float32Array(VIEW_BYTES / 4);
  private blurF = new Float32Array(8);

  private p2g1: GPUComputePipeline;
  private p2g2: GPUComputePipeline;
  private gridUpdate: GPUComputePipeline;
  private g2p: GPUComputePipeline;
  private p2g1Bind: GPUBindGroup;
  private p2g2Bind: GPUBindGroup;
  private gridBind: GPUBindGroup;
  private g2pBind: GPUBindGroup;

  private drawPipeline: GPURenderPipeline;
  private drawBind: GPUBindGroup;
  private blurPipeline: GPURenderPipeline;
  private blurLayout: GPUBindGroupLayout;
  private compositePipeline: GPURenderPipeline;
  private compositeLayout: GPUBindGroupLayout;

  private width = 0;
  private height = 0;
  private albedoTex: GPUTexture | null = null;
  private depthA: GPUTexture | null = null;
  private depthB: GPUTexture | null = null;
  private zTex: GPUTexture | null = null;
  private blurAtoB_H: GPUBindGroup | null = null;
  private blurBtoA_V: GPUBindGroup | null = null;
  private compositeBind: GPUBindGroup | null = null;

  constructor(canvas: HTMLCanvasElement, device: GPUDevice, context: GPUCanvasContext, tier: GpuTier) {
    this.device = device;
    this.context = context;
    this.format = navigator.gpu.getPreferredCanvasFormat();
    context.configure({ device, format: this.format, alphaMode: 'premultiplied' });

    const N = tier.particles;
    this.particleCount = N;
    this.active = N;
    this.gridN = tier.grid;
    this.wallR = tier.grid / 2 - 3;
    this.ballR = Math.cbrt((3 * N) / (4 * Math.PI * REST_DENSITY));
    this.imgR = this.wallR * 0.8;

    // ---- buffers ----
    const init = new Float32Array(N * PARTICLE_FLOATS);
    const c = tier.grid / 2;
    for (let i = 0; i < N; i++) {
      // uniform in a ball, so the ink starts at rest
      let x = 0, y = 0, z = 0;
      do {
        x = Math.random() * 2 - 1;
        y = Math.random() * 2 - 1;
        z = Math.random() * 2 - 1;
      } while (x * x + y * y + z * z > 1);
      const o = i * PARTICLE_FLOATS;
      init[o] = c + x * this.ballR;
      init[o + 1] = c + y * this.ballR;
      init[o + 2] = c + z * this.ballR;
      init[o + 3] = Math.random();
    }
    this.particleBuf = device.createBuffer({
      size: init.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      mappedAtCreation: true,
    });
    new Float32Array(this.particleBuf.getMappedRange()).set(init);
    this.particleBuf.unmap();

    this.targetBuf = device.createBuffer({ size: N * 16, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
    this.gridBuf = device.createBuffer({
      size: tier.grid ** 3 * 16,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    const uniform = GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST;
    this.simBuf = device.createBuffer({ size: SIM_BYTES, usage: uniform });
    this.viewBuf = device.createBuffer({ size: VIEW_BYTES, usage: uniform });
    this.blurBufH = device.createBuffer({ size: 32, usage: uniform });
    this.blurBufV = device.createBuffer({ size: 32, usage: uniform });

    // ---- simulation pipelines ----
    const compute = (code: string, label: string) =>
      device.createComputePipeline({
        label,
        layout: 'auto',
        compute: { module: this.module(code, label), entryPoint: 'main' },
      });
    this.p2g1 = compute(wgsl.p2g1, 'p2g1');
    this.p2g2 = compute(wgsl.p2g2, 'p2g2');
    this.gridUpdate = compute(wgsl.gridUpdate, 'grid');
    this.g2p = compute(wgsl.g2p, 'g2p');

    const buf = (binding: number, buffer: GPUBuffer): GPUBindGroupEntry => ({ binding, resource: { buffer } });
    this.p2g1Bind = device.createBindGroup({
      layout: this.p2g1.getBindGroupLayout(0),
      entries: [buf(0, this.simBuf), buf(1, this.particleBuf), buf(2, this.gridBuf)],
    });
    this.p2g2Bind = device.createBindGroup({
      layout: this.p2g2.getBindGroupLayout(0),
      entries: [buf(0, this.simBuf), buf(1, this.particleBuf), buf(2, this.gridBuf)],
    });
    this.gridBind = device.createBindGroup({
      layout: this.gridUpdate.getBindGroupLayout(0),
      entries: [buf(0, this.simBuf), buf(1, this.gridBuf)],
    });
    this.g2pBind = device.createBindGroup({
      layout: this.g2p.getBindGroupLayout(0),
      entries: [buf(0, this.simBuf), buf(1, this.particleBuf), buf(2, this.gridBuf), buf(3, this.targetBuf)],
    });

    // ---- render pipelines ----
    const drawModule = this.module(wgsl.particleDraw, 'particles');
    this.drawPipeline = device.createRenderPipeline({
      label: 'particles',
      layout: 'auto',
      vertex: { module: drawModule, entryPoint: 'vs' },
      fragment: {
        module: drawModule,
        entryPoint: 'fs',
        targets: [{ format: 'rgba8unorm' }, { format: 'r32float' }] as GPUColorTargetState[],
      },
      primitive: { topology: 'triangle-list' },
      depthStencil: { format: 'depth24plus', depthWriteEnabled: true, depthCompare: 'less' },
    });
    this.drawBind = device.createBindGroup({
      layout: this.drawPipeline.getBindGroupLayout(0),
      entries: [buf(0, this.viewBuf), buf(1, this.particleBuf), buf(2, this.targetBuf)],
    });

    const tex: GPUTextureBindingLayout = { sampleType: 'unfilterable-float' };
    this.blurLayout = device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } },
        { binding: 1, visibility: GPUShaderStage.FRAGMENT, texture: tex },
      ] as GPUBindGroupLayoutEntry[],
    });
    const blurModule = this.module(wgsl.depthBlur, 'blur');
    this.blurPipeline = device.createRenderPipeline({
      label: 'blur',
      layout: device.createPipelineLayout({ bindGroupLayouts: [this.blurLayout] }),
      vertex: { module: blurModule, entryPoint: 'vs' },
      fragment: { module: blurModule, entryPoint: 'fs', targets: [{ format: 'r32float' }] as GPUColorTargetState[] },
    });

    this.compositeLayout = device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } },
        { binding: 1, visibility: GPUShaderStage.FRAGMENT, texture: tex },
        { binding: 2, visibility: GPUShaderStage.FRAGMENT, texture: tex },
      ] as GPUBindGroupLayoutEntry[],
    });
    const compModule = this.module(wgsl.composite, 'composite');
    this.compositePipeline = device.createRenderPipeline({
      label: 'composite',
      layout: device.createPipelineLayout({ bindGroupLayouts: [this.compositeLayout] }),
      vertex: { module: compModule, entryPoint: 'vs' },
      fragment: { module: compModule, entryPoint: 'fs', targets: [{ format: this.format }] },
    });

    // Until a real image arrives, every particle's target is the centre.
    device.queue.writeBuffer(this.targetBuf, 0, new Uint8Array(N * 16));
  }

  private module(code: string, label: string): GPUShaderModule {
    const shader = this.device.createShaderModule({ code, label });
    if (process.env.NODE_ENV !== 'production') {
      shader.getCompilationInfo().then((info) => {
        for (const m of info.messages) {
          if (m.type === 'error') console.error(`[visual] wgsl ${label}:${m.lineNum}:${m.linePos} ${m.message}`);
        }
      });
    }
    return shader;
  }

  /** Simulate and draw only the first `count` particles (for slow GPUs). */
  setActive(count: number): void {
    this.active = Math.max(1000, Math.min(this.particleCount, Math.floor(count)));
    this.ballR = Math.cbrt((3 * this.active) / (4 * Math.PI * REST_DENSITY));
  }

  setTargets(targets: TargetSet): void {
    if (this.disposed) return;
    const N = this.particleCount;
    const data = new ArrayBuffer(N * 16);
    const f = new Float32Array(data);
    const u = new Uint32Array(data);
    for (let i = 0; i < N; i++) {
      f[i * 4] = targets.positions[i * 3];
      f[i * 4 + 1] = targets.positions[i * 3 + 1];
      f[i * 4 + 2] = targets.positions[i * 3 + 2];
      u[i * 4 + 3] = targets.colors[i];
    }
    this.device.queue.writeBuffer(this.targetBuf, 0, data);
    // Average gap between neighbours in the image, in grid cells; sets how
    // big a particle is drawn when the image is formed.
    let covered = 0;
    const cells = 96;
    const seen = new Uint8Array(cells * cells);
    for (let i = 0; i < N; i += 3) {
      const x = Math.min(cells - 1, Math.max(0, Math.floor((targets.positions[i * 3] * 0.5 + 0.5) * cells)));
      const y = Math.min(cells - 1, Math.max(0, Math.floor((targets.positions[i * 3 + 1] * 0.5 + 0.5) * cells)));
      if (!seen[y * cells + x]) {
        seen[y * cells + x] = 1;
        covered++;
      }
    }
    const area = (covered / (cells * cells)) * (2 * this.imgR) ** 2;
    this.imgArea = Math.max(area, 1);
  }

  resize(width: number, height: number): void {
    if (this.disposed || (width === this.width && height === this.height)) return;
    this.width = width;
    this.height = height;
    for (const t of [this.albedoTex, this.depthA, this.depthB, this.zTex]) t?.destroy();
    const device = this.device;
    const size = { width, height };
    const usage = GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING;
    this.albedoTex = device.createTexture({ size, format: 'rgba8unorm', usage });
    this.depthA = device.createTexture({ size, format: 'r32float', usage });
    this.depthB = device.createTexture({ size, format: 'r32float', usage });
    this.zTex = device.createTexture({ size, format: 'depth24plus', usage: GPUTextureUsage.RENDER_ATTACHMENT });

    const blurBind = (uniform: GPUBuffer, src: GPUTexture) =>
      device.createBindGroup({
        layout: this.blurLayout,
        entries: [
          { binding: 0, resource: { buffer: uniform } },
          { binding: 1, resource: src.createView() },
        ],
      });
    this.blurAtoB_H = blurBind(this.blurBufH, this.depthA);
    this.blurBtoA_V = blurBind(this.blurBufV, this.depthB);
    this.compositeBind = device.createBindGroup({
      layout: this.compositeLayout,
      entries: [
        { binding: 0, resource: { buffer: this.viewBuf } },
        { binding: 1, resource: this.depthA.createView() },
        { binding: 2, resource: this.albedoTex.createView() },
      ],
    });
  }

  render(f: FrameInput): void {
    if (this.disposed || !this.albedoTex || !this.depthA || !this.depthB || !this.zTex) return;
    const device = this.device;
    const W = this.width;
    const H = this.height;
    const center = this.gridN / 2;
    const camDist = this.wallR * 4.6;

    // ---- camera ----
    const cy = Math.cos(f.yaw), sy = Math.sin(f.yaw);
    const cp = Math.cos(f.pitch), sp = Math.sin(f.pitch);
    // rot = Rx(pitch) * Ry(yaw), as rows
    const r00 = cy, r01 = 0, r02 = sy;
    const r10 = sp * sy, r11 = cp, r12 = -sp * cy;
    const r20 = -cp * sy, r21 = sp, r22 = cp * cy;

    const ref = (this.ballR * 1.4) * (1 - f.form) + this.imgR * f.form;
    const scale = ((f.radius * 2) / H) * ((camDist * FOV_TAN) / ref);
    const offX = (f.cx / W) * 2 - 1;
    const offY = 1 - (f.cy / H) * 2;
    const pxPerUnit = f.radius / ref;

    const ballRadius = 0.72;
    const imgRadius = Math.max(Math.sqrt(this.imgArea / this.active) * 1.15, 1.25 / pxPerUnit);
    const radius = ballRadius * (1 - f.form) + imgRadius * f.form;

    // ---- simulation uniforms ----
    const s = this.simF;
    s[0] = center; s[1] = center; s[2] = center; s[3] = this.gridN;
    let pointerF = 0;
    if (f.pointerActive) {
      const nx = (((f.pointerX / W) * 2 - 1) - offX) / scale;
      const ny = ((1 - (f.pointerY / H) * 2) - offY) / scale;
      let vx = nx * FOV_TAN * (W / H), vy = ny * FOV_TAN, vz = -1;
      const vl = Math.hypot(vx, vy, vz);
      vx /= vl; vy /= vl; vz /= vl;
      // view -> sim is the transpose of rot
      s[4] = center + r20 * camDist; s[5] = center + r21 * camDist; s[6] = center + r22 * camDist;
      s[8] = r00 * vx + r10 * vy + r20 * vz;
      s[9] = r01 * vx + r11 * vy + r21 * vz;
      s[10] = r02 * vx + r12 * vy + r22 * vz;
      pointerF = 1.6;
    }
    s[7] = this.wallR;
    s[11] = pointerF;
    const st = f.time * 0.11;
    s[12] = Math.sin(st) * 0.5; s[13] = 0.82; s[14] = Math.cos(st * 1.3) * 0.5;
    s[15] = 0.012 + f.mid * 0.09; // angular speed, radians per sim time unit
    this.simU[16] = this.active;
    s[17] = 0.2;
    s[18] = f.time;
    s[19] = 0.3 * (1 + f.bass * 0.4);
    s[20] = f.pull;
    s[21] = f.kick * (1.25 + 0.45 * f.form);
    s[22] = f.kickSeed;
    s[23] = 0.015 + f.high * 0.35;
    s[24] = 3.0 * (1 - f.pull) + 0.22 * f.pull;
    s[25] = REST_DENSITY;
    s[26] = 0.1;
    s[27] = 0.22;
    s[28] = 0.62;
    s[29] = this.imgR * (1 + f.bass * 0.05 + f.kick * 0.04);
    s[30] = this.ballR * 0.6;
    s[31] = f.form;
    let bandMean = 0;
    for (let i = 0; i < f.bands.length; i++) bandMean += f.bands[i];
    bandMean /= f.bands.length;
    s[32] = f.snare * 0.55 * f.presence;
    s[33] = f.hat * 0.5 * f.presence;
    s[34] = 1.15 * f.presence;
    s[35] = bandMean; // lobes push relative to this, so the ball changes shape, not size
    s.set(f.bands, 36);
    device.queue.writeBuffer(this.simBuf, 0, this.simData);

    // ---- view uniforms ----
    const v = this.viewF;
    v[0] = r00; v[1] = r10; v[2] = r20;
    v[4] = r01; v[5] = r11; v[6] = r21;
    v[8] = r02; v[9] = r12; v[10] = r22;
    v[12] = center; v[13] = center; v[14] = center; v[15] = radius;
    v[16] = scale; v[17] = scale; v[18] = offX; v[19] = offY;
    v[20] = W; v[21] = H; v[22] = FOV_TAN; v[23] = W / H;
    v[24] = camDist; v[25] = camDist - this.wallR * 1.8; v[26] = camDist + this.wallR * 1.8; v[27] = f.form;
    v[28] = f.time; v[29] = f.glow; v[30] = f.level; v[31] = f.kick;
    v[32] = f.cx; v[33] = f.cy; v[34] = f.radius; v[35] = f.dim;
    v[36] = INK_RED[0]; v[37] = INK_RED[1]; v[38] = INK_RED[2];
    v[39] = Math.max(1, Math.min(2.5, f.radius / 220));
    // the spectrum ring only belongs on a big stage, and only with music on
    v[40] = f.presence * Math.min(1, Math.max(0, (f.radius - 110) / 90));
    v[41] = f.hat * f.presence;
    v[42] = Math.abs(f.snare) * f.presence;
    v.set(f.bands, 44);
    device.queue.writeBuffer(this.viewBuf, 0, v);

    const blurPx = radius * pxPerUnit * (2.4 * (1 - f.form) + 0.5 * f.form);
    const taps = Math.max(1, Math.min(9, Math.ceil(blurPx)));
    const stride = Math.max(1, blurPx / taps);
    const b = this.blurF;
    b[0] = 1; b[1] = 0; b[2] = taps; b[3] = stride; b[4] = radius * 2.6;
    device.queue.writeBuffer(this.blurBufH, 0, b);
    b[0] = 0; b[1] = 1;
    device.queue.writeBuffer(this.blurBufV, 0, b);

    const encoder = device.createCommandEncoder();

    // ---- simulate ----
    // Two steps a frame at 60Hz, one at 120Hz. Never more than two: chasing a
    // slow frame with extra steps only makes the next one slower.
    const steps = Math.max(1, Math.min(2, Math.round(f.dt * 120)));
    const pGroups = Math.ceil(this.active / 64);
    const gGroups = Math.ceil(this.gridN ** 3 / 64);
    for (let i = 0; i < steps; i++) {
      encoder.clearBuffer(this.gridBuf);
      const pass = encoder.beginComputePass();
      pass.setPipeline(this.p2g1);
      pass.setBindGroup(0, this.p2g1Bind);
      pass.dispatchWorkgroups(pGroups);
      pass.setPipeline(this.p2g2);
      pass.setBindGroup(0, this.p2g2Bind);
      pass.dispatchWorkgroups(pGroups);
      pass.setPipeline(this.gridUpdate);
      pass.setBindGroup(0, this.gridBind);
      pass.dispatchWorkgroups(gGroups);
      pass.setPipeline(this.g2p);
      pass.setBindGroup(0, this.g2pBind);
      pass.dispatchWorkgroups(pGroups);
      pass.end();
    }

    // ---- draw particles ----
    {
      const pass = encoder.beginRenderPass({
        colorAttachments: [
          { view: this.albedoTex.createView(), loadOp: 'clear', storeOp: 'store', clearValue: { r: 0, g: 0, b: 0, a: 0 } },
          { view: this.depthA.createView(), loadOp: 'clear', storeOp: 'store', clearValue: { r: FAR_DEPTH, g: 0, b: 0, a: 1 } },
        ] as GPURenderPassColorAttachment[],
        depthStencilAttachment: {
          view: this.zTex.createView(),
          depthLoadOp: 'clear',
          depthStoreOp: 'discard',
          depthClearValue: 1,
        },
      });
      pass.setPipeline(this.drawPipeline);
      pass.setBindGroup(0, this.drawBind);
      pass.draw(6, this.active);
      pass.end();
    }

    // ---- smooth the depth into one surface ----
    const blur = (target: GPUTexture, bind: GPUBindGroup) => {
      const pass = encoder.beginRenderPass({
        colorAttachments: [
          { view: target.createView(), loadOp: 'clear', storeOp: 'store', clearValue: { r: FAR_DEPTH, g: 0, b: 0, a: 1 } },
        ] as GPURenderPassColorAttachment[],
      });
      pass.setPipeline(this.blurPipeline);
      pass.setBindGroup(0, bind);
      pass.draw(3);
      pass.end();
    };
    const rounds = f.form > 0.85 ? 1 : 2;
    for (let i = 0; i < rounds; i++) {
      blur(this.depthB, this.blurAtoB_H!);
      blur(this.depthA, this.blurBtoA_V!);
    }

    // ---- ink ----
    {
      const pass = encoder.beginRenderPass({
        colorAttachments: [
          { view: this.context.getCurrentTexture().createView(), loadOp: 'clear', storeOp: 'store', clearValue: { r: 0, g: 0, b: 0, a: 0 } },
        ] as GPURenderPassColorAttachment[],
      });
      pass.setPipeline(this.compositePipeline);
      pass.setBindGroup(0, this.compositeBind!);
      pass.draw(3);
      pass.end();
    }

    device.queue.submit([encoder.finish()]);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const t of [this.albedoTex, this.depthA, this.depthB, this.zTex]) t?.destroy();
    for (const b of [this.particleBuf, this.targetBuf, this.gridBuf, this.simBuf, this.viewBuf, this.blurBufH, this.blurBufV]) b.destroy();
    this.device.destroy();
  }
}
