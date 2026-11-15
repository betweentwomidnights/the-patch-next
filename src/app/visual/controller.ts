// Drives whichever engine the browser can run: picks it, feeds it the stage
// placement and the music every frame, and decides what shape the ink takes.

import { createGpuEngine } from './gpu/engine';
import { createGlEngine } from './gl/engine';
import { features, tickFeatures } from './features';
import { pickPlacement, setStageStatus, type Anchor } from './stage';
import { sampleImage, SHAPE_SOURCES } from './targets';
import type { Engine, FrameInput, Shape, TargetSet } from './types';

type ImageShape = Exclude<Shape, 'ball'>;

/** Pixels the fluid passes may shade per frame; the canvas is scaled to fit. */
const PIXEL_BUDGET = 2_300_000;

export class VisualController {
  private canvas: HTMLCanvasElement;
  private engine: Engine | null = null;
  private raf = 0;
  private running = false;
  private last = 0;
  private time = 0;
  private frameNo = 0;

  // placement, smoothed, in canvas pixels
  private cx = 0;
  private cy = 0;
  private radius = 0;
  private placed = false;
  private anchor: Anchor | null = null;
  private sinceSwitch = 10;

  // shape
  private form = 0;
  private loaded: ImageShape | null = null;
  private pending: ImageShape | null = null;
  private targets: Partial<Record<ImageShape, TargetSet>> = {};
  private formedFor = 0;

