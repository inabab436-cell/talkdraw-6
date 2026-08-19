/**
 * GazeController — eyes lead, head follows with a small lag.
 * Produces normalized -1..1 offsets that drive --eye-x/--eye-y and
 * --look-x/--look-y in CSS.
 */

const lerp = (a: number, b: number, t: number) => a + (b - a) * Math.min(1, Math.max(0, t));

export class GazeController {
  eyeX = 0;
  eyeY = 0;
  headX = 0;
  headY = 0;

  /** Current gaze target in -1..1 space. */
  private targetX = 0;
  private targetY = 0;
  /** Saccade wander target used when idle (no pointer). */
  private wanderX = 0;
  private wanderY = 0;
  private nextWanderAt = 0;
  /** Forced glance toward a stimulus; overrides pointer + wander until it expires. */
  private glanceX = 0;
  private glanceY = 0;
  private glanceUntil = 0;

  /**
   * Snap the gaze toward a stimulus immediately (fast perception channel).
   * `point` is normalized 0..1 inside the frame, `clock` is the core clock.
   */
  glanceAt(point: { x: number; y: number }, clock: number, holdSeconds = 0.9) {
    this.glanceX = (point.x - 0.5) * 2;
    this.glanceY = (point.y - 0.5) * 2;
    this.glanceUntil = clock + holdSeconds;
    this.targetX = this.glanceX;
    this.targetY = this.glanceY;
    // Eyes jump instantly; the head still follows with its own lag.
    this.eyeX = this.glanceX;
    this.eyeY = this.glanceY;
  }

  /** Feed a normalized 0..1 pointer position inside the frame. */
  look(point: { x: number; y: number } | null) {
    if (this.glanceUntil > 0) return;
    if (!point) {
      this.targetX = this.wanderX;
      this.targetY = this.wanderY;
      return;
    }
    this.targetX = (point.x - 0.5) * 2;
    this.targetY = (point.y - 0.5) * 2;
  }

  tick(dt: number, opts: { attention: number; arousal: number; clock: number; hasPointer: boolean }) {
    if (this.glanceUntil > 0) {
      if (opts.clock < this.glanceUntil) {
        this.targetX = this.glanceX;
        this.targetY = this.glanceY;
      } else {
        this.glanceUntil = 0;
      }
    }

    // Idle wander: occasional small saccades so the eyes never freeze.
    if (this.glanceUntil === 0 && !opts.hasPointer && opts.clock >= this.nextWanderAt) {
      this.wanderX = (Math.random() * 2 - 1) * 0.45;
      this.wanderY = (Math.random() * 2 - 1) * 0.3;
      this.nextWanderAt = opts.clock + 1.6 + Math.random() * 3.4;
      this.targetX = this.wanderX;
      this.targetY = this.wanderY;
    }

    // Eyes are fast; the head is deliberately slower and damped.
    const eyeSpeed = 9 + opts.arousal * 8;
    const headSpeed = 2.2 + opts.attention * 1.8;
    const headGain = 0.45 + opts.attention * 0.35;

    this.eyeX = lerp(this.eyeX, this.targetX, eyeSpeed * dt);
    this.eyeY = lerp(this.eyeY, this.targetY, eyeSpeed * dt);
    this.headX = lerp(this.headX, this.targetX * headGain, headSpeed * dt);
    this.headY = lerp(this.headY, this.targetY * headGain, headSpeed * dt);
  }
}
