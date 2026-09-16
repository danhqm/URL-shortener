import { customAlphabet } from "nanoid";
import { Router } from "express";
import { z } from "zod";
import type { AppConfig } from "../config.js";
import type { SupabaseAdmin } from "../lib/supabase.js";
import type { RedisClient } from "../lib/redis.js";
import type { AuthenticatedRequest } from "../middleware/auth.js";

const createCode = customAlphabet(
  "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ",
  7,
);

const httpUrl = z
  .string()
  .url()
  .max(2048)
  .refine((value) => ["http:", "https:"].includes(new URL(value).protocol), {
    message: "Only HTTP and HTTPS URLs are supported",
  });

const createLinkSchema = z.object({
  originalUrl: httpUrl,
  customCode: z
    .string()
    .trim()
    .min(4)
    .max(32)
    .regex(/^[a-zA-Z0-9_-]+$/)
    .optional(),
  title: z.string().trim().max(100).optional(),
});

const updateLinkSchema = z
  .object({
    originalUrl: httpUrl.optional(),
    title: z.string().trim().max(100).nullable().optional(),
    isActive: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, "No changes supplied");

export function createLinksRouter(
  config: AppConfig,
  supabase: SupabaseAdmin,
  redis: RedisClient,
) {
  const router = Router();

  router.get("/", async (request, response, next) => {
    try {
      const { user } = request as unknown as AuthenticatedRequest;
      const { data, error } = await supabase
        .from("link_analytics")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      response.json({ links: data ?? [] });
    } catch (error) {
      next(error);
    }
  });

  router.post("/", async (request, response, next) => {
    try {
      const input = createLinkSchema.parse(request.body);
      const { user } = request as unknown as AuthenticatedRequest;
      const shortCode = input.customCode || createCode();

      const { data, error } = await supabase
        .from("links")
        .insert({
          user_id: user.id,
          original_url: input.originalUrl,
          short_code: shortCode,
          title: input.title || null,
        })
        .select("id, original_url, short_code, title, is_active, created_at")
        .single();

      if (error?.code === "23505") {
        response
          .status(409)
          .json({ error: "That short code is already in use" });
        return;
      }
      if (error) throw error;

      if (redis.isReady) {
        await redis.set(
          `link:${shortCode}`,
          JSON.stringify({ id: data.id, destination: input.originalUrl }),
          { EX: 3600 },
        );
      }

      response.status(201).json({
        link: data,
        shortUrl: `${config.SHORT_BASE_URL}/${shortCode}`,
      });
    } catch (error) {
      next(error);
    }
  });

  router.patch("/:id", async (request, response, next) => {
    try {
      const input = updateLinkSchema.parse(request.body);
      const { user } = request as unknown as AuthenticatedRequest;
      const changes = {
        ...(input.originalUrl !== undefined && {
          original_url: input.originalUrl,
        }),
        ...(input.title !== undefined && { title: input.title }),
        ...(input.isActive !== undefined && { is_active: input.isActive }),
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from("links")
        .update(changes)
        .eq("id", request.params.id)
        .eq("user_id", user.id)
        .select("id, original_url, short_code, title, is_active, created_at")
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        response.status(404).json({ error: "Link not found" });
        return;
      }

      if (redis.isReady) await redis.del(`link:${data.short_code}`);
      response.json({ link: data });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
