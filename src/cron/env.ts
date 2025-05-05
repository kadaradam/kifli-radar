import { z } from "zod";

const envSchema = z.object({
  TELEGRAM_BOT_TOKEN: z.string().describe("Telegram bot token"),
  NODE_ENV: z
    .enum(["development", "staging", "production"])
    .default("development")
    .describe("Environment"),
});

export const env = envSchema.parse(process.env);
