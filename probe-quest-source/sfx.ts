let ctx: AudioContext | null = null;
export type Sfx = 'scan' | 'jump' | 'hit' | 'pulse' | 'buy' | 'deny' | 'win';
const NOTES: Record<Sfx, [number, number, OscillatorType][]> = {
  scan: [[660, 0.08, 'triangle'], [880, 0.08, 'triangle'], [1320, 0.14, 'triangle']],
  jump: [[330, 0.12, 'sine']],
  hit: [[180, 0.18, 'square']],
  pulse: [[520, 0.06, 'sine'], [260, 0.18, 'sine']],
  buy: [[523, 0.08, 'triangle'], [784, 0.14, 'triangle']],
  deny: [[220, 0.1, 'triangle'], [196, 0.14, 'triangle']],
  win: [[523, 0.12, 'triangle'], [659, 0.12, 'triangle'], [784, 0.12, 'triangle'], [1046, 0.3, 'triangle']],
};
export function play(s: Sfx) {
  try {
    if (!ctx) ctx = new AudioContext();
    let t = ctx.currentTime;
    for (const [f, d, type] of NOTES[s]) {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type;
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.09, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g).connect(ctx.destination);
      o.start(t);
      o.stop(t + d + 0.02);
      t += d * 0.85;
    }
  } catch {
    /* audio unavailable */
  }
}
