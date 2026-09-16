import { createApp } from "./app.js";
import { loadConfig } from "./config.js";
import { connectRedis, createRedisClient } from "./lib/redis.js";
import { createSupabaseAdmin } from "./lib/supabase.js";

const config = loadConfig();
const redis = createRedisClient(config);
await connectRedis(redis);
const supabase = createSupabaseAdmin(config);
const app = createApp({ config, supabase, redis });

const server = app.listen(config.PORT, () => {
  console.log(`API listening on http://localhost:${config.PORT}`);
});

async function shutdown() {
  server.close();
  if (redis.isOpen) await redis.quit();
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
