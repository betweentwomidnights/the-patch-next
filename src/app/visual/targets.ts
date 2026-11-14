// Turn an image into places for particles to stand.
import type { Shape, TargetSet } from './types';

interface ShapeSource {
  src: string;
  /** `alpha`: transparent pixels are empty. `luma`: dark pixels are empty too. */
  key: 'alpha' | 'luma';
}

export const SHAPE_SOURCES: Record<Exclude<Shape, 'ball'>, ShapeSource> = {
  patch: { src: '/brand/collabage-patch-logo-512.png', key: 'alpha' },
  gary: { src: '/gary4live_logo.png', key: 'luma' },
};

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${src}`));
    img.src = src;
  });
}

/**
 * Sample `count` points from the solid parts of an image. Points come from a
 * jittered lattice rather than pure chance, so they cover the picture evenly
 * and it reads as solid instead of speckled.
 */
export async function sampleImage(source: ShapeSource, count: number): Promise<TargetSet> {
  const img = await loadImage(source.src);
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('no 2d context');
  ctx.drawImage(img, 0, 0, size, size);
  const px = ctx.getImageData(0, 0, size, size).data;

  const solid = (x: number, y: number): boolean => {
    const i = (y * size + x) * 4;
    if (px[i + 3] < 110) return false;
    if (source.key === 'luma') return Math.max(px[i], px[i + 1], px[i + 2]) > 46;
    return true;
  };

  let area = 0;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (solid(x, y)) area++;
  if (area === 0) throw new Error(`${source.src} has no solid pixels`);

  const positions = new Float32Array(count * 3);
  const colors = new Uint32Array(count);
  const step = Math.sqrt(area / count);
  let n = 0;

  const put = (fx: number, fy: number): boolean => {
    const x = Math.min(size - 1, Math.max(0, Math.floor(fx)));
    const y = Math.min(size - 1, Math.max(0, Math.floor(fy)));
    if (!solid(x, y)) return false;
    const i = (y * size + x) * 4;
    positions[n * 3] = (fx / size) * 2 - 1;
    positions[n * 3 + 1] = 1 - (fy / size) * 2;
    positions[n * 3 + 2] = (Math.random() - 0.5) * 0.035;
    colors[n] = (px[i] | (px[i + 1] << 8) | (px[i + 2] << 16) | (255 << 24)) >>> 0;
    n++;
    return true;
  };

  for (let gy = 0; gy * step < size && n < count; gy++) {
    for (let gx = 0; gx * step < size && n < count; gx++) {
      put((gx + Math.random()) * step, (gy + Math.random()) * step);
    }
  }
  // top up whatever the lattice missed
  let guard = count * 40;
  while (n < count && guard-- > 0) put(Math.random() * size, Math.random() * size);

  // Shuffle, so which particle goes where has nothing to do with where it is
  // now: forming an image stirs the whole ball.
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    for (let k = 0; k < 3; k++) {
      const t = positions[i * 3 + k];
      positions[i * 3 + k] = positions[j * 3 + k];
      positions[j * 3 + k] = t;
    }
    const c = colors[i];
    colors[i] = colors[j];
    colors[j] = c;
  }
  return { positions, colors };
}
