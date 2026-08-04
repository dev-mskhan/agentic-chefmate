import { z } from "zod";

export const googleCallbackQuerySchema = z.object({
  code: z.string().min(1, "code is required"),
  state: z.string().optional(),
});

export const revokeSessionInputSchema = z.object({
  sessionId: z.string().min(1, "sessionId is required"),
});
