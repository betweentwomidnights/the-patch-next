// SVG filters that make straight CSS borders look drawn by hand. Three takes
// of the same wobble; cycling through them is the "boil" in globals.css.
export default function SketchDefs() {
  const takes = [
    { id: 'rough-a', seed: 3 },
    { id: 'rough-b', seed: 11 },
    { id: 'rough-c', seed: 27 },
  ];
  return (
    <svg aria-hidden="true" width="0" height="0" className="pointer-events-none absolute">
      <defs>
        {takes.map((t) => (
          <filter key={t.id} id={t.id} x="-5%" y="-5%" width="110%" height="110%">
            <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed={t.seed} result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="3.2" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        ))}
      </defs>
    </svg>
  );
}
