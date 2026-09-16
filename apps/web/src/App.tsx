import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import { AnalyticsChart } from "./components/AnalyticsChart";
import { Auth } from "./components/Auth";
import { CreateLinkForm } from "./components/CreateLinkForm";
import { LinksTable } from "./components/LinksTable";
import { api } from "./lib/api";
import { supabase } from "./lib/supabase";

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setAuthReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const links = useQuery({
    queryKey: ["links"],
    queryFn: api.getLinks,
    enabled: Boolean(session),
  });
  const overview = useQuery({
    queryKey: ["overview"],
    queryFn: api.getOverview,
    enabled: Boolean(session),
    refetchInterval: 30_000,
  });

  if (!authReady)
    return <main className="loading-screen">Loading Shortstack…</main>;
  if (!session) return <Auth />;

  return (
    <div className="app-shell">
      <header>
        <a className="brand" href="/">
          <span>S</span> Shortstack
        </a>
        <div className="account">
          <span>{session.user.email}</span>
          <button
            className="secondary-button"
            onClick={() => supabase.auth.signOut()}
          >
            Sign out
          </button>
        </div>
      </header>
      <main className="dashboard">
        <section className="intro">
          <span className="eyebrow">DASHBOARD</span>
          <h1>Every click tells a story.</h1>
          <p>
            Build short links and watch the cache, database, and analytics
            pipeline work together.
          </p>
        </section>
        <div className="dashboard-grid">
          <CreateLinkForm />
          <AnalyticsChart data={overview.data} />
        </div>
        {links.error ? (
          <section className="panel error-message">
            {links.error.message}
          </section>
        ) : (
          <LinksTable links={links.data?.links ?? []} />
        )}
      </main>
    </div>
  );
}
