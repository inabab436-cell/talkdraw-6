import { z } from "zod";
import type { AiTouchDecision } from "./touch/types";

const moodEnum = z.enum(["neutral", "happy", "shy", "annoyed", "curious", "sad", "playful"]);

const animationEnum = z.enum([
  "idle",
  "lean-in",
  "recoil",
  "nod",
  "shake-head",
  "bounce",
  "sway",
  "flustered",
  "laugh",
]);

export const touchRequestSchema = z.object({
  character: z.object({
    name: z.string(),
    title: z.string(),
    tagline: z.string(),
    traits: z.array(z.string()),
  }),
  state: z.object({
    mood: moodEnum,
    affinity: z.number(),
    energy: z.number(),
    interactionCount: z.number(),
  }),
  touch: z.object({
    x: z.number(),
    y: z.number(),
    region: z.string(),
    kind: z.string(),
    durationMs: z.number(),
    repeatCount: z.number(),
    travel: z.number(),
    pointerType: z.string(),
    sinceLastMs: z.number().nullable(),
  }),
  history: z
    .array(
      z.object({
        region: z.string(),
        kind: z.string(),
        durationMs: z.number(),
        repeatCount: z.number(),
        mood: moodEnum,
        speech: z.string(),
      }),
    )
    .max(8)
    .default([]),
});

export type TouchRequest = z.infer<typeof touchRequestSchema>;

const responseTool = {
  type: "function",
  function: {
    name: "respond_to_touch",
    description: "Decide how the anime character reacts to the touch.",
    parameters: {
      type: "object",
      properties: {
        mood: { type: "string", enum: moodEnum.options },
        animation: { type: "string", enum: animationEnum.options },
        expression: { type: "string", description: "Short facial expression description." },
        speech: { type: "string", description: "One short in-character line of English dialogue." },
        voiceTone: { type: "string", description: "How the line should sound if spoken aloud." },
        affinityDelta: { type: "number", description: "Between -0.3 and 0.3." },
        energyDelta: { type: "number", description: "Between -0.3 and 0.3." },
        reason: { type: "string", description: "One short sentence explaining the choice." },
      },
      required: [
        "mood",
        "animation",
        "expression",
        "speech",
        "voiceTone",
        "affinityDelta",
        "energyDelta",
        "reason",
      ],
      additionalProperties: false,
    },
  },
} as const;

export async function decideTouchResponse(input: TouchRequest): Promise<AiTouchDecision> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("AI is not configured.");

  const system = [
    "You are the mind of a 2D anime companion in an interactive scene.",
    "The user physically touches the character; you decide the reaction.",
    "Reason about the touched body region, touch type, duration, repetition and elapsed time,",
    "the character's personality, current mood, affinity and energy, and the recent interaction history.",
    "Treat rapid repeated touches as one escalating situation, not isolated events.",
    "The same region must produce different reactions depending on mood, affinity and context.",
    "Keep speech under 18 words, natural, in English, always in character.",
    "Never repeat a previous line verbatim. Always call the respond_to_touch tool.",
  ].join(" ");

  const userPayload = {
    character: input.character,
    state: input.state,
    touch: input.touch,
    recentInteractions: input.history,
  };

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: system },
        { role: "user", content: JSON.stringify(userPayload) },
      ],
      tools: [responseTool],
      tool_choice: { type: "function", function: { name: "respond_to_touch" } },
    }),
  });

  if (res.status === 429) throw new Error("Too many touches at once — give them a moment.");
  if (res.status === 402) throw new Error("AI credits are exhausted.");
  if (!res.ok) throw new Error(`AI request failed (${res.status}).`);

  const json = (await res.json()) as {
    choices?: Array<{
      message?: { tool_calls?: Array<{ function?: { arguments?: string } }> };
    }>;
  };
  const args = json.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  if (!args) throw new Error("AI returned no decision.");

  const parsed = z
    .object({
      mood: moodEnum,
      animation: animationEnum,
      expression: z.string(),
      speech: z.string(),
      voiceTone: z.string(),
      affinityDelta: z.number(),
      energyDelta: z.number(),
      reason: z.string(),
    })
    .parse(JSON.parse(args));

  return parsed;
}
