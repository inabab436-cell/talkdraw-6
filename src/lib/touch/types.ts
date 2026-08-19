export type TouchKind = "tap" | "double-tap" | "long-press" | "hold" | "drag" | "swipe";

export type CharacterMood =
  | "neutral"
  | "happy"
  | "shy"
  | "annoyed"
  | "curious"
  | "sad"
  | "playful";

export type TouchEventPayload = {
  /** Normalized 0..1 coordinates inside the character frame. */
  x: number;
  y: number;
  /** Best-effort body region guess from the normalized position. */
  region: string;
  kind: TouchKind;
  /** Milliseconds the pointer stayed down. */
  durationMs: number;
  /** How many touches happened in the current burst. */
  repeatCount: number;
  /** Distance travelled while pressed, normalized to frame size. */
  travel: number;
  pointerType: string;
  /** Milliseconds since the previous touch, null for the first. */
  sinceLastMs: number | null;
};

export type CharacterState = {
  mood: CharacterMood;
  /** -1 (uncomfortable) .. 1 (delighted) */
  affinity: number;
  energy: number;
  interactionCount: number;
};

export type AiTouchDecision = {
  mood: CharacterMood;
  /** Named motion the scene plays. */
  animation:
    | "idle"
    | "lean-in"
    | "recoil"
    | "nod"
    | "shake-head"
    | "bounce"
    | "sway"
    | "flustered"
    | "laugh";
  expression: string;
  speech: string;
  voiceTone: string;
  affinityDelta: number;
  energyDelta: number;
  reason: string;
};

export type TouchTurn = {
  touch: TouchEventPayload;
  decision: AiTouchDecision;
};
