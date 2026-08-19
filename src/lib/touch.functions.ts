import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { decideTouchResponse, touchRequestSchema } from "./touch.server";

export const reactToTouch = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => touchRequestSchema.parse(data))
  .handler(async ({ data }) => decideTouchResponse(data));

export type ReactToTouchInput = z.infer<typeof touchRequestSchema>;
