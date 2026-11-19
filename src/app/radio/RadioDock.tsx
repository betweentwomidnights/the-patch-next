'use client';

import { usePathname } from 'next/navigation';
import { Pause, Play } from 'lucide-react';
import StageAnchor from '../visual/StageAnchor';
import { useRadio } from './useRadio';
import { cn } from '../lib/utils';

const spot = 'fixed left-3 z-20 h-14 w-14 sm:left-4 sm:h-16 sm:w-16';
const bottom = { bottom: 'max(0.85rem, env(safe-area-inset-bottom))' };

/**
 * The radio, always within reach. The round "porthole" is the play button and
 * the ink's home whenever a page has nowhere better for it. It sits in the
 * root layout, so it (and the music) survive every navigation. It's only the
 * button: a "now playing" card here kept covering page content, and what's on
 * lives on /radio. The radio page has its own, bigger controls, so the dock
 * steps aside there.
 */
export default function RadioDock() {
  // No `watch`: nothing here shows the track, so don't poll for it.
  const radio = useRadio();
  const pathname = usePathname();
  const onRadioPage = pathname === '/radio';
  const label = radio.playing ? 'pause the radio' : 'play the radio';

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
      <div className={cn('fixed left-3 z-40 sm:left-4', onRadioPage && 'hidden')} style={bottom}>
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

      </div>
    </>
  );
}
