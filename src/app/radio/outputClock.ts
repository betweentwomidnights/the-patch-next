// Answers one question: at what moment will a given bit of sound be heard?
//
// The audio graph has its own clock (seconds since the AudioContext began),
// and sound that passes through the graph at some time on that clock comes
// out of the speakers a little later: the browser's buffer, then the sound
// card, then whatever the device adds. The browser can tell us which sample
// is at the speakers right now and when that was on the page's clock
// (getOutputTimestamp). From that we can turn any audio-clock time into a
// page-clock time, which is what the visuals need to be on time.
//
// Readings wobble by a few milliseconds and the first ones, before sound is
// flowing, are nonsense, so we take several and use the middle one.

const KEEP = 9;

export class OutputClock {
  /** Recent readings of (page clock - audio clock) for sound at the ear, in ms. */
  private ear: number[] = [];
  /** The same for the moment the graph processes it. */
  private render: number[] = [];

  /** `hold` is how long the radio keeps sound back before the output, in seconds. */
  constructor(
    private ctx: AudioContext,
    readonly hold: number,
  ) {}

  /** Take a reading. Call a few times a second while sound is playing. */
  sample(): void {
    const ctx = this.ctx;
    if (ctx.state !== 'running') return;
    // The audio clock moves in steps, so reading it gives a time that is a
    // bit old and makes this offset a bit too big. The smallest recent
    // reading is the one that caught the clock just after it stepped.
    this.render.push(performance.now() - ctx.currentTime * 1000);
    if (this.render.length > KEEP * 2) this.render.shift();
    const rendered = Math.min(...this.render);

    // If the browser can't say what's at the speakers, go by the latency it
    // reports instead.
    let ear = rendered + ((ctx.baseLatency || 0) + (ctx.outputLatency || 0)) * 1000;
    const stamp = typeof ctx.getOutputTimestamp === 'function' ? ctx.getOutputTimestamp() : null;
    if (stamp && stamp.contextTime && stamp.performanceTime) {
      const offset = stamp.performanceTime - stamp.contextTime * 1000;
      const latency = offset - rendered;
      if (latency > -10 && latency < 1000) ear = offset;
    }
    this.ear.push(ear);
    if (this.ear.length > KEEP) this.ear.shift();
  }

  private offset(): number {
    if (this.ear.length === 0) this.sample();
    if (this.ear.length === 0) return performance.now() - this.ctx.currentTime * 1000;
    const sorted = [...this.ear].sort((a, b) => a - b);
    return sorted[sorted.length >> 1];
  }

  /**
   * The page-clock time (performance.now() milliseconds) at which sound that
   * left the source at `contextTime` reaches the listener.
   */
  heardAt(contextTime: number): number {
    return (contextTime + this.hold) * 1000 + this.offset();
  }

  /** Seconds between the graph's output and the listener's ear. */
  latency(): number {
    if (this.ear.length === 0) return 0;
    return Math.min(1, Math.max(0, (this.offset() - Math.min(...this.render)) / 1000));
  }
}
