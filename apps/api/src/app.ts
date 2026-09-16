import cors from "cors";
import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import { z } from "zod";
import type { AppConfig } from "./config.js";
import type { SupabaseAdmin } from "./lib/supabase.js";
import type { RedisClient } from "./lib/redis.js";
import { requireAuth } from "./middleware/auth.js";
import { createAnalyticsRouter } from "./routes/analytics.js";
import { createLinksRouter } from "./routes/links.js";

interface AppDependencies {
  config: AppConfig;
  supabase: SupabaseAdmin;
  redis: RedisClient;
}

export function createApp({ config, supabase, redis }: AppDependencies) {
  const app = express();
  app.set("trust proxy", 1);
  app.use(helmet());
  app.use(cors({ origin: config.WEB_ORIGIN }));
  app.use(express.json({ limit: "16kb" }));

  app.get("/api/health", (_request, response) => {
    response.json({
      status: "ok",
      redis: redis.isReady ? "connected" : "unavailable",
    });
  });

  const createLimiter = rateLimit({
    windowMs: 60_000,
    limit: 10,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    passOnStoreError: true,
    ...(redis.isOpen && {
      store: new RedisStore({
        sendCommand: (...args: string[]) => redis.sendCommand(args),
      }),
    }),
  });
  const auth = requireAuth(supabase);
  const linksRouter = createLinksRouter(config, supabase, redis);

  app.use(
    "/api/links",
    auth,
    (request, response, next) => {
      if (request.method === "POST") {
        createLimiter(request, response, next);
        return;
      }
      next();
    },
    linksRouter,
  );
  app.use("/api/analytics", auth, createAnalyticsRouter(supabase));

  app.get("/:shortCode", async (request, response, next) => {
    try {
      const code = z.string().min(4).max(32).parse(request.params.shortCode);
      const key = `link:${code}`;
      const cachedValue = redis.isReady ? await redis.get(key) : null;
      let cachedLink: { id: string; destination: string } | null = null;

      if (cachedValue) {
        try {
          cachedLink = z
            .object({ id: z.string().uuid(), destination: z.string().url() })
            .parse(JSON.parse(cachedValue));
        } catch {
          if (redis.isReady) await redis.del(key);
        }
      }

      let destination = cachedLink?.destination ?? null;
      let linkId: string | null = null;
      const cacheStatus = cachedLink ? "HIT" : "MISS";

      if (!destination) {
        const { data, error } = await supabase
          .from("links")
          .select("id, original_url")
          .eq("short_code", code)
          .eq("is_active", true)
          .maybeSingle();

        if (error) throw error;
        if (!data) {
          response.status(404).json({ error: "Short link not found" });
          return;
        }

        destination = data.original_url;
        linkId = data.id;
        if (redis.isReady) {
          await redis.set(key, JSON.stringify({ id: linkId, destination }), {
            EX: 3600,
          });
        }
      } else {
        linkId = cachedLink?.id ?? null;
      }

      if (!destination) throw new Error("Link destination is missing");

      response.set({
        "Cache-Control": "private, no-store",
        "X-Redirect-Cache": cacheStatus,
      });
      response.redirect(302, destination);

      if (linkId) {
        void supabase.from("click_events").insert({
          link_id: linkId,
          referrer: request.get("referer") || null,
          user_agent: request.get("user-agent") || null,
          country: request.get("cf-ipcountry") || null,
        });
      }
    } catch (error) {
      next(error);
    }
  });

  app.use(
    (
      error: unknown,
      _request: Request,
      response: Response,
      _next: NextFunction,
    ) => {
      if (error instanceof z.ZodError) {
        response
          .status(400)
          .json({ error: "Invalid request", issues: error.issues });
        return;
      }
      console.error(error);
      response.status(500).json({ error: "Internal server error" });
    },
  );

  return app;
}
