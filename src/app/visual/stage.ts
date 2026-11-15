// The stage: where on the page the ink should be, and what it should be.
//
// Pages don't talk to the engine. They put a <StageAnchor> somewhere, and the
// visual layer moves the ink to the most important anchor that's on screen.
// When none is, it falls back to the lowest-priority one, which is the little
// porthole in the radio dock. That's what makes the site feel like one place:
// the same ink follows you from the landing logo to the dock to the radio.

import type { Shape } from './types';

export interface Anchor {
  el: HTMLElement;
  shape: Shape;
  /** Higher wins when several anchors are on screen. */
  priority: number;
  /** How much of the element's smaller side the object's stage fills. */
  fill: number;
}

const anchors = new Set<Anchor>();

export function addAnchor(anchor: Anchor): () => void {
  anchors.add(anchor);
  return () => {
    anchors.delete(anchor);
  };
}

export interface Placement {
  anchor: Anchor;
  /** CSS pixels, relative to the viewport. */
  cx: number;
  cy: number;
  radius: number;
}

export function pickPlacement(vw: number, vh: number): Placement | null {
  let best: Placement | null = null;
  let fallback: Placement | null = null;
  anchors.forEach((anchor) => {
    const r = anchor.el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return;
    const placement: Placement = {
      anchor,
      cx: r.left + r.width / 2,
      cy: r.top + r.height / 2,
      radius: (Math.min(r.width, r.height) / 2) * anchor.fill,
    };
    if (!fallback || anchor.priority < fallback.anchor.priority) fallback = placement;
    const visW = Math.min(r.right, vw) - Math.max(r.left, 0);
    const visH = Math.min(r.bottom, vh) - Math.max(r.top, 0);
    const visible = visW > 0 && visH > 0 ? (visW * visH) / (r.width * r.height) : 0;
    if (visible < 0.4) return;
    if (!best || anchor.priority > best.anchor.priority) best = placement;
  });
  return best ?? fallback;
}

// ---- what the engine tells the page ----

export interface StageStatus {
  engine: 'pending' | 'none' | 'webgpu' | 'webgl2';
  /** The anchor element whose image the particles have finished forming. */
  formedAt: HTMLElement | null;
}

let status: StageStatus = { engine: 'pending', formedAt: null };
const listeners = new Set<() => void>();

export function getStageStatus(): StageStatus {
  return status;
}

export function setStageStatus(next: Partial<StageStatus>): void {
  const merged = { ...status, ...next };
  if (merged.engine === status.engine && merged.formedAt === status.formedAt) return;
  status = merged;
  listeners.forEach((l) => l());
}

export function subscribeStage(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
