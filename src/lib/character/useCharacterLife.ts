import { useCallback, useEffect, useRef, useState } from "react";
import { BlinkController } from "./blink";
import { CharacterCore, moodToVad, type CoreImpulse, type CoreState } from "./core";
import { GazeController } from "./gaze";

const TICK_HZ = 15;
const TICK_MS = 1000 / TICK_HZ;

type Options = {
  frameRef: React.RefObject<HTMLElement | null>;
  /** Normalized 0..1 pointer point inside the frame, null when absent. */
  livePoint: { x: number; y: number } | null;
  pressing: boolean;
  speaking: boolean;
};

/**
 * Drives the always-on local life loop and writes the results straight into
 * CSS custom properties on the character frame (no React re-render per tick).
 */
export function useCharacterLife({ frameRef, livePoint, pressing, speaking }: Options) {
  const coreRef = useRef<CharacterCore | null>(null);
  const gazeRef = useRef<GazeController | null>(null);
  const blinkRef = useRef<BlinkController | null>(null);
  if (!coreRef.current) coreRef.current = new CharacterCore();
  if (!gazeRef.current) gazeRef.current = new GazeController();
  if (!blinkRef.current) blinkRef.current = new BlinkController();

  const pointRef = useRef<{ x: number; y: number } | null>(null);
  const flagsRef = useRef({ pressing, speaking });
  pointRef.current = livePoint;
  flagsRef.current = { pressing, speaking };

  // Sampled snapshot for the UI (cheap: a few times per second only).
  const [snapshot, setSnapshot] = useState<CoreState>(() => ({ ...coreRef.current!.state }));

  useEffect(() => {
    const core = coreRef.current!;
    const gaze = gazeRef.current!;
    const blink = blinkRef.current!;
    let raf = 0;
    let last = performance.now();
    let lastTick = 0;
    let lastSample = 0;
    let stopped = false;

    const frame = (now: number) => {
      if (stopped) return;
      raf = requestAnimationFrame(frame);
      if (now - lastTick < TICK_MS) return;
      const dt = Math.min(0.25, (now - last) / 1000);
      last = now;
      lastTick = now;

      const point = pointRef.current;
      const { pressing: isPressing, speaking: isSpeaking } = flagsRef.current;

      if (point) core.impulse({ attention: 0.09 });
      if (isPressing) core.impulse({ arousal: 0.012, attention: 0.14 });
      if (isSpeaking) core.impulse({ arousal: 0.004 });

      const s = core.tick(dt, { engaged: Boolean(point) || isPressing || isSpeaking });
      gaze.look(point);
      gaze.tick(dt, {
        attention: s.attention,
        arousal: s.arousal,
        clock: core.clock,
        hasPointer: Boolean(point),
      });
      const lid = blink.tick(dt, { clock: core.clock, arousal: s.arousal });

      // Micro-motions: layered slow noise so stillness still reads as alive.
      const t = core.clock;
      const life = 0.45 + s.energy * 0.7;
      const microX =
        (Math.sin(t * 0.53) * 0.5 + Math.sin(t * 1.27 + 1.3) * 0.22 + Math.sin(t * 2.9) * 0.08) * life;
      const microY =
        (Math.sin(t * 0.41 + 0.7) * 0.4 + Math.sin(t * 1.63 + 2.1) * 0.18) * life;
      const breath = (Math.sin(t * (0.5 + s.arousal * 0.55)) + 1) / 2;
      const microRot = Math.sin(t * 0.37 + 0.4) * 0.6 * life;

      const el = frameRef.current;
      if (el) {
        const set = (k: string, v: number | string) => el.style.setProperty(k, String(v));
        set("--eye-x", gaze.eyeX.toFixed(3));
        set("--eye-y", gaze.eyeY.toFixed(3));
        set("--look-x", gaze.headX.toFixed(3));
        set("--look-y", gaze.headY.toFixed(3));
        set("--blink", lid.toFixed(3));
        set("--breath", breath.toFixed(3));
        set("--micro-x", microX.toFixed(3));
        set("--micro-y", microY.toFixed(3));
        set("--micro-rot", microRot.toFixed(3));
        set("--arousal", s.arousal.toFixed(3));
        set("--valence", s.valence.toFixed(3));
        set("--energy", s.energy.toFixed(3));
        if (point) {
          set("--touch-x", `${(point.x * 100).toFixed(1)}%`);
          set("--touch-y", `${(point.y * 100).toFixed(1)}%`);
        }
      }

      if (now - lastSample > 400) {
        lastSample = now;
        setSnapshot({ ...s });
      }
    };

    raf = requestAnimationFrame(frame);
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
    };
  }, [frameRef]);

  const impulse = useCallback((delta: CoreImpulse) => coreRef.current?.impulse(delta), []);

  const applyMood = useCallback((mood: string) => {
    const vad = moodToVad[mood];
    if (vad) coreRef.current?.setMood(vad);
    // A mood change usually comes with a startle blink.
    blinkRef.current?.trigger(coreRef.current!.clock);
  }, []);

  return { core: snapshot, impulse, applyMood };
}
