import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Volume2 } from "lucide-react";
import { toast } from "sonner";
import { reactToTouch } from "@/lib/touch.functions";
import { speakLine } from "@/lib/voice.functions";
import { useCharacterTouch } from "@/lib/touch/useCharacterTouch";
import { useTouchQueue } from "@/lib/touch/useTouchQueue";
import { useCharacterLife } from "@/lib/character/useCharacterLife";
import type {
  AiTouchDecision,
  CharacterState,
  TouchEventPayload,
  TouchTurn,
} from "@/lib/touch/types";
import type { Character } from "@/lib/characters";

const animationClass: Record<AiTouchDecision["animation"], string> = {
  idle: "",
  "lean-in": "anim-lean-in",
  recoil: "anim-recoil",
  nod: "anim-nod",
  "shake-head": "anim-shake",
  bounce: "anim-bounce",
  sway: "anim-sway",
  flustered: "anim-flustered",
  laugh: "anim-laugh",
};

/** Immediate, local reaction so the character moves the instant it is touched. */
function instantAnimation(touch: TouchEventPayload): AiTouchDecision["animation"] {
  if (touch.kind === "swipe" || touch.kind === "drag") return "sway";
  if (touch.kind === "hold" || touch.kind === "long-press") return "flustered";
  if (touch.repeatCount >= 3) return "bounce";
  if (touch.y < 0.36) return "lean-in";
  return "nod";
}

const clamp = (n: number) => Math.max(-1, Math.min(1, n));

