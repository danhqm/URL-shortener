import type { NextFunction, Request, Response } from "express";
import type { User } from "@supabase/supabase-js";
import type { SupabaseAuth } from "../lib/supabase.js";

export interface AuthenticatedRequest extends Request {
  user: User;
}

export function requireAuth(supabase: SupabaseAuth) {
  return async (request: Request, response: Response, next: NextFunction) => {
    const authorization = request.header("authorization");
    const token = authorization?.startsWith("Bearer ")
      ? authorization.slice("Bearer ".length)
      : null;

    if (!token) {
      response.status(401).json({ error: "Authentication required" });
      return;
    }

    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) {
      console.warn("Supabase session validation failed", {
        code: error?.code,
        message: error?.message,
        status: error?.status,
      });
      response.status(401).json({ error: "Invalid or expired session" });
      return;
    }

    (request as AuthenticatedRequest).user = data.user;
    next();
  };
}
