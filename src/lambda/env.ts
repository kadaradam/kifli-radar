import { z } from "zod";

const envSchema = z.object({
  TELEGRAM_BOT_TOKEN: z.string(),
  APP_PASSWORD: z.string(),
  ENV: z.enum(["development", "staging", "production"]).default("development"),
  ...(process.env.NODE_ENV === "development" && {
    NGROK_AUTHTOKEN: z.string().optional(),
  }),
});

export const env = envSchema.parse(process.env);
