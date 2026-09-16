import { createClient } from "redis";
import type { AppConfig } from "../config.js";

export function createRedisClient(config: AppConfig) {
  const client = createClient({
    url: config.REDIS_URL,
    socket: {
      connectTimeout: 2_000,
      reconnectStrategy: false,
    },
  });
  client.on("error", (error) => {
    console.error("Redis error", error);
  });
  return client;
}

export type RedisClient = ReturnType<typeof createRedisClient>;

export async function connectRedis(client: RedisClient) {
  if (client.isOpen) return true;

  try {
    await client.connect();
    return true;
  } catch (error) {
    console.warn("Redis unavailable; continuing with database lookups", error);
    return false;
  }
}
