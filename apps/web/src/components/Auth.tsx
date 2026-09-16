import { useState, type FormEvent } from "react";
import { supabase } from "../lib/supabase";

export function Auth() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    setLoading(false);
    setMessage(
      error ? error.message : "Check your email for the sign-in link.",
    );
  }

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <span className="eyebrow">SHORTSTACK</span>
        <h1>Links with a memory.</h1>
        <p>
          Create short links, study every redirect, and see caching work in real
          time.
        </p>
        <form onSubmit={submit}>
          <label htmlFor="email">Email address</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            required
          />
          <button disabled={loading}>
            {loading ? "Sending…" : "Send magic link"}
          </button>
        </form>
        {message && <p className="form-message">{message}</p>}
      </section>
    </main>
  );
}
