import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import type { SupabaseAuth } from "../lib/supabase.js";
import { type AuthenticatedRequest, requireAuth } from "./auth.js";

function createAuthApp(getUser: ReturnType<typeof vi.fn>) {
  const app = express();
  const supabase = { auth: { getUser } } as unknown as SupabaseAuth;

  app.get("/", requireAuth(supabase), (request, response) => {
    response.json({ userId: (request as AuthenticatedRequest).user.id });
  });

  return app;
}

describe("requireAuth", () => {
  it("accepts a valid user access token", async () => {
    const getUser = vi.fn().mockResolvedValue({
      data: { user: { id: "user-123" } },
      error: null,
    });
    const response = await request(createAuthApp(getUser))
      .get("/")
      .set("Authorization", "Bearer valid-token");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ userId: "user-123" });
    expect(getUser).toHaveBeenCalledWith("valid-token");
  });

  it("rejects an invalid user access token", async () => {
    const getUser = vi.fn().mockResolvedValue({
      data: { user: null },
      error: new Error("Invalid JWT"),
    });
    const response = await request(createAuthApp(getUser))
      .get("/")
      .set("Authorization", "Bearer invalid-token");

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: "Invalid or expired session" });
  });

  it("requires an access token", async () => {
    const getUser = vi.fn();
    const response = await request(createAuthApp(getUser)).get("/");

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: "Authentication required" });
    expect(getUser).not.toHaveBeenCalled();
  });
});
