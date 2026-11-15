'use client';

import { useEffect, useState } from 'react';

// kev's lines from the old landing page, in order. it stops on the last one.
const lines = [
  'gary used to be a max4live device with 3 models',
  'it was kinda a PITA to use...',
  "now it's a vst/au with eight",
  'fl studio, reaper, bitwig, ableton, logic',
  'even garageband users can play',
  'this is not suno',
];

export default function CyclingText() {
  const [index, setIndex] = useState(0);
  const [swapping, setSwapping] = useState(false);
  const last = index === lines.length - 1;

  useEffect(() => {
    if (last) return;
    let inner: number | undefined;
    const outer = window.setTimeout(() => {
      setSwapping(true);
      inner = window.setTimeout(() => {
        setIndex((i) => i + 1);
        setSwapping(false);
      }, 160);
    }, 2800);
    return () => {
      window.clearTimeout(outer);
      window.clearTimeout(inner);
    };
  }, [index, last]);

  return (
    <p
      aria-live="off"
      className="flex min-h-[1.7em] items-center justify-center text-center transition-all duration-150 ease-out"
      style={{ opacity: swapping ? 0 : 1, filter: swapping ? 'blur(4px)' : 'none' }}
    >
      <span className={last ? 'loud text-3xl text-patch sm:text-4xl' : 'text-ash'}>{lines[index]}</span>
    </p>
  );
}
