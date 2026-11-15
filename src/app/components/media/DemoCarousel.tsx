'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import LazyVideo from './LazyVideo';
import { cn } from '../../lib/utils';

export interface Demo {
  src: string;
  poster?: string;
  title: string;
  note?: string;
}

/** One demo at a time, with the others a click away. */
export default function DemoCarousel({ demos, className, square = false }: { demos: Demo[]; className?: string; square?: boolean }) {
  const [index, setIndex] = useState(0);
  const demo = demos[index];
  const go = (step: number) => setIndex((i) => (i + step + demos.length) % demos.length);

  return (
    <figure className={className}>
      <div className="screen">
        <LazyVideo
          key={demo.src}
          src={demo.src}
          poster={demo.poster}
          label={demo.title}
          mode="player"
          className={cn('bg-black object-cover', square ? 'aspect-square' : 'aspect-video')}
        />
      </div>
      <figcaption className="mt-3 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-bold leading-snug">{demo.title}</p>
          {demo.note && <p className="text-sm text-ash">{demo.note}</p>}
        </div>
        {demos.length > 1 && (
          <div className="flex shrink-0 items-center gap-1.5">
            <button type="button" onClick={() => go(-1)} aria-label="previous demo" className="btn-line btn-sm !px-2">
              <ChevronLeft size={18} />
            </button>
            <span className="label w-10 text-center">
              {index + 1} / {demos.length}
            </span>
            <button type="button" onClick={() => go(1)} aria-label="next demo" className="btn-line btn-sm !px-2">
              <ChevronRight size={18} />
            </button>
          </div>
        )}
      </figcaption>
    </figure>
  );
}
