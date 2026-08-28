import { useEffect, useState } from "react";
import apiClient from "../../api/client";
import StatusStamp from "../../components/StatusStamp";

const STATUS_FILTERS = ["OPEN", "RESOLVED", "ALL"];

const inputClass =
  "w-full border-0 border-b border-brass/40 bg-transparent px-0 py-2 text-sm text-ink outline-none focus:border-oxblood";
const actionClass = "text-xs font-medium uppercase tracking-wide text-slate hover:text-oxblood disabled:opacity-50";

export default function FeedbackQueue() {
  const [statusFilter, setStatusFilter] = useState("OPEN");
  const [items, setItems] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setLoadError(null);
      try {
        const { data } = await apiClient.get("/feedback", {
          params: statusFilter === "ALL" ? {} : { status: statusFilter },
        });
        if (cancelled) return;
        setItems(data);
        setDrafts(Object.fromEntries(data.map((item) => [item.id, item.reply ?? ""])));
      } catch {
        if (!cancelled) setLoadError("Could not load feedback.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [statusFilter]);

  function updateDraft(id, value) {
    setDrafts((prev) => ({ ...prev, [id]: value }));
  }

  async function handleReply(id) {
    setMessage(null);
    setBusyId(id);
    try {
      const { data } = await apiClient.post(`/feedback/${id}/reply`, { reply: drafts[id] ?? "" });
      setItems((prev) => prev.map((item) => (item.id === id ? data : item)));
      setMessage({ tone: "success", text: "Reply sent." });
    } catch (err) {
      setMessage({ tone: "error", text: err.response?.data?.message ?? "Could not send the reply." });
    } finally {
      setBusyId(null);
    }
  }

  async function handleResolve(id) {
    setMessage(null);
    setBusyId(id);
    try {
      const { data } = await apiClient.post(`/feedback/${id}/resolve`);
      if (statusFilter === "ALL") {
        setItems((prev) => prev.map((item) => (item.id === id ? data : item)));
      } else {
        setItems((prev) => prev.filter((item) => item.id !== id));
      }
      setMessage({ tone: "success", text: "Feedback marked resolved." });
    } catch (err) {
      setMessage({ tone: "error", text: err.response?.data?.message ?? "Could not resolve the feedback." });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between border-b border-brass/20 pb-4">
        <h1 className="font-display text-2xl font-semibold text-ink">Feedback</h1>
        <div className="flex items-center gap-1">
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setStatusFilter(filter)}
              className={`rounded px-3 py-1.5 text-xs font-medium uppercase tracking-wide transition-colors ${
                statusFilter === filter ? "bg-card text-oxblood" : "text-slate hover:text-ink"
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {message && (
        <p className={`mb-4 text-sm ${message.tone === "success" ? "text-slate" : "text-oxblood"}`}>{message.text}</p>
      )}

      {loading ? (
        <p className="text-sm text-slate">Loading…</p>
      ) : loadError ? (
        <p className="text-sm text-oxblood">{loadError}</p>
      ) : items.length === 0 ? (
        <p className="border-b border-brass/20 py-3 text-sm text-slate">No feedback.</p>
      ) : (
        <div className="flex flex-col">
          {items.map((item) => (
            <div key={item.id} className="border-b border-brass/20 py-4">
              <div className="flex items-center gap-4">
                <span className="text-sm text-ink">{item.submitterName}</span>
                <StatusStamp status={item.status} />
              </div>
              <p className="mt-1 max-w-2xl text-sm text-slate">{item.message}</p>

              {item.status === "OPEN" ? (
                <div className="mt-3 flex max-w-2xl flex-col gap-2">
                  <textarea
                    rows={2}
                    value={drafts[item.id] ?? ""}
                    onChange={(e) => updateDraft(item.id, e.target.value)}
                    placeholder="Write a reply…"
                    className={inputClass}
                  />
                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      disabled={busyId === item.id || !(drafts[item.id] ?? "").trim()}
                      onClick={() => handleReply(item.id)}
                      className={actionClass}
                    >
                      Send reply
                    </button>
                    <button
                      type="button"
                      disabled={busyId === item.id}
                      onClick={() => handleResolve(item.id)}
                      className={actionClass}
                    >
                      Mark resolved
                    </button>
                  </div>
                </div>
              ) : (
                <p className="mt-3 max-w-2xl border-l-2 border-brass/30 pl-3 text-sm text-slate">
                  {item.reply || "No reply was recorded."}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
