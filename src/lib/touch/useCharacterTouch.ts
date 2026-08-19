import { useCallback, useRef, useState } from "react";
import { resolveRegion } from "./regions";
import type { TouchEventPayload, TouchKind } from "./types";

const LONG_PRESS_MS = 500;
const HOLD_MS = 1200;
const BURST_WINDOW_MS = 1600;
const DRAG_THRESHOLD = 0.05;

type Options = {
  onTouch: (payload: TouchEventPayload) => void;
};

export function useCharacterTouch({ onTouch }: Options) {
  const frameRef = useRef<HTMLDivElement | null>(null);
  const startRef = useRef<{ x: number; y: number; t: number } | null>(null);
  const burstRef = useRef<{ count: number; lastAt: number }>({ count: 0, lastAt: 0 });
  const [pressPoint, setPressPoint] = useState<{ x: number; y: number } | null>(null);
  const [livePoint, setLivePoint] = useState<{ x: number; y: number } | null>(null);
  const [pressing, setPressing] = useState(false);

  const toLocal = useCallback((clientX: number, clientY: number) => {
    const rect = frameRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0.5, y: 0.5 };
    return {
      x: Math.min(1, Math.max(0, (clientX - rect.left) / rect.width)),
      y: Math.min(1, Math.max(0, (clientY - rect.top) / rect.height)),
    };
  }, []);

  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      event.currentTarget.setPointerCapture?.(event.pointerId);
      const point = toLocal(event.clientX, event.clientY);
      startRef.current = { ...point, t: performance.now() };
      setPressPoint(point);
      setLivePoint(point);
      setPressing(true);
    },
    [toLocal],
  );

  const onPointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const point = toLocal(event.clientX, event.clientY);
      setLivePoint(point);
      if (startRef.current) setPressPoint(point);
    },
    [toLocal],
  );

  const finish = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const start = startRef.current;
      startRef.current = null;
      setPressing(false);
      setPressPoint(null);
      if (!start) return;

      const end = toLocal(event.clientX, event.clientY);
      const now = performance.now();
      const durationMs = Math.round(now - start.t);
      const travel = Math.hypot(end.x - start.x, end.y - start.y);

      const burst = burstRef.current;
      const sinceLastMs = burst.lastAt ? Math.round(now - burst.lastAt) : null;
      const inBurst = sinceLastMs !== null && sinceLastMs < BURST_WINDOW_MS;
      burst.count = inBurst ? burst.count + 1 : 1;
      burst.lastAt = now;

      let kind: TouchKind = "tap";
      if (travel > DRAG_THRESHOLD) kind = durationMs < 350 ? "swipe" : "drag";
      else if (durationMs >= HOLD_MS) kind = "hold";
      else if (durationMs >= LONG_PRESS_MS) kind = "long-press";
      else if (inBurst && burst.count >= 2) kind = "double-tap";

      onTouch({
        x: Number(start.x.toFixed(3)),
        y: Number(start.y.toFixed(3)),
        region: resolveRegion(start.x, start.y),
        kind,
        durationMs,
        repeatCount: burst.count,
        travel: Number(travel.toFixed(3)),
        pointerType: event.pointerType || "unknown",
        sinceLastMs,
      });
    },
    [onTouch, toLocal],
  );

  const cancel = useCallback(() => {
    startRef.current = null;
    setPressing(false);
    setPressPoint(null);
  }, []);

  const leave = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (!startRef.current && !event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      setLivePoint(null);
    }
  }, []);

  return {
    frameRef,
    pressPoint,
    livePoint,
    pressing,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: finish,
      onPointerCancel: cancel,
      onPointerLeave: leave,
      onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
    },
  };
}
