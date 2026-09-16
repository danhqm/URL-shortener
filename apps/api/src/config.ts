import { config as loadEnv } from "dotenv";
import { z } from "zod";

loadEnv({ path: new URL("../../../.env", import.meta.url) });

const configSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  WEB_ORIGIN: z.string().url().default("http://localhost:5173"),
  SHORT_BASE_URL: z.string().url().default("http://localhost:4000"),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SECRET_KEY: z.string().min(1),
  REDIS_URL: z.string().url().default("redis://localhost:6379"),
});

export type AppConfig = z.infer<typeof configSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  return configSchema.parse(env);
}
