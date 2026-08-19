/**
 * CharacterCore — a purely local, always-running "life loop".
 *
 * Runs at ~15Hz and maintains an internal affective state (valence / arousal /
 * dominance), plus energy and attention. Everything decays back toward a
 * baseline when nothing happens, so the character stays alive while idle.
 *
 * No LLM calls happen here. Slow thinking (the AI decision) is triggered
 * separately by touch, at most once every 1–3 seconds.
 *
 * Two independent channels:
 *  - fast perception channel: `perceive()` is called synchronously the instant a
 *    stimulus happens (expression / gaze / micro-reaction), even mid-speech.
 *  - slow speech channel: LLM + TTS, driven separately. It never gates the fast
 *    channel, and the fast channel never waits for it.
 *
 * Perception marks live in a very short freshness window only. Anything older is
 * dropped instead of being replayed later as if it just happened.
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

/** How long a stimulus stays "fresh" enough to still be worth a spoken comment. */
export const FRESHNESS_MS = 2500;

/** A stimulus, recorded at the exact moment it happened. */
export type PerceptionMark = {
  /** performance.now() timestamp of the stimulus itself. */
  at: number;
  kind: string;
  /** Normalized 0..1 position of the stimulus inside the frame. */
  x: number;
  y: number;
  /** 0..1 rough strength of the stimulus. */
  intensity: number;
};

export class CharacterCore {
  state: CoreState = { ...BASELINE };
  /** seconds since the last user interaction */
  idleSeconds = 0;
  /** seconds since the loop started, used by micro-motion noise */
  clock = 0;

  private baseline: CoreState = { ...BASELINE };
  /** Only stimuli inside the freshness window are kept. Never a backlog. */
  private marks: PerceptionMark[] = [];

  setBaseline(next: Partial<CoreState>) {
    this.baseline = { ...this.baseline, ...next };
  }

  /**
   * Fast perception channel. Applies the affective change of a stimulus at the
   * moment it happens and records it in the freshness window. Synchronous and
   * never blocked by the speech channel.
   */
  perceive(mark: PerceptionMark, delta: CoreImpulse) {
    this.impulse(delta);
    this.marks.push(mark);
    this.pruneMarks(mark.at);
  }

  /** Drop everything that fell out of the freshness window. */
  pruneMarks(now: number, windowMs = FRESHNESS_MS) {
    if (this.marks.length === 0) return;
    this.marks = this.marks.filter((m) => now - m.at <= windowMs);
  }

  /** Most recent still-fresh stimulus, or null. Stale ones are discarded. */
  freshestMark(now: number, windowMs = FRESHNESS_MS): PerceptionMark | null {
    this.pruneMarks(now, windowMs);
    return this.marks.length > 0 ? this.marks[this.marks.length - 1]! : null;
  }

  /** Read + clear: used when the speech channel goes idle. */
  consumeFreshMark(now: number, windowMs = FRESHNESS_MS): PerceptionMark | null {
    const mark = this.freshestMark(now, windowMs);
    this.marks = [];
    return mark;
  }

  /**
   * Internal-state gate: is a fresh stimulus actually worth speaking about?
   * Only ever asked about marks that are still inside the freshness window.
   */
  worthCommenting(mark: PerceptionMark): boolean {
    const s = this.state;
    const interest = s.attention * 0.5 + s.arousal * 0.3 + mark.intensity * 0.4 + s.energy * 0.2;
    return interest > 0.55;
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
    this.pruneMarks(performance.now());

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
