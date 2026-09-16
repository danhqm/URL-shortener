import { Router } from "express";
import type { SupabaseAdmin } from "../lib/supabase.js";
import type { AuthenticatedRequest } from "../middleware/auth.js";

export function createAnalyticsRouter(supabase: SupabaseAdmin) {
  const router = Router();

  router.get("/overview", async (request, response, next) => {
    try {
      const { user } = request as unknown as AuthenticatedRequest;
      const since = new Date();
      since.setUTCDate(since.getUTCDate() - 29);

      const [
        { data: daily, error: dailyError },
        { data: links, error: linksError },
      ] = await Promise.all([
        supabase
          .from("daily_click_analytics")
          .select("click_date, clicks")
          .eq("user_id", user.id)
          .gte("click_date", since.toISOString().slice(0, 10))
          .order("click_date"),
        supabase
          .from("link_analytics")
          .select("id, short_code, title, total_clicks")
          .eq("user_id", user.id)
          .order("total_clicks", { ascending: false })
          .limit(5),
      ]);

      if (dailyError) throw dailyError;
      if (linksError) throw linksError;

      const byDate = new Map<string, number>();
      for (const row of daily ?? []) {
        byDate.set(
          row.click_date,
          (byDate.get(row.click_date) ?? 0) + Number(row.clicks),
        );
      }

      const series = Array.from({ length: 30 }, (_, index) => {
        const date = new Date(since);
        date.setUTCDate(since.getUTCDate() + index);
        const key = date.toISOString().slice(0, 10);
        return { date: key, clicks: byDate.get(key) ?? 0 };
      });

      response.json({ series, topLinks: links ?? [] });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
