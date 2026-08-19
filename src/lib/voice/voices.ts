export type VoicePreset = {
  id: string;
  name: string;
  vibe: string;
  gender: "female" | "male";
};

/** Youthful, natural-sounding human voices from the ElevenLabs library. */
export const voicePresets: VoicePreset[] = [
  { id: "EXAVITQu4vr4xnSDxMaL", name: "Sarah", vibe: "Warm young woman", gender: "female" },
  { id: "FGY2WhTYpPnrIDTdsKH5", name: "Laura", vibe: "Bright and upbeat", gender: "female" },
  { id: "Xb7hH8MSUJpSbSDYk0k2", name: "Alice", vibe: "Clear and confident", gender: "female" },
  { id: "pFZP5JQG7iQjIQuC4Bku", name: "Lily", vibe: "Soft and youthful", gender: "female" },
  { id: "IKne3meq5aSn9XLyUdCD", name: "Charlie", vibe: "Casual young man", gender: "male" },
  { id: "TX3LPaxmHKxFdv7VOQHJ", name: "Liam", vibe: "Energetic young man", gender: "male" },
  { id: "SAz9YHcvj6GT2YYXdXww", name: "River", vibe: "Calm and easy", gender: "male" },
  { id: "cjVigY5qzO86Huf0OWal", name: "Eric", vibe: "Friendly and steady", gender: "male" },
];

export const defaultSampleLine =
  "Hey, I'm right here — touch the screen and I'll react in my own voice.";
