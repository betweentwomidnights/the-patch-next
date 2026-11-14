// Shared types for the visual layer (the ink particles behind the whole site).

/** What the particles are forming: a free ball of ink, or one of the logos. */
export type Shape = 'ball' | 'patch' | 'gary';

/** Where particles go when they form an image. Positions are in unit space, [-1, 1]. */
export interface TargetSet {
  positions: Float32Array; // xyz per particle
  colors: Uint32Array; // rgba8 per particle (little endian: r | g<<8 | b<<16 | a<<24)
}

/** Everything an engine needs to draw one frame. Lengths are canvas pixels. */
export interface FrameInput {
  time: number;
  dt: number;
  /** Stage centre and radius: where the object sits on screen. */
  cx: number;
  cy: number;
  radius: number;
  /** 0 = ball of ink, 1 = formed into the current image. */
  form: number;
  /** Spring strength toward the image this frame (dips on a kick so it bursts). */
  pull: number;
  yaw: number;
  pitch: number;
  kick: number;
  kickSeed: number;
  bass: number;
  mid: number;
  high: number;
  level: number;
  /** Sixteen spectrum bands, 0..1 each (see features.ts). */
  bands: Float32Array;
  /** Signed: each snare twists the opposite way to the last. */
  snare: number;
  hat: number;
  /** 0 in silence, 1 with music: scales everything the bands do. */
  presence: number;
  glow: number;
  /** Overall opacity, 0..1. */
  dim: number;
  pointerX: number;
  pointerY: number;
  pointerActive: boolean;
}

export interface Engine {
  readonly kind: 'webgpu' | 'webgl2';
  readonly particleCount: number;
  setTargets(targets: TargetSet): void;
  /** Use only the first `count` particles; engines may ignore it. */
  setActive(count: number): void;
  resize(width: number, height: number): void;
  render(frame: FrameInput): void;
  dispose(): void;
}

/** Brand colours as linear-ish 0..1 rgb, shared by both engines. */
export const INK_RED: [number, number, number] = [0.976, 0.0, 0.0];
