/**
 * BlinkController — stochastic blinking, replacing the fixed CSS keyframe.
 * Interval is randomized 2–8s and shortens with arousal (tense = faster).
 * Occasionally fires a double blink.
 */

const MIN_INTERVAL = 2;
const MAX_INTERVAL = 8;
const BLINK_DURATION = 0.13;

export class BlinkController {
  /** 0 = eyes open, 1 = fully closed. */
  amount = 0;

  private nextAt = 1.2;
  private closingUntil = 0;
  private pending = 0;

  private schedule(clock: number, arousal: number) {
    const span = MAX_INTERVAL - MIN_INTERVAL;
    // High arousal compresses the window toward the fast end.
    const bias = 1 - Math.min(1, Math.max(0, arousal));
    const base = MIN_INTERVAL + span * (0.15 + 0.85 * bias) * Math.random();
    this.nextAt = clock + Math.max(0.6, base);
  }

  /** Force a blink now (e.g. after a startle). */
  trigger(clock: number, double = false) {
    this.closingUntil = clock + BLINK_DURATION;
    if (double) this.pending = 1;
  }

  tick(dt: number, opts: { clock: number; arousal: number }) {
    const { clock, arousal } = opts;

    if (clock >= this.nextAt && this.closingUntil <= clock) {
      this.trigger(clock, Math.random() < 0.18);
      this.schedule(clock, arousal);
    }

    if (this.closingUntil > clock) {
      const t = 1 - (this.closingUntil - clock) / BLINK_DURATION;
      // Ease in/out over the blink window.
      this.amount = Math.sin(Math.min(1, Math.max(0, t)) * Math.PI);
    } else {
      if (this.pending > 0) {
        this.pending -= 1;
        this.closingUntil = clock + BLINK_DURATION * 0.85;
      }
      this.amount = Math.max(0, this.amount - dt * 8);
    }
    return this.amount;
  }
}
