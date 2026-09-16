import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";

export function CreateLinkForm() {
  const queryClient = useQueryClient();
  const [originalUrl, setOriginalUrl] = useState("");
  const [customCode, setCustomCode] = useState("");
  const [title, setTitle] = useState("");
  const mutation = useMutation({
    mutationFn: api.createLink,
    onSuccess: () => {
      setOriginalUrl("");
      setCustomCode("");
      setTitle("");
      void queryClient.invalidateQueries({ queryKey: ["links"] });
      void queryClient.invalidateQueries({ queryKey: ["overview"] });
    },
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    mutation.mutate({
      originalUrl,
      ...(customCode && { customCode }),
      ...(title && { title }),
    });
  }

  return (
    <section className="panel create-panel">
      <div>
        <span className="eyebrow">NEW LINK</span>
        <h2>Turn a long URL into a signal.</h2>
      </div>
      <form className="create-form" onSubmit={submit}>
        <label htmlFor="url">Destination URL</label>
        <input
          id="url"
          type="url"
          value={originalUrl}
          onChange={(event) => setOriginalUrl(event.target.value)}
          placeholder="https://example.com/a/very/long/path"
          required
        />
        <div className="form-row">
          <div>
            <label htmlFor="title">Label</label>
            <input
              id="title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Launch page"
            />
          </div>
          <div>
            <label htmlFor="code">Custom code</label>
            <input
              id="code"
              value={customCode}
              onChange={(event) => setCustomCode(event.target.value)}
              placeholder="launch-26"
              pattern="[a-zA-Z0-9_-]{4,32}"
            />
          </div>
        </div>
        <button disabled={mutation.isPending}>
          {mutation.isPending ? "Creating…" : "Create short link"}
        </button>
        {mutation.error && (
          <p className="error-message">{mutation.error.message}</p>
        )}
      </form>
    </section>
  );
}
