'use client';

import { useEffect, useState } from 'react';
import { Info, Pause, Play, X } from 'lucide-react';
import StageAnchor from '../visual/StageAnchor';
import type { Shape } from '../visual/types';
import SocialMediaButtonGroup from '../components/SocialButtons';
import { useRadio } from './useRadio';
import { cn } from '../lib/utils';

type Scene = Exclude<Shape, 'patch'>;

const scenes: { id: Scene; label: string }[] = [
  { id: 'ball', label: 'ink' },
  { id: 'gary', label: 'gary' },
];

function clock(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const s = Math.floor(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

/**
 * The radio page. The ink gets nearly the whole screen; what's playing is one
 * slim bar along the bottom, with the story of the track behind the (i).
 */
export default function RadioRoom() {
  const radio = useRadio({ watch: true });
  const [scene, setScene] = useState<Scene>('ball');
  const [position, setPosition] = useState(0);
  const [showInfo, setShowInfo] = useState(false);

  const trackKey = radio.track?.key;
  useEffect(() => {
    const tick = () => setPosition(radio.position());
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
    // position() reads the station clock; only the track identity matters here
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackKey]);

  useEffect(() => {
    if (!showInfo) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setShowInfo(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showInfo]);

  const track = radio.track;
  const info = track?.info;
  const duration = track?.duration ?? 0;
  const links = info
    ? [
        info.youtubeLink && { href: info.youtubeLink, label: 'watch it get made' },
        info.youtubeChannel && { href: info.youtubeChannel, label: 'collaborator’s youtube channel' },
        info.youtubePlaylist && { href: info.youtubePlaylist, label: 'youtube playlist' },
        info.spotifyLink && { href: info.spotifyLink, label: 'spotify' },
        info.colabLink && { href: info.colabLink, label: 'colab notebook' },
        info.githubLink && { href: info.githubLink, label: 'github' },
      ].filter((l): l is { href: string; label: string } => Boolean(l))
    : [];
  const hasInfo = Boolean(info?.description) || links.length > 0;
  const state =
    radio.status === 'playing' ? 'on air' : radio.status === 'loading' ? 'tuning…' : radio.status === 'error' ? 'lost the signal' : 'off air';

  return (
    <main className="flex h-[100svh] flex-col overflow-hidden pt-[var(--header-h)]">
      {/* ---- the stage: everything that isn't the header or the bar ---- */}
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <StageAnchor
          shape={scene}
          priority={20}
          fill={0.9}
          free
          fallback="unavailable"
          className="absolute left-1/2 top-1/2 aspect-square h-[min(100%,112vw)] -translate-x-1/2 -translate-y-1/2"
        >
          {scene === 'gary' ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src="/gary4live_logo.png" alt="" className="h-full w-full p-[5%]" />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <div className="h-[70%] w-[70%] rounded-full bg-patch shadow-[0_0_70px_rgb(var(--patch)/0.3)]" />
            </div>
          )}
        </StageAnchor>

        <div role="group" aria-label="what the ink does" className="absolute inset-x-0 top-1 z-40 flex justify-center gap-1.5 sm:top-2">
          {scenes.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setScene(s.id)}
              aria-pressed={scene === s.id}
              className={cn('btn-line btn-sm bg-ink/60', scene === s.id ? 'sketch-red text-patch' : 'sketch-quiet text-ash')}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* ---- the bar ---- */}
      <div className="relative z-40 shrink-0 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 sm:px-5">
        {showInfo && hasInfo && (
          <div className="card sketch-quiet absolute bottom-full left-3 right-3 mb-2 max-h-[55svh] overflow-y-auto !bg-ink/95 sm:left-auto sm:right-5 sm:w-[26rem]">
            <button type="button" onClick={() => setShowInfo(false)} aria-label="close" className="absolute right-2 top-2 p-2 text-ash hover:text-paper">
              <X size={16} />
            </button>
            <p className="label text-patch">about this one</p>
            {info?.year && <p className="label mt-2 text-ash">{info.year}</p>}
            {info?.description && <p className="mt-2 text-sm text-paper/90">{info.description}</p>}
            {links.length > 0 && (
              <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-sm">
                {links.map((l) => (
                  <li key={l.href}>
                    <a href={l.href} target="_blank" rel="noopener noreferrer" className="link">
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="mx-auto flex max-w-page items-center gap-3">
          <button
            type="button"
            onClick={radio.toggle}
            aria-label={radio.playing ? 'pause the radio' : 'play the radio'}
            className={cn('sketch sketch-red grid h-11 w-11 shrink-0 place-items-center !rounded-full bg-ink/70', radio.playing && 'sketch-live')}
          >
            {radio.playing ? <Pause size={15} fill="currentColor" /> : <Play size={15} fill="currentColor" className="translate-x-px" />}
          </button>

          <div className="min-w-0 flex-1" aria-live="polite">
            <p className="label flex items-center gap-1.5">
              <span className={cn('h-1.5 w-1.5 rounded-full bg-patch', radio.status === 'playing' && 'animate-blink')} />
              {state}
              {radio.listeners > 1 && <span>· {radio.listeners} tuned in</span>}
              {duration > 0 && (
                <span className="ml-auto tabular-nums">
                  {clock(Math.min(position, duration))} / {clock(duration)}
                </span>
              )}
            </p>
            <h1 className="loud truncate text-[1.7rem] sm:text-3xl">{track?.title ?? 'the patch radio'}</h1>
            <div className="mt-1 h-0.5 overflow-hidden bg-paper/15">
              <div className="h-full bg-patch" style={{ width: duration > 0 ? `${Math.min(100, (position / duration) * 100)}%` : '0%' }} />
            </div>
          </div>

          {hasInfo && (
            <button
              type="button"
              onClick={() => setShowInfo((v) => !v)}
              aria-label="about this track"
              aria-expanded={showInfo}
              className={cn('grid h-11 w-11 shrink-0 place-items-center transition-colors hover:text-patch', showInfo ? 'text-patch' : 'text-paper/80')}
            >
              <Info size={20} />
            </button>
          )}
          <SocialMediaButtonGroup className="hidden shrink-0 md:flex" />
        </div>
        <SocialMediaButtonGroup className="-mb-1 mt-1 justify-center md:hidden" />
      </div>
    </main>
  );
}
