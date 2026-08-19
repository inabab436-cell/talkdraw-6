/**
 * CharacterCore — a purely local, always-running "life loop".
 *
 * Runs at ~15Hz and maintains an internal affective state (valence / arousal /
 * dominance), plus energy and attention. Everything decays back toward a
 * baseline when nothing happens, so the character stays alive while idle.
 *
 * No LLM calls happen here. Slow thinking (the AI decision) is triggered
 * separately by touch, at most once every 1–3 seconds.
 */

export type Vad = {
  /** -1 (negative) .. 1 (positive) */
  valence: number;
  /** 0 (calm) .. 1 (excited / tense) */
  arousal: number;
  /** 0 (submissive / shy) .. 1 (confident) */
  dominance: number;
};

export type CoreState = Vad & {
  /** 0 .. 1 */
  energy: number;
  /** 0 (spaced out) .. 1 (locked on the pointer) */
  attention: number;
};

export const BASELINE: CoreState = {
  valence: 0.12,
  arousal: 0.28,
  dominance: 0.5,
  energy: 0.62,
  attention: 0.18,
};

/** Per-second pull toward baseline for each channel. */
const DECAY = {
  valence: 0.22,
  arousal: 0.45,
  dominance: 0.3,
  energy: 0.12,
  attention: 0.9,
} as const;

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export type CoreImpulse = Partial<CoreState>;

export class CharacterCore {
  state: CoreState = { ...BASELINE };
  /** seconds since the last user interaction */
  idleSeconds = 0;
  /** seconds since the loop started, used by micro-motion noise */
  clock = 0;

  private baseline: CoreState = { ...BASELINE };

  setBaseline(next: Partial<CoreState>) {
    this.baseline = { ...this.baseline, ...next };
  }

  /** Nudge the internal state (touch, speech, AI decision, …). */
  impulse(delta: CoreImpulse) {
    const s = this.state;
    s.valence = clamp(s.valence + (delta.valence ?? 0), -1, 1);
    s.arousal = clamp(s.arousal + (delta.arousal ?? 0), 0, 1);
    s.dominance = clamp(s.dominance + (delta.dominance ?? 0), 0, 1);
    s.energy = clamp(s.energy + (delta.energy ?? 0), 0, 1);
    s.attention = clamp(s.attention + (delta.attention ?? 0), 0, 1);
    this.idleSeconds = 0;
  }

  /** Absolute set, used when the AI reports a new mood. */
  setMood(next: Partial<Vad>) {
    this.state.valence = clamp(next.valence ?? this.state.valence, -1, 1);
    this.state.arousal = clamp(next.arousal ?? this.state.arousal, 0, 1);
    this.state.dominance = clamp(next.dominance ?? this.state.dominance, 0, 1);
    this.idleSeconds = 0;
  }

  /** Advance the simulation by dt seconds. */
  tick(dt: number, opts: { engaged: boolean } = { engaged: false }) {
    this.clock += dt;
    this.idleSeconds = opts.engaged ? 0 : this.idleSeconds + dt;

    const s = this.state;
    const b = this.baseline;
    for (const key of ["valence", "arousal", "dominance", "energy", "attention"] as const) {
      const rate = DECAY[key];
      s[key] += (b[key] - s[key]) * Math.min(1, rate * dt);
    }

    // Long idle: slowly drifts calmer and a touch less energetic.
    if (this.idleSeconds > 12) {
      s.arousal = clamp(s.arousal - 0.02 * dt, 0, 1);
      s.energy = clamp(s.energy - 0.01 * dt, 0.25, 1);
    }
    return s;
  }
}

/** Rough mapping from the AI mood label to a VAD target. */
export const moodToVad: Record<string, Vad> = {
  neutral: { valence: 0.1, arousal: 0.28, dominance: 0.5 },
  happy: { valence: 0.75, arousal: 0.6, dominance: 0.6 },
  shy: { valence: 0.25, arousal: 0.55, dominance: 0.2 },
  annoyed: { valence: -0.55, arousal: 0.62, dominance: 0.65 },
  curious: { valence: 0.35, arousal: 0.45, dominance: 0.45 },
  sad: { valence: -0.6, arousal: 0.2, dominance: 0.3 },
  playful: { valence: 0.6, arousal: 0.7, dominance: 0.62 },
};
