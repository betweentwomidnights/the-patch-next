// The moods of a formed picture.
//
// A logo made of particles that only ever jumps on the kick gets repetitive.
// The very first collabage patch (a p5 sketch from 2023) jostled every
// particle in proportion to how loud the music was, and in one of its scenes
// the pull toward home breathed in and out. This is that idea for the ink:
// two moods that take turns, on top of everything the picture already does
// (the kicks are untouched).
//
//   steady  the picture holds, with small eddies drifting through it that
//           grow with the music
//   loose   the hold breathes: as it slackens the eddies carry the particles
//           further and the picture smears into swirls, then tightens again
//
// Moods change on a kick, so a change lands on the beat. They only run where
// the ink has the screen to itself (see StageAnchor's `free`).

export type Mood = 'steady' | 'loose';

export interface MoodInput {
  dt: number;
  /** Music is playing, a picture is formed, and there's room to move. */
  on: boolean;
  /** How much is going on in the music right now, 0..1. */
  energy: number;
  /** The strength of a kick that landed on this frame, else 0. */
  kick: number;
}

export class Moods {
  /** How hard the eddies push (0 = none). */
  stir = 0;
  /** How firmly each particle is held to its place: 1 as normal, less is looser. */
  grip = 1;

  mood: Mood = 'steady';
  private age = 0;
  private length = 10;
  private breaths = 1;
  /** For looking at one mood while working on it (?mood= in dev): keep coming back to it. */
  pin: Mood | null = null;

  constructor(private random: () => number = Math.random) {}

  private begin(mood: Mood): void {
    const r = this.random();
    this.mood = mood;
    this.age = 0;
    if (mood === 'steady') this.length = 9 + r * 7;
    else {
      this.length = 10 + r * 8;
      this.breaths = this.length > 14 ? 2 : 1;
    }
  }

  step({ dt, on, energy, kick }: MoodInput): void {
    const ease = (rate: number) => 1 - Math.exp(-dt * rate);
    if (!on) {
      // nothing playing, or not a picture: hold still, and start over next time
      if (this.mood !== 'steady') this.begin('steady');
      this.age = 0;
      this.stir += (0 - this.stir) * ease(3);
      this.grip += (1 - this.grip) * ease(3);
      return;
    }
    this.age += dt;

    if (this.pin) {
      if (this.mood !== this.pin && this.age > 3) this.begin(this.pin);
    } else if (this.age > this.length && (kick > 0.55 || this.age > this.length + 3)) {
      // (wait for a good kick to change on; if none comes, change anyway)
      this.begin(this.mood === 'steady' ? 'loose' : 'steady');
    }

    let grip = 1;
    let stir = 0.05 + 0.2 * energy;
    if (this.mood === 'loose') {
      const breath = 0.5 - 0.5 * Math.cos((2 * Math.PI * this.breaths * this.age) / this.length);
      grip = 1 - 0.55 * breath;
      stir = 0.1 + 0.4 * energy;
    }

    this.grip += (grip - this.grip) * ease(5);
    this.stir += (stir - this.stir) * ease(4);
  }
}
