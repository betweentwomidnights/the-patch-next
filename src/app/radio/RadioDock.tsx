'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Pause, Play } from 'lucide-react';
import StageAnchor from '../visual/StageAnchor';
import { useRadio } from './useRadio';
import { cn } from '../lib/utils';

const spot = 'fixed left-3 z-20 h-14 w-14 sm:left-4 sm:h-16 sm:w-16';
const bottom = { bottom: 'max(0.85rem, env(safe-area-inset-bottom))' };

/**
 * The radio, always within reach. The round "porthole" is the play button and
 * the ink's home whenever a page has nowhere better for it; the pill next to
 * it says what's on. It sits in the root layout, so it (and the music)
 * survive every navigation. The radio page has its own, bigger controls, so
 * the dock steps aside there.
 */
export default function RadioDock() {
  const radio = useRadio({ watch: true });
  const pathname = usePathname();
  const onRadioPage = pathname === '/radio';
  // The landing page's copy and buttons sit right where the pill would pop
  // out (especially on phones), so there it's just the play button.
  const showPill = pathname !== '/';
  const label = radio.playing ? 'pause the radio' : 'play the radio';

  // The pill would sit on top of whatever you're reading, so it only shows
  // for a few seconds when there's news (first visit, tuning in, a new
  // track) and whenever the pointer or keyboard is on the dock.
  const [flash, setFlash] = useState(false);
  const trackKey = radio.track?.key;
  useEffect(() => {
    if (!trackKey) return;
    setFlash(true);
    const id = window.setTimeout(() => setFlash(false), 7000);
    return () => window.clearTimeout(id);
  }, [trackKey, radio.tunedIn]);
  const pill = cn(
    'sketch sketch-quiet flex-col bg-ink/90 px-3.5 py-2 text-left leading-tight backdrop-blur-md transition-all duration-300',
    flash
      ? 'translate-x-0 opacity-100'
      : 'pointer-events-none -translate-x-3 opacity-0 group-focus-within:pointer-events-auto group-focus-within:translate-x-0 group-focus-within:opacity-100 group-hover:pointer-events-auto group-hover:translate-x-0 group-hover:opacity-100',
  );

  return (
    <>
      {/* backing disc: below the ink canvas, so the ball shows on top of it */}
      <div className={cn(spot, 'rounded-full bg-ink shadow-[0_0_0_6px_rgb(var(--ink)/0.85)]', onRadioPage && 'hidden')} style={bottom}>
        <StageAnchor shape="ball" priority={0} fill={0.86} className="h-full w-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/collabage-patch-logo-512.png" alt="" className="h-full w-full p-1.5 opacity-90" />
        </StageAnchor>
      </div>

      {/* controls: above the canvas */}
      <div className={cn('group fixed left-3 z-40 flex items-center gap-2.5 sm:left-4', onRadioPage && 'hidden')} style={bottom}>
        <button
          type="button"
          onClick={radio.toggle}
          aria-label={label}
          title={label}
          className={cn(
            'sketch sketch-red grid h-14 w-14 shrink-0 place-items-center !rounded-full text-paper sm:h-16 sm:w-16',
            radio.playing && 'sketch-live',
          )}
        >
          <span className="grid h-7 w-7 place-items-center rounded-full bg-ink/70 backdrop-blur-[2px]">
            {radio.playing ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" className="translate-x-px" />}
          </span>
        </button>

        {showPill && (
        <Link href="/radio" aria-label="open the radio" className={cn(pill, 'flex max-w-[min(62vw,22rem)]')}>
          <span className="label flex items-center gap-1.5">
            <span className={cn('h-1.5 w-1.5 rounded-full bg-patch', radio.status === 'playing' && 'animate-blink')} />
            {radio.status === 'playing' ? 'on air' : radio.status === 'loading' ? 'tuning…' : radio.status === 'error' ? 'lost the signal' : radio.tunedIn ? 'paused' : 'the patch radio'}
          </span>
          <span className="truncate text-sm font-bold">{radio.track?.title ?? 'the patch radio'}</span>
        </Link>
        )}
      </div>
    </>
  );
}