  private fade = 0;
  private emergence = 0;
  private avgDt = 1 / 60;
  private twistSign = 1;
  private lastSnare = 0;
  private slowDt = 1 / 60;
  private sinceAdapt = 0;
  private quality = 1;
  private idleKick = 0;
  private idleSeed = 0;
  private sinceIdleKick = 0;
  private lastKickCount = 0;
  private pointerX = -1e5;
  private pointerY = -1e5;
  private pointerSeen = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
  }

  async start(): Promise<boolean> {
    // `?engine=gl` forces the fallback, for testing it on a WebGPU machine.
    const forceGl = new URLSearchParams(window.location.search).get('engine') === 'gl';
    if (!forceGl) {
      try {
        this.engine = await createGpuEngine(this.canvas);
      } catch (err) {
        console.warn('[visual] webgpu unavailable:', err);
        this.engine = null;
      }
    }
    if (!this.engine) this.engine = createGlEngine(this.canvas);
    if (!this.engine) return false;

    setStageStatus({ engine: this.engine.kind });
    window.addEventListener('pointermove', this.onPointer, { passive: true });
    document.addEventListener('visibilitychange', this.onVisibility);
    this.running = true;
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.loop);
    return true;
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.raf);
    window.removeEventListener('pointermove', this.onPointer);
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.engine?.dispose();
    this.engine = null;
    setStageStatus({ engine: 'none', formedAt: null });
  }

  private onPointer = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse') return;
    this.pointerX = e.clientX;
    this.pointerY = e.clientY;
    this.pointerSeen = performance.now();
  };

  private onVisibility = () => {
    if (!document.hidden) this.last = performance.now();
  };

  private async ensureTargets(shape: ImageShape): Promise<void> {
    if (this.targets[shape] || this.pending === shape || !this.engine) return;
    this.pending = shape;
    try {
      this.targets[shape] = await sampleImage(SHAPE_SOURCES[shape], this.engine.particleCount);
    } catch (err) {
      console.warn('[visual]', err);
    } finally {
      if (this.pending === shape) this.pending = null;
    }
  }

  /** If frames keep running long, give this machine less ink to push around. */
  private adapt(dt: number): void {
    if (!this.engine || document.hidden) return;
    this.slowDt += (dt - this.slowDt) * 0.04;
    this.sinceAdapt += dt;
    if (this.sinceAdapt < 2.5) return;
    this.sinceAdapt = 0;
    if (this.slowDt > 1 / 45 && this.quality > 0.45) {
      this.quality = Math.max(0.45, this.quality * 0.8);
      this.engine.setActive(this.engine.particleCount * this.quality);
    }
  }

  private loop = (now: number) => {
    if (!this.running || !this.engine) return;
    this.raf = requestAnimationFrame(this.loop);
    const dt = Math.min(0.05, Math.max(0.001, (now - this.last) / 1000));
    this.last = now;
    this.time += dt;
    this.frameNo++;

    // ---- canvas size ----
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(PIXEL_BUDGET / Math.max(1, vw * vh)));
    const W = Math.max(2, Math.round(vw * dpr));
    const H = Math.max(2, Math.round(vh * dpr));
    if (this.canvas.width !== W || this.canvas.height !== H) {
      this.canvas.width = W;
      this.canvas.height = H;
    }
    this.engine.resize(W, H);

    tickFeatures(dt);
    this.adapt(dt);

    // ---- where ----
    const placement = pickPlacement(vw, vh);
    if (!placement) {
      this.fade = Math.max(0, this.fade - dt * 3);
      if (this.fade <= 0) return;
    } else {
      this.fade = 1;
      this.emergence = Math.min(1, this.emergence + dt / 1.1);
      if (placement.anchor !== this.anchor) {
        this.anchor = placement.anchor;
        this.sinceSwitch = 0;
      }
      this.sinceSwitch += dt;
      const tx = placement.cx * dpr;
      const ty = placement.cy * dpr;
      const tr = placement.radius * dpr;
      if (!this.placed) {
        this.cx = tx; this.cy = ty; this.radius = tr;
        this.placed = true;
      } else {
        // glide to a new anchor, then stick to it exactly (so scrolling tracks)
        const tau = Math.max(0, 0.2 * (1 - this.sinceSwitch / 1.4));
        const k = tau > 0.001 ? 1 - Math.exp(-dt / tau) : 1;
        this.cx += (tx - this.cx) * k;
        this.cy += (ty - this.cy) * k;
        this.radius += (tr - this.radius) * k;
      }
    }

    // ---- what ----
    const want: Shape = this.anchor?.shape ?? 'ball';
    let formTarget = 0;
    if (want !== 'ball') {
      void this.ensureTargets(want);
      if (this.loaded === want) formTarget = 1;
      else if (this.form < 0.12 && this.targets[want]) {
        this.engine.setTargets(this.targets[want]!);
        this.loaded = want;
      }
    }
    const rate = formTarget > this.form ? 2.4 : 4.5;
    this.form += (formTarget - this.form) * (1 - Math.exp(-dt * rate));
    if (this.form < 0.001) this.form = 0;

    this.formedFor = this.form > 0.93 && this.sinceSwitch > 1.2 ? this.formedFor + dt : 0;
    setStageStatus({ formedAt: this.formedFor > 0.5 && this.anchor ? this.anchor.el : null });

    // ---- music, or a little life of its own ----
    let kick = features.kick;
    let seed = features.kickSeed;
    if (features.kickCount !== this.lastKickCount) {
      this.lastKickCount = features.kickCount;
      this.sinceIdleKick = 0;
    }
    if (!features.active) {
      // nothing playing: a formed logo twitches now and then so you can
      // tell it's made of something
      this.sinceIdleKick += dt;
      if (this.form > 0.9 && this.sinceIdleKick > 6.5) {
        this.sinceIdleKick = 0;
        this.idleKick = 0.5;
        this.idleSeed = Math.random();
      }
      this.idleKick *= Math.exp(-dt * 7);
      if (this.idleKick > kick) {
        kick = this.idleKick;
        seed = this.idleSeed;
      }
    }

    // each snare twists the ink the other way, so it wrings rather than spins up
    if (features.snare > this.lastSnare + 0.15) this.twistSign = -this.twistSign;
    this.lastSnare = features.snare;

    const pointerFresh = performance.now() - this.pointerSeen < 2500;
    const px = this.pointerX * dpr;
    const py = this.pointerY * dpr;
    const pointerActive = pointerFresh && Math.hypot(px - this.cx, py - this.cy) < this.radius * 1.5;

    // docked and silent: half rate is plenty
    const docked = this.radius < 70 * dpr;
    if (docked && !features.active && this.sinceSwitch > 2 && this.frameNo % 2 === 1) return;

    const frame: FrameInput = {
      time: this.time,
      dt: docked && !features.active ? dt * 2 : dt,
      cx: this.cx,
      cy: this.cy,
      radius: this.radius,
      emergence: this.emergence,
      form: this.form,
      pull: this.form * this.form * (1 - Math.min(0.8, kick * 0.95)),
      // Keep the view fixed while particles flow into place or react to
      // the pointer. Scaling a running spin by form made each morph turn.
      yaw: 0,
      pitch: 0,
      kick,
      kickSeed: seed,
      bass: features.bass,
      mid: features.mid,
      high: features.high,
      level: features.level,
      bands: features.bands,
      snare: features.snare * this.twistSign,
      hat: features.hat,
      presence: features.presence,
      glow: 0.3 + features.level * 1.1 + kick * 0.5,
      dim: this.fade,
      pointerX: px,
      pointerY: py,
      pointerActive,
    };
    this.engine.render(frame);

    if (process.env.NODE_ENV !== 'production') {
      this.avgDt += (dt - this.avgDt) * 0.05;
      (window as unknown as Record<string, unknown>).__features = features;
      (window as unknown as Record<string, unknown>).__ink = {
        fps: Math.round(1 / this.avgDt),
        particles: this.engine.particleCount,
        form: +this.form.toFixed(2),
        emergence: +this.emergence.toFixed(2),
        canvas: [W, H],
      };
    }
  };
}
