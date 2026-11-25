'use client';

import { useEffect, useRef } from 'react';
import { setStageStatus } from './stage';

/**
 * The ink: one canvas over the whole site that never unmounts, so it carries
 * across page navigations. It ignores the pointer (links under it still work)
 * and sits above page content but below the header and the radio dock.
 *
 * The engine is loaded after the page is interactive, and not at all for
 * people who ask for reduced motion; pages must look right without it.
 */
export default function VisualLayer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setStageStatus({ engine: 'pending', formedAt: null });
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setStageStatus({ engine: 'none' });
      return;
    }

    let cancelled = false;
    let stop: (() => void) | undefined;
    const boot = async () => {
      const { VisualController } = await import('./controller');
      if (cancelled) return;
      const controller = new VisualController(canvas);
      const ok = await controller.start();
      if (cancelled || !ok) {
        controller.stop();
        return;
      }
      stop = () => controller.stop();
    };
    const idle = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 200));
    const handle = idle(() => void boot());

    return () => {
      cancelled = true;
      (window.cancelIdleCallback ?? window.clearTimeout)(handle as number);
      stop?.();
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden="true" className="ink-canvas pointer-events-none fixed left-0 top-0 z-30 w-full" />;
}
