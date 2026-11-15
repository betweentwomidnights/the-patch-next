'use client';

import Link from 'next/link';
import { useRadio } from '../../radio/useRadio';
import { cn } from '../../lib/utils';

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
