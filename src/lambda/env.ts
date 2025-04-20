import { z } from "zod";

const envSchema = z.object({
  TELEGRAM_BOT_TOKEN: z.string().describe("Telegram bot token"),
  AUTH_DISABLED: z
    .string()
    .transform((val) => val.toLowerCase() === "true")
    .default("false")
    .describe("Whether authentication is disabled"),
  APP_PASSWORDS: z
    .string()
    .transform((val) => JSON.parse(val))
    .pipe(
      z.array(
        z.object({
          name: z.string(),
          password: z.string(),
        }),
      ),
    )
    .describe("App passwords"),
  CACHE_DRIVER: z
    .enum(["memory", "redis"])
    .default("memory")
    .describe("Cache driver"),
  REDIS_HOST: z.string().default("localhost").optional().describe("Redis host"),
  REDIS_PORT: z
    .string()
    .default("6379")
    .transform(Number)
    .optional()
    .describe("Redis port"),
  REDIS_PASSWORD: z.string().optional().describe("Redis password"),
  REDIS_USERNAME: z.string().optional().describe("Redis username"),
  REDIS_DB: z
    .string()
    .default("0")
    .transform(Number)
    .optional()
    .describe("Redis database"),
  ENV: z
    .enum(["development", "staging", "production"])
    .default("development")
    .describe("Environment"),
  ...(process.env.NODE_ENV === "development" && {
    NGROK_AUTHTOKEN: z
      .string()
      .optional()
      .describe("NGROK auth token if you are running on Http local server"),
  }),
});

export const env = envSchema.parse(process.env);
