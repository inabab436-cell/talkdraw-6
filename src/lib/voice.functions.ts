import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getVoiceStatus, synthesize } from "./voice.server";

export const checkVoiceStatus = createServerFn({ method: "GET" }).handler(async () =>
  getVoiceStatus(),
);

export const speakLine = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        text: z.string().min(1).max(600),
        voiceId: z.string().min(1).max(64),
        mood: z.string().max(32).optional(),
        voiceTone: z.string().max(200).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => synthesize(data));
