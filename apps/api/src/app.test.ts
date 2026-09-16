import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "./app.js";
import type { AppConfig } from "./config.js";
import type { RedisClient } from "./lib/redis.js";
import type { SupabaseAdmin } from "./lib/supabase.js";

const config: AppConfig = {
  NODE_ENV: "test",
  PORT: 4000,
  WEB_ORIGIN: "http://localhost:5173",
  SHORT_BASE_URL: "http://localhost:4000",
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_SECRET_KEY: "test-key",
  REDIS_URL: "redis://localhost:6379",
};

const app = createApp({
  config,
  supabase: {} as SupabaseAdmin,
  redis: { isOpen: false, isReady: false } as RedisClient,
});

describe("API shell", () => {
  it("reports health without Redis", async () => {
    const response = await request(app).get("/api/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok", redis: "unavailable" });
  });

  it("rejects malformed short codes", async () => {
    const response = await request(app).get("/abc");

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("Invalid request");
  });
});
