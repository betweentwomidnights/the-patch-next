import { cn } from '../../lib/utils';

// A section divider drawn as a waveform, like the demo videos. The shape is
// generated from a seed so the server and the browser draw the same one.
function bars(seed: number, count: number): number[] {
  let s = seed * 9301 + 49297;
  const rand = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  const out: number[] = [];
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    // a few swells across the width, with noise on top
    const swell = Math.sin(t * Math.PI) * (0.35 + 0.65 * Math.abs(Math.sin(t * 9 + seed)));
    out.push(Math.max(0.04, swell * (0.35 + 0.65 * rand())));
  }
  return out;
}

export default function WaveRule({ seed = 1, className }: { seed?: number; className?: string }) {
  const count = 120;
  const heights = bars(seed, count);
  return (
    <svg
      aria-hidden="true"
      viewBox={`0 0 ${count * 5} 40`}
      preserveAspectRatio="none"
      className={cn('h-8 w-full text-patch', className)}
    >
      {heights.map((h, i) => (
        <rect key={i} x={i * 5 + 1} y={20 - h * 19} width="2.6" height={h * 38} rx="1.3" fill="currentColor" opacity={0.35 + h * 0.65} />
      ))}
    </svg>
  );
}