export function CharacterScene({ character }: { character: Character }) {
  const call = useServerFn(reactToTouch);
  const speak = useServerFn(speakLine);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const lifeRef = useRef<{
    applyMood: (mood: string) => void;
    impulse: (delta: Record<string, number>) => void;
  } | null>(null);

  useEffect(() => () => audioRef.current?.pause(), []);

  const playLine = useCallback(
    async (decision: Pick<AiTouchDecision, "speech" | "mood" | "voiceTone">, signal?: AbortSignal) => {
      const text = decision.speech;
      if (!text.trim()) return;
      try {
        setSpeaking(true);
        const payload = {
          data: {
            text: text.slice(0, 600),
            voiceId: character.voiceId,
            mood: decision.mood,
            voiceTone: decision.voiceTone,
          },
          ...(signal ? { signal } : {}),
        };
        const { audioBase64 } = (await speak(payload)) as { audioBase64: string };
        if (signal?.aborted) {
          setSpeaking(false);
          return;
        }
        audioRef.current?.pause();
        const audio = new Audio(`data:audio/mpeg;base64,${audioBase64}`);
        audioRef.current = audio;
        audio.onended = () => setSpeaking(false);
        audio.onerror = () => setSpeaking(false);
        await audio.play();
      } catch (error) {
        setSpeaking(false);
        if (signal?.aborted) return;
        toast.error(error instanceof Error ? error.message : "Voice playback failed.");
      }
    },
    [character.voiceId, speak],
  );

  const [state, setState] = useState<CharacterState>({
    mood: "neutral",
    affinity: 0,
    energy: 0.6,
    interactionCount: 0,
  });
  const [turns, setTurns] = useState<TouchTurn[]>([]);
  const [animation, setAnimation] = useState<AiTouchDecision["animation"]>("idle");
  const [animKey, setAnimKey] = useState(0);
  const [ripple, setRipple] = useState<{ x: number; y: number; id: number } | null>(null);

  // Latest values for the queue worker, so no touch is processed with stale context.
  const stateRef = useRef(state);
  const turnsRef = useRef(turns);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);
  useEffect(() => {
    turnsRef.current = turns;
  }, [turns]);

  const latest = turns[0];

  const play = useCallback((next: AiTouchDecision["animation"]) => {
    setAnimation(next);
    setAnimKey((k) => k + 1);
  }, []);

  const process = useCallback(
    async (touch: TouchEventPayload, signal: AbortSignal) => {
      const decision = (await call({
        data: {
          character: {
            name: character.name,
            title: character.title,
            tagline: character.tagline,
            traits: character.traits,
          },
          state: stateRef.current,
          touch,
          history: turnsRef.current.slice(0, 6).map((t) => ({
            region: t.touch.region,
            kind: t.touch.kind,
            durationMs: t.touch.durationMs,
            repeatCount: t.touch.repeatCount,
            mood: t.decision.mood,
            speech: t.decision.speech,
          })),
        },
        signal,
      })) as AiTouchDecision;

      if (signal.aborted) return;

      play(decision.animation);
      lifeRef.current?.applyMood(decision.mood);
      lifeRef.current?.impulse({
        valence: decision.affinityDelta * 0.6,
        energy: decision.energyDelta * 0.5,
        arousal: 0.12,
        attention: 0.4,
      });
      setState((prev) => ({
        mood: decision.mood,
        affinity: clamp(prev.affinity + decision.affinityDelta),
        energy: clamp(prev.energy + decision.energyDelta),
        interactionCount: prev.interactionCount + 1,
      }));
      setTurns((prev) => [{ touch, decision }, ...prev].slice(0, 12));
      await playLine(decision, signal);
    },
    [call, character, playLine, play],
  );

  const { enqueue, busy: thinking } = useTouchQueue({ process });

  const handleTouch = useCallback(
    (touch: TouchEventPayload) => {
      setRipple({ x: touch.x, y: touch.y, id: Date.now() });
      play(instantAnimation(touch));
      // Instant local state change; the LLM decision arrives later.
      lifeRef.current?.impulse({
        arousal: touch.kind === "hold" || touch.kind === "long-press" ? 0.28 : 0.16,
        attention: 0.6,
        energy: 0.05,
      });
      enqueue(touch);
    },
    [enqueue, play],
  );

  const { frameRef, pressPoint, livePoint, pressing, handlers } = useCharacterTouch({
    onTouch: handleTouch,
  });

  const life = useCharacterLife({ frameRef, livePoint, pressing, speaking });
  lifeRef.current = life;

  const faceClip = "inset(6% 18% 66% 18%)"; // eyes + brows band
  const mouthClip = "inset(28% 30% 60% 30%)"; // mouth band

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="panel relative overflow-hidden rounded-3xl">
        <div
          ref={frameRef}
          {...handlers}
          role="application"
          aria-label={`Touch ${character.name} anywhere in the scene`}
          className={`character-live-frame relative aspect-[3/4] w-full touch-none select-none ${
            pressing ? "is-touching" : ""
          }`}
          style={{ WebkitTapHighlightColor: "transparent" }}
        >
          <div className="character-body absolute inset-0 rig-idle">
            <div
              key={animKey}
              className={`character-pose absolute inset-0 ${animationClass[animation]}`}
              style={{ transformOrigin: "50% 85%" }}
            >
              <img
                src={character.image}
                alt={`${character.name}, ${character.title}`}
                draggable={false}
                className={`h-full w-full object-cover transition-transform duration-300 ${
                  pressing ? "scale-[1.01]" : ""
                }`}
              />
              {/* fake facial rig: brows + eyes band and mouth band re-drawn on top */}
              <img
                src={character.image}
                alt=""
                aria-hidden
                draggable={false}
                className="character-brows pointer-events-none absolute inset-0 h-full w-full object-cover rig-brows"
                style={{ clipPath: faceClip, WebkitClipPath: faceClip }}
              />
              <img
                src={character.image}
                alt=""
                aria-hidden
                draggable={false}
                className="character-eyes pointer-events-none absolute inset-0 h-full w-full object-cover rig-eyes"
                style={{ clipPath: faceClip, WebkitClipPath: faceClip }}
              />
              <img
                src={character.image}
                alt=""
                aria-hidden
                draggable={false}
                className={`character-mouth pointer-events-none absolute inset-0 h-full w-full object-cover ${
                  speaking ? "rig-mouth-talk" : ""
                }`}
                style={{ clipPath: mouthClip, WebkitClipPath: mouthClip }}
              />
            </div>
          </div>

          {ripple ? (
            <span
              key={ripple.id}
              className="pointer-events-none absolute h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/70 bg-primary/15 anim-ripple"
              style={{ left: `${ripple.x * 100}%`, top: `${ripple.y * 100}%` }}
            />
          ) : null}

          {pressing && pressPoint ? (
            <span
              className="pointer-events-none absolute h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/30"
              style={{ left: `${pressPoint.x * 100}%`, top: `${pressPoint.y * 100}%` }}
            />
          ) : null}

          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-center p-4">
            {thinking ? (
              <span className="panel inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
              </span>
            ) : speaking ? (
              <span className="panel inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs text-muted-foreground">
                <Volume2 className="h-3.5 w-3.5 animate-pulse text-primary" />
              </span>
            ) : latest ? (
              <button
                type="button"
                onClick={() => void playLine(latest.decision)}
                className="panel pointer-events-auto inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                <Volume2 className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <aside className="space-y-4">
        <div className="panel rounded-2xl p-5">
          <h2 className="font-display text-lg font-bold">{character.name}</h2>
          <p className="text-xs text-accent">{character.title}</p>
          <dl className="mt-4 space-y-3 text-sm">
            <Meter label="Mood" value={state.mood} />
            <Bar label="Affinity" value={(state.affinity + 1) / 2} />
            <Bar label="Energy" value={(state.energy + 1) / 2} />
            <Meter label="Interactions" value={String(state.interactionCount)} />
          </dl>
        </div>
        <div className="panel rounded-2xl p-5">
          <h3 className="text-xs uppercase tracking-[0.25em] text-primary">Inner state</h3>
          <dl className="mt-4 space-y-3 text-sm">
            <Bar label="Valence" value={(life.core.valence + 1) / 2} />
            <Bar label="Arousal" value={life.core.arousal} />
            <Bar label="Dominance" value={life.core.dominance} />
            <Bar label="Attention" value={life.core.attention} />
          </dl>
        </div>
      </aside>
    </div>
  );
}

function Meter({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium capitalize">{value}</dd>
    </div>
  );
}

function Bar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <dt className="text-muted-foreground">{label}</dt>
        <dd className="text-xs text-muted-foreground">{Math.round(value * 100)}%</dd>
      </div>
      <div className="mt-1 h-1.5 rounded-full bg-secondary">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
          style={{ width: `${Math.round(value * 100)}%` }}
        />
      </div>
    </div>
  );
}
