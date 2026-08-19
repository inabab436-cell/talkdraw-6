const API = "https://api.elevenlabs.io";

export type VoiceStatus = {
  connected: boolean;
  message: string;
  tier?: string;
  charactersUsed?: number;
  charactersLimit?: number;
  charactersRemaining?: number;
  resetsAt?: string | null;
};

function apiKey(): string {
  const key = process.env["ELEVENLABS_API_KEY"];
  if (!key) throw new Error("ELEVENLABS_API_KEY is not configured for this project.");
  return key;
}

async function probeSpeech(key: string): Promise<{ ok: boolean; message: string }> {
  const res = await fetch(
    `${API}/v1/text-to-speech/EXAVITQu4vr4xnSDxMaL?output_format=mp3_22050_32`,
    {
      method: "POST",
      headers: { "xi-api-key": key, "Content-Type": "application/json" },
      body: JSON.stringify({ text: "Hi.", model_id: "eleven_multilingual_v2" }),
    },
  );
  if (res.ok) return { ok: true, message: "Speech generation works." };
  const body = await res.text();
  if (res.status === 401 && body.includes("quota"))
    return { ok: false, message: "The key is valid but has no character credit left." };
  return { ok: false, message: `Voice check failed (${res.status}): ${body.slice(0, 200)}` };
}

export async function getVoiceStatus(): Promise<VoiceStatus> {
  const key = process.env["ELEVENLABS_API_KEY"];
  if (!key) {
    return { connected: false, message: "No ElevenLabs key is linked to this project yet." };
  }

  const res = await fetch(`${API}/v1/user/subscription`, {
    headers: { "xi-api-key": key },
  });

  if (!res.ok) {
    const body = await res.text();
    // Some keys are scoped to speech only and cannot read the account summary.
    if (res.status === 401 && body.includes("missing_permissions")) {
      const probe = await probeSpeech(key);
      return probe.ok
        ? {
            connected: true,
            message:
              "Key is live and generating speech. It is scoped to speech only, so the credit balance is not readable.",
            tier: "speech-only key",
          }
        : { connected: false, message: probe.message };
    }
    return {
      connected: false,
      message: `ElevenLabs rejected the key (${res.status}): ${body.slice(0, 200)}`,
    };
  }

  const sub = (await res.json()) as {
    tier?: string;
    character_count?: number;
    character_limit?: number;
    next_character_count_reset_unix?: number | null;
  };

  const used = sub.character_count ?? 0;
  const limit = sub.character_limit ?? 0;
  const remaining = Math.max(0, limit - used);

  return {
    connected: true,
    message:
      remaining > 0
        ? `Key is live with ${remaining.toLocaleString()} characters of credit left.`
        : "Key is valid but the character credit is used up.",
    tier: sub.tier ?? "unknown",
    charactersUsed: used,
    charactersLimit: limit,
    charactersRemaining: remaining,
    resetsAt: sub.next_character_count_reset_unix
      ? new Date(sub.next_character_count_reset_unix * 1000).toISOString()
      : null,
  };
}

/** Mood → base delivery. Lower stability = more emotional variation, higher style = more playful. */
const MOOD_SETTINGS: Record<string, { stability: number; style: number; speed: number }> = {
  neutral: { stability: 0.55, style: 0.25, speed: 1 },
  happy: { stability: 0.35, style: 0.6, speed: 1.06 },
  playful: { stability: 0.25, style: 0.75, speed: 1.1 },
  shy: { stability: 0.6, style: 0.3, speed: 0.94 },
  annoyed: { stability: 0.3, style: 0.55, speed: 1.08 },
  curious: { stability: 0.45, style: 0.45, speed: 1.02 },
  sad: { stability: 0.7, style: 0.2, speed: 0.9 },
};

const clamp01 = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

/** voiceTone is free text from the LLM; nudge the base settings with what it describes. */
function applyTone(
  base: { stability: number; style: number; speed: number },
  tone: string | undefined,
) {
  const t = (tone ?? "").toLowerCase();
  let { stability, style, speed } = base;

  const intense = /(excite|shout|yell|angry|panic|flustered|energetic|giggl|laugh|squeal)/.test(t);
  const gentle = /(soft|calm|quiet|whisper|gentle|tender|sleepy|tired|sad)/.test(t);
  const playful = /(playful|teasing|flirt|cheeky|sing|silly|mischie)/.test(t);
  const fast = /(fast|quick|rushed|breathless)/.test(t);
  const slow = /(slow|drawn|hesitant|shy)/.test(t);

  if (intense) {
    stability -= 0.15;
    style += 0.15;
  }
  if (gentle) {
    stability += 0.15;
    style -= 0.1;
  }
  if (playful) style += 0.2;
  if (fast) speed += 0.08;
  if (slow) speed -= 0.08;

  return {
    stability: clamp01(stability, 0.15, 0.85),
    style: clamp01(style, 0, 0.9),
    speed: clamp01(speed, 0.8, 1.15),
  };
}

export async function synthesize(input: {
  text: string;
  voiceId: string;
  mood?: string | undefined;
  voiceTone?: string | undefined;
}): Promise<{ audioBase64: string }> {
  const base = MOOD_SETTINGS[input.mood ?? "neutral"] ?? MOOD_SETTINGS["neutral"]!;
  const settings = applyTone(base, input.voiceTone);

  const res = await fetch(
    // 22kHz keeps the payload small so the first line lands fast.
    `${API}/v1/text-to-speech/${input.voiceId}?output_format=mp3_22050_32`,
    {
      method: "POST",
      headers: { "xi-api-key": apiKey(), "Content-Type": "application/json" },
      body: JSON.stringify({
        text: input.text,
        model_id: "eleven_flash_v2_5",
        voice_settings: {
          stability: settings.stability,
          similarity_boost: 0.75,
          style: settings.style,
          use_speaker_boost: true,
          speed: settings.speed,
        },
      }),
    },
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Voice generation failed (${res.status}): ${body.slice(0, 200)}`);
  }

  const buffer = await res.arrayBuffer();
  return { audioBase64: Buffer.from(buffer).toString("base64") };
}

