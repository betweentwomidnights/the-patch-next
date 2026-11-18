'use client';

import { useState } from 'react';
import type { MerchImage } from '../../lib/etsy';
import { cn } from '../../lib/utils';

// One listing's photos: the big one, and thumbnails to switch between them.
// Photos load straight from Etsy's image servers.
export default function MerchGallery({ images, large, priority }: { images: MerchImage[]; large: boolean; priority: boolean }) {
  const [index, setIndex] = useState(0);
  const current = images[index] ?? images[0];

  if (!current) {
    return <div className="screen grid aspect-square place-items-center text-sm text-ash">photo soon</div>;
  }

  return (
    <div>
      <div className="screen">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={current.full}
          src={current.src}
          srcSet={`${current.src} 570w, ${current.full} 2000w`}
          sizes={large ? '(min-width: 1024px) 560px, 100vw' : '(min-width: 640px) 50vw, 100vw'}
          alt={current.alt}
          loading={priority ? 'eager' : 'lazy'}
          className="aspect-square w-full object-cover"
        />
      </div>
      {images.length > 1 && (
        <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="photos">
          {images.map((im, i) => (
            <button
              key={im.full}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`show photo ${i + 1} of ${images.length}`}
              aria-pressed={i === index}
              className={cn(
                'sketch h-14 w-14 overflow-hidden transition-opacity',
                i === index ? 'sketch-red' : 'sketch-quiet opacity-60 hover:opacity-100',
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={im.thumb} alt="" loading="lazy" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
