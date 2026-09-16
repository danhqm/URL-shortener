import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type LinkSummary } from "../lib/api";

const shortBaseUrl =
  import.meta.env.VITE_SHORT_BASE_URL ?? "http://localhost:4000";

export function LinksTable({ links }: { links: LinkSummary[] }) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.updateLink(id, { isActive }),
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: ["links"] }),
  });

  async function copy(code: string) {
    await navigator.clipboard.writeText(`${shortBaseUrl}/${code}`);
  }

  return (
    <section className="panel links-panel">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">LIBRARY</span>
          <h2>Your links</h2>
        </div>
        <span className="count-badge">{links.length}</span>
      </div>
      {links.length === 0 ? (
        <div className="empty-state">Your first link will appear here.</div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Link</th>
                <th>Clicks</th>
                <th>Status</th>
                <th>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {links.map((link) => (
                <tr key={link.id}>
                  <td>
                    <strong>{link.title || link.short_code}</strong>
                    <span className="destination">{link.original_url}</span>
                  </td>
                  <td className="click-count">
                    {Number(link.total_clicks).toLocaleString()}
                  </td>
                  <td>
                    <span
                      className={
                        link.is_active ? "status active" : "status paused"
                      }
                    >
                      {link.is_active ? "Active" : "Paused"}
                    </span>
                  </td>
                  <td className="actions">
                    <button
                      className="secondary-button"
                      onClick={() => copy(link.short_code)}
                    >
                      Copy
                    </button>
                    <button
                      className="secondary-button"
                      onClick={() =>
                        mutation.mutate({
                          id: link.id,
                          isActive: !link.is_active,
                        })
                      }
                    >
                      {link.is_active ? "Pause" : "Resume"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
