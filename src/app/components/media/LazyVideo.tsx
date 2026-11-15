'use client';

import { useEffect, useRef, useState } from 'react';
import { getRadio } from '../../radio/radio';
import { cn } from '../../lib/utils';

interface LazyVideoProps {
  src: string;
  poster?: string;
  label: string;
  className?: string;
  /** `loop`: a silent loop that plays while on screen. `player`: has controls and sound. */
  mode?: 'loop' | 'player';
}

/**
 * A video that costs nothing until it's near the screen. Loops play only
 * while visible; players pause the radio when they start making sound.
 */
export default function LazyVideo({ src, poster, label, className, mode = 'loop' }: LazyVideoProps) {
  const ref = useRef<HTMLVideoElement>(null);
  const visible = useRef(false);
  const [near, setNear] = useState(false);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const io = new IntersectionObserver(
      ([entry]) => {
        visible.current = entry.isIntersecting;
        if (entry.isIntersecting) setNear(true);
        if (mode !== 'loop') {
          if (!entry.isIntersecting && !video.paused) video.pause();
          return;
        }
        if (entry.isIntersecting && !still) video.play().catch(() => undefined);
        else video.pause();
      },
      { rootMargin: '200px 0px', threshold: 0.15 },
    );
    io.observe(video);
    return () => io.disconnect();
  }, [mode]);

  return (
    <video
      ref={ref}
      className={cn('block w-full', className)}
      src={near ? src : undefined}
      poster={poster}
      aria-label={label}
      playsInline
      preload={mode === 'loop' ? 'metadata' : 'none'}
      muted={mode === 'loop'}
      loop={mode === 'loop'}
      controls={mode === 'player'}
      onLoadedData={(e) => {
        // The first intersection can happen before React attaches src.
        // Retry once the first frame is ready, provided the loop is still visible.
        if (mode === 'loop' && visible.current && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
          e.currentTarget.play().catch(() => undefined);
        }
      }}
      onPlay={(e) => {
        if (!e.currentTarget.muted) getRadio().pause();
      }}
    />
  );
}
