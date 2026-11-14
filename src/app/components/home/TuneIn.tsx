'use client';

import Link from 'next/link';
import { Pause, Play } from 'lucide-react';
import { useRadio } from '../../radio/useRadio';
import { cn } from '../../lib/utils';

/** A play button for the radio that can live anywhere on a page. */
export function TuneInButton({ className, variant = 'line' }: { className?: string; variant?: 'line' | 'solid' }) {
  const radio = useRadio();
  return (
    <button type="button" onClick={radio.toggle} className={cn(variant === 'solid' ? 'btn' : 'btn-line', className)}>
      {radio.playing ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
      {radio.playing ? 'pause the radio' : 'tune in'}
    </button>
  );
}

/** "on air: <track>", linking to the radio. Renders nothing until we know. */
export function NowPlayingLine({ className }: { className?: string }) {
  const radio = useRadio({ watch: true });
  if (!radio.track) return null;
  return (
    <Link href="/radio" className={cn('group inline-flex max-w-full items-center gap-2', className)}>
      <span className={cn('h-2 w-2 shrink-0 rounded-full bg-patch', radio.status === 'playing' && 'animate-blink')} />
      <span className="label shrink-0">on air</span>
      <span className="truncate font-bold underline decoration-patch decoration-2 underline-offset-4 group-hover:text-patch">
        {radio.track.title}
      </span>
    </Link>
  );
}
