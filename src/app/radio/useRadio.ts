'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { getRadio, RADIO_OFF, type RadioSnapshot } from './radio';

const noop = () => () => undefined;

/** The radio's state plus its controls. Safe to call from any client component. */
export function useRadio(options: { watch?: boolean } = {}) {
  const browser = typeof window !== 'undefined';
  const snapshot: RadioSnapshot = useSyncExternalStore(
    browser ? getRadio().subscribe : noop,
    browser ? getRadio().getSnapshot : () => RADIO_OFF,
    () => RADIO_OFF,
  );

  // `watch` keeps "now playing" up to date even before anyone tunes in.
  useEffect(() => {
    if (!options.watch) return;
    return getRadio().watch();
  }, [options.watch]);

  return {
    ...snapshot,
    playing: snapshot.status === 'playing' || snapshot.status === 'loading',
    play: () => getRadio().play(),
    pause: () => getRadio().pause(),
    toggle: () => getRadio().toggle(),
    /** Seconds into the current track, by the station's clock. */
    position: () => getRadio().position(),
  };
}
