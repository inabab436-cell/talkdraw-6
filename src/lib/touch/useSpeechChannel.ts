import { useCallback, useEffect, useRef, useState } from "react";
import type { TouchEventPayload } from "./types";

/**
 * SPEECH CHANNEL — the slow channel (LLM decision + TTS playback).
 *
 * It is deliberately NOT a backlog queue: events that arrive while a line is
 * being generated or spoken are never stored to be replayed later. They are
 * handled by the fast perception channel at the moment they happen, and only a
 * single "latest stimulus" slot is kept here, valid for a very short freshness
 * window. When the current line ends, the slot is used only if it is still fresh
 * and the internal state says it is worth a comment — otherwise it is dropped.
 *
 * No mid-sentence TTS interruption happens here (that is Phase 4).
 */

/** Consecutive touches of the same kind on the same region escalate into one event. */
function mergeable(a: TouchEventPayload, b: TouchEventPayload) {
  return a.kind === b.kind && a.region === b.region;
}

function merge(a: TouchEventPayload, b: TouchEventPayload): TouchEventPayload {
  return {
    ...b,
    repeatCount: Math.max(a.repeatCount, b.repeatCount) + 1,
    durationMs: Math.max(a.durationMs, b.durationMs),
    travel: Math.max(a.travel, b.travel),
  };
}

type Options = {
  /** Runs one turn: LLM decision + TTS. Must respect the abort signal. */
  process: (touch: TouchEventPayload, signal: AbortSignal) => Promise<void>;
  /**
   * Asked once the current line ends, for the latest stimulus only.
   * Returns false when the stimulus is stale or not worth speaking about.
   */
  shouldFollowUp: (touch: TouchEventPayload, ageMs: number) => boolean;
};

export function useSpeechChannel({ process, shouldFollowUp }: Options) {
  /** Single freshness slot — never a growing backlog. */
  const pending = useRef<{ touch: TouchEventPayload; at: number } | null>(null);
  const running = useRef(false);
  const controller = useRef<AbortController | null>(null);
  const processRef = useRef(process);
  const gateRef = useRef(shouldFollowUp);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    processRef.current = process;
    gateRef.current = shouldFollowUp;
  }, [process, shouldFollowUp]);

  useEffect(() => () => controller.current?.abort(), []);

  const run = useCallback(async (touch: TouchEventPayload) => {
    running.current = true;
    setBusy(true);
    let next: TouchEventPayload | null = touch;

    while (next) {
      const ac = new AbortController();
      controller.current = ac;
      try {
        await processRef.current(next, ac.signal);
      } catch {
        // failed or aborted — the channel stays alive
      } finally {
        if (controller.current === ac) controller.current = null;
      }

      // Line finished: look only at the freshness slot, never at a backlog.
      const slot = pending.current;
      pending.current = null;
      next = null;
      if (slot) {
        const ageMs = performance.now() - slot.at;
        if (gateRef.current(slot.touch, ageMs)) next = slot.touch;
      }
    }

    running.current = false;
    setBusy(false);
  }, []);

  /**
   * Offer a stimulus to the speech channel. While busy it only refreshes the
   * single latest-stimulus slot (with its timestamp) — it does not queue.
   */
  const submit = useCallback(
    (touch: TouchEventPayload) => {
      if (running.current) {
        const slot = pending.current;
        pending.current = {
          touch: slot && mergeable(slot.touch, touch) ? merge(slot.touch, touch) : touch,
          at: performance.now(),
        };
        return;
      }
      void run(touch);
    },
    [run],
  );

  return { submit, busy };
}
