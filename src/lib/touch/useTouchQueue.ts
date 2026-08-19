import { useCallback, useEffect, useRef, useState } from "react";
import type { TouchEventPayload } from "./types";

/** Higher wins: an arriving high-priority touch cancels a low-priority in-flight request. */
const PRIORITY: Record<string, number> = {
  tap: 1,
  "double-tap": 2,
  swipe: 2,
  drag: 3,
  "long-press": 3,
  hold: 4,
};

const priorityOf = (t: TouchEventPayload) => PRIORITY[t.kind] ?? 1;

/** Consecutive touches of the same kind on the same region collapse into one escalating event. */
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
  /** Runs one queued touch. Must respect the abort signal. */
  process: (touch: TouchEventPayload, signal: AbortSignal) => Promise<void>;
};

/**
 * FIFO queue with coalescing — no touch is ever dropped while another is processing.
 * A more important touch aborts the in-flight request instead of waiting for it.
 */
export function useTouchQueue({ process }: Options) {
  const queue = useRef<TouchEventPayload[]>([]);
  const running = useRef(false);
  const controller = useRef<AbortController | null>(null);
  const currentPriority = useRef(0);
  const processRef = useRef(process);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    processRef.current = process;
  }, [process]);

  useEffect(() => () => controller.current?.abort(), []);

  const drain = useCallback(async () => {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    while (queue.current.length > 0) {
      const next = queue.current.shift()!;
      const ac = new AbortController();
      controller.current = ac;
      currentPriority.current = priorityOf(next);
      try {
        await processRef.current(next, ac.signal);
      } catch {
        // aborted or failed — keep draining the rest of the queue
      } finally {
        if (controller.current === ac) controller.current = null;
        currentPriority.current = 0;
      }
    }
    running.current = false;
    setBusy(false);
  }, []);

  const enqueue = useCallback(
    (touch: TouchEventPayload) => {
      const last = queue.current[queue.current.length - 1];
      if (last && mergeable(last, touch)) {
        queue.current[queue.current.length - 1] = merge(last, touch);
      } else {
        queue.current.push(touch);
      }

      // A clearly more important touch interrupts whatever is running now.
      if (running.current && priorityOf(touch) > currentPriority.current) {
        controller.current?.abort();
      }

      void drain();
    },
    [drain],
  );

  return { enqueue, busy };
}
