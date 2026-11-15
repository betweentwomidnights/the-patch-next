'use client';

import { useEffect, useRef, useSyncExternalStore } from 'react';
import { addAnchor, getStageStatus, subscribeStage, type Anchor } from './stage';
import type { Shape } from './types';
import { cn } from '../lib/utils';

interface StageAnchorProps {
  shape: Shape;
  /** Higher wins when several anchors are on screen. The dock uses 0. */
  priority?: number;
  /** Fraction of the box's smaller side the ink's stage fills. */
  fill?: number;
  className?: string;
  /** Show static content only if animation is unavailable, or until the image forms. */
  fallback?: 'unavailable' | 'until-formed';
  /**
   * What to show when the particles aren't here (no engine, reduced motion,
   * still loading, or scrolled away). By default it fades out once the ink
   * forms the picture. `fallback="unavailable"` keeps it hidden during boot
   * and animation, so the picture emerges entirely from particles.
   */
  children?: React.ReactNode;
}

/** Marks a spot on the page where the ink should go and what it should become. */
export default function StageAnchor({ shape, priority = 10, fill = 1, className, fallback = 'until-formed', children }: StageAnchorProps) {
  const ref = useRef<HTMLDivElement>(null);
  const anchorRef = useRef<Anchor | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    const anchor: Anchor = { el: ref.current, shape, priority, fill };
    anchorRef.current = anchor;
    return addAnchor(anchor);
    // shape/fill changes are applied below without re-registering
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [priority]);

  useEffect(() => {
    if (anchorRef.current) {
      anchorRef.current.shape = shape;
      anchorRef.current.fill = fill;
    }
  }, [shape, fill]);

  const formedHere = useSyncExternalStore(
    subscribeStage,
    () => getStageStatus().formedAt === ref.current && ref.current !== null,
    () => false,
  );

  const engine = useSyncExternalStore(
    subscribeStage,
    () => getStageStatus().engine,
    () => 'pending' as const,
  );
  const engineOn = engine === 'webgpu' || engine === 'webgl2';
  // A ball has no picture to match, so its fallback goes as soon as there's ink at all.
  const hideFallback = fallback === 'unavailable' ? engine !== 'none' : shape === 'ball' ? engineOn : formedHere;

  return (
    <div ref={ref} className={cn('relative', className)}>
      {children && (
        <div className={cn(
          'h-full w-full',
          fallback === 'unavailable'
            ? hideFallback && 'invisible motion-reduce:visible'
            : ['transition-opacity duration-500', hideFallback ? 'opacity-0' : 'opacity-100'],
        )}>
          {children}
        </div>
      )}
      {children && fallback === 'unavailable' && (
        <noscript><div className="absolute inset-0">{children}</div></noscript>
      )}
    </div>
  );
}
