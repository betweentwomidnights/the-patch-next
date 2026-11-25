// Drives whichever engine the browser can run: picks it, feeds it the stage
// placement and the music every frame, and decides what shape the ink takes.

import { createGpuEngine } from './gpu/engine';
import { createGlEngine } from './gl/engine';
import { features, hitLog, pictureDelay, tickFeatures } from './features';
import { Moods } from './moods';
import { pickPlacement, setStageStatus, type Anchor } from './stage';
import { sampleImage, SHAPE_SOURCES } from './targets';
import type { Engine, FrameInput, Shape, TargetSet } from './types';

type ImageShape = Exclude<Shape, 'ball'>;

/** Pixels the fluid passes may shade per frame; the canvas is scaled to fit. */
const PIXEL_BUDGET = 2_300_000;

/**
 * The quality ladder, best first. On phones the cost is mostly pixels (every
 * frame shades the whole canvas, several times over on WebGPU), so the first
 * rungs draw at a lower resolution, which only makes soft ink a little softer.
 * Then fewer particles, then half the frame rate. Below the last rung the ink
 * switches off and the pages show their plain images: a struggling phone also
 * starves the radio's audio, and the music matters more than the picture.
 */
const LEVELS = [
  { scale: 1, particles: 1, fps: 60 },
  { scale: 0.8, particles: 1, fps: 60 },
  { scale: 0.65, particles: 0.8, fps: 60 },
  { scale: 0.5, particles: 0.6, fps: 60 },
  { scale: 0.5, particles: 0.45, fps: 30 },
  { scale: 0.4, particles: 0.35, fps: 30 },
] as const;

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
  // quality ladder (see LEVELS)
  private level = 0;
  /** The best rung this device may climb back to; raised whenever a rung proves too slow. */
  private bestAllowed = 0;
  private slowFor = 0;
  private fastFor = 0;
  private forcedLevel = false;
  private debugEl: HTMLDivElement | null = null;
  private slowMs = 0;
  private sinceDebug = 0;
  private idleKick = 0;
  private idleSeed = 0;
  private sinceIdleKick = 0;
  private lastKickCount = 0;
  private moods = new Moods();
  private pointerX = -1e5;
  private pointerY = -1e5;
  private pointerSeen = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
  }

  async start(): Promise<boolean> {
    // `?engine=gl` forces the fallback, for testing it on a WebGPU machine.
    const params = new URLSearchParams(window.location.search);
    const forceGl = params.get('engine') === 'gl';
    // `?mood=loose` (or steady) keeps a picture in one mood, to look at it.
    const mood = params.get('mood');
    if (process.env.NODE_ENV !== 'production' && (mood === 'steady' || mood === 'loose')) this.moods.pin = mood;
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

    if (process.env.NODE_ENV !== 'production') this.slowMs = Number(params.get('inkslow')) || 0;
    this.pickStartLevel(params);
    if (params.has('inkdebug')) this.showDebug();

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
    this.debugEl?.remove();
    this.debugEl = null;
    setStageStatus({ engine: 'none', formedAt: null });
  }

  /**
   * Where on the ladder to begin. Phones start a few rungs down (a fast one
   * climbs back up within seconds); phones that only have the older WebGL
   * path, or report little memory, start lower still. `?inkq=N` pins a rung,
   * for testing on a real device.
   */
  private pickStartLevel(params: URLSearchParams): void {
    const last = LEVELS.length - 1;
    const forced = Number(params.get('inkq'));
    if (params.has('inkq') && Number.isInteger(forced) && forced >= 0 && forced <= last) {
      this.forcedLevel = true;
      this.setLevel(forced);
      return;
    }
    const small = window.matchMedia('(pointer: coarse)').matches || Math.min(window.innerWidth, window.innerHeight) < 600;
    let start = 0;
    if (small) start = this.engine?.kind === 'webgl2' ? 3 : 2;
    const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
    if (memory !== undefined && memory <= 2) start = Math.max(start, 3);
    this.setLevel(start);
  }

  private setLevel(level: number): void {
    this.level = level;
    this.slowDt = 1 / LEVELS[level].fps;
    this.slowFor = 0;
    this.fastFor = 0;
    this.engine?.setActive(this.engine.particleCount * LEVELS[level].particles);
  }

  /** Below the last rung: switch the ink off for this visit and let the pages show their images. */
  private giveUp(): void {
    console.info('[visual] too slow on this device; switching the ink off');
    this.stop();
    this.canvas.width = 1;
    this.canvas.height = 1;
  }

  /** `?inkdebug`: a small readout of what the ink is doing, for testing on phones. */
  private showDebug(): void {
    const el = document.createElement('div');
    el.setAttribute('aria-hidden', 'true');
    el.style.cssText =
      'position:fixed;right:8px;top:72px;z-index:9999;pointer-events:none;white-space:pre;' +
      'font:11px/1.35 ui-monospace,monospace;color:#f90000;background:rgba(0,0,0,.8);padding:6px 8px;border:1px solid #f90000';
    document.body.appendChild(el);
    this.debugEl = el;
  }

  private onPointer = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse') return;
    this.pointerX = e.clientX;
    this.pointerY = e.clientY;
    this.pointerSeen = performance.now();
  };

  private onVisibility = () => {
    if (document.hidden) return;
    this.last = performance.now();
    // time spent in the background says nothing about speed
    this.slowFor = 0;
    this.fastFor = 0;
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

  /**
   * Walk the quality ladder. Frames running long for a couple of seconds:
   * down a rung, and that rung's better neighbour is never tried again this
   * visit. Comfortably fast for a while: back up a rung, if allowed.
   */
  private adapt(dt: number): void {
    if (!this.engine || document.hidden || this.forcedLevel) return;
    this.slowDt += (dt - this.slowDt) * 0.05;
    const target = 1 / LEVELS[this.level].fps;
    if (this.slowDt > target * 1.25) {
      this.slowFor += dt;
      this.fastFor = 0;
    } else if (this.slowDt < target * 1.07) {
      this.fastFor += dt;
      this.slowFor = 0;
    } else {
      this.slowFor = 0;
      this.fastFor = 0;
    }
    if (this.slowFor > 2) {
      this.bestAllowed = this.level + 1;
      if (this.level + 1 >= LEVELS.length) {
        this.giveUp();
        return;
      }
      this.setLevel(this.level + 1);
    } else if (this.fastFor > 8 && this.level > this.bestAllowed) {
      this.setLevel(this.level - 1);
    }
  }

  private updateDebug(dt: number, W: number, H: number): void {
    if (!this.debugEl || !this.engine) return;
    this.sinceDebug += dt;
    if (this.sinceDebug < 0.5) return;
    this.sinceDebug = 0;
    const l = LEVELS[this.level];
    this.debugEl.textContent = [
      `ink ${this.engine.kind}${this.forcedLevel ? ' (pinned)' : ''}`,
      `level ${this.level}/${LEVELS.length - 1}  best allowed ${this.bestAllowed}`,
      `canvas ${W}x${H}  scale ${l.scale}  dpr ${window.devicePixelRatio || 1}`,
      `particles ${Math.round(this.engine.particleCount * l.particles)}/${this.engine.particleCount}`,
      `fps ${Math.round(1 / this.avgDt)} (target ${l.fps})`,
    ].join('\n');
  }

  private loop = (now: number) => {
    if (!this.running || !this.engine) return;
    this.raf = requestAnimationFrame(this.loop);
    // half-rate rungs simply skip every other display frame
    const cap = LEVELS[this.level].fps;
    if (cap < 60 && now - this.last < 1000 / cap - 4) return;
    const dt = Math.min(0.05, Math.max(0.001, (now - this.last) / 1000));
    this.last = now;
    this.time += dt;
    this.frameNo++;

    // ---- canvas size ----
    // Measure the canvas itself, not the window. On phones the window's height
    // changes as the browser's toolbars slide in and out, while the canvas
    // (sized to the largest viewport, see VisualLayer) doesn't. Mapping anchors
    // through the window's height put the ink in the wrong place, worst at the
    // bottom of the screen, right where the radio dock is.
    const box = this.canvas.getBoundingClientRect();
    const cw = Math.max(1, box.width);
    const ch = Math.max(1, box.height);
    const dpr =
      Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(PIXEL_BUDGET / Math.max(1, cw * ch))) * LEVELS[this.level].scale;
    const W = Math.max(2, Math.round(cw * dpr));
    const H = Math.max(2, Math.round(ch * dpr));
    if (this.canvas.width !== W || this.canvas.height !== H) {
      this.canvas.width = W;
      this.canvas.height = H;
    }
    this.engine.resize(W, H);

    tickFeatures(dt, now);
    // dev only: `?inkslow=N` stalls each frame N ms, to watch the ladder step down
    if (process.env.NODE_ENV !== 'production' && this.slowMs > 0) {
      const until = performance.now() + this.slowMs;
      while (performance.now() < until);
    }
    this.avgDt += (dt - this.avgDt) * 0.05;
    this.adapt(dt);
    if (!this.engine) return; // adapt may have switched the ink off
    this.updateDebug(dt, W, H);

    // ---- where ----
    // visibility is judged against what's on screen; drawing is relative to the canvas
    const placement = pickPlacement(window.innerWidth, window.innerHeight);
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
      const tx = (placement.cx - box.left) * dpr;
      const ty = (placement.cy - box.top) * dpr;
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
    let landed = 0;
    if (features.kickCount !== this.lastKickCount) {
      this.lastKickCount = features.kickCount;
      this.sinceIdleKick = 0;
      landed = features.kick;
    }

    // A picture with the screen to itself has moods. What drives them is how
    // much is going on: loudness, plus every snare and hat, so it isn't only
    // the kick that moves it.
    const busy = Math.max(0, (features.level - 0.2) / 0.5) + 0.3 * features.snare + 0.15 * features.hat;
    this.moods.step({
      dt,
      on: features.active && this.formedFor > 1 && Boolean(this.anchor?.free),
      energy: Math.min(1, busy) * features.presence,
      kick: landed,
    });
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
    const px = (this.pointerX - box.left) * dpr;
    const py = (this.pointerY - box.top) * dpr;
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
      stir: this.moods.stir,
      grip: this.moods.grip,
      glow: 0.3 + features.level * 1.1 + kick * 0.5,
      dim: this.fade,
      pointerX: px,
      pointerY: py,
      pointerActive,
    };
    this.engine.render(frame);

    if (process.env.NODE_ENV !== 'production') {
      (window as unknown as Record<string, unknown>).__features = features;
      (window as unknown as Record<string, unknown>).__sync = { pictureDelay: pictureDelay(), hits: hitLog };
      (window as unknown as Record<string, unknown>).__ink = {
        fps: Math.round(1 / this.avgDt),
        particles: this.engine.particleCount,
        level: this.level,
        form: +this.form.toFixed(2),
        mood: this.moods.mood,
        emergence: +this.emergence.toFixed(2),
        canvas: [W, H],
      };
    }
  };
}
