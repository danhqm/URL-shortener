import { supabase } from "./supabase";

const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const response = await fetch(`${apiUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(data.session && {
        Authorization: `Bearer ${data.session.access_token}`,
      }),
      ...init?.headers,
    },
  });

  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error ?? "Request failed");
  return payload as T;
}

export interface LinkSummary {
  id: string;
  short_code: string;
  original_url: string;
  title: string | null;
  is_active: boolean;
  created_at: string;
  total_clicks: number;
  last_clicked_at: string | null;
}

export interface AnalyticsOverview {
  series: Array<{ date: string; clicks: number }>;
  topLinks: Array<{
    id: string;
    short_code: string;
    title: string | null;
    total_clicks: number;
  }>;
}

export const api = {
  getLinks: () => request<{ links: LinkSummary[] }>("/api/links"),
  getOverview: () => request<AnalyticsOverview>("/api/analytics/overview"),
  createLink: (input: {
    originalUrl: string;
    customCode?: string;
    title?: string;
  }) =>
    request<{ link: LinkSummary; shortUrl: string }>("/api/links", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  updateLink: (id: string, input: { isActive: boolean }) =>
    request<{ link: LinkSummary }>(`/api/links/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
};
