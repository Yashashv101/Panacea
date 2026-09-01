import { useEffect, useState } from "react";
import apiClient from "../../api/client";
import StatusBadge from "../../components/StatusBadge";
import Card from "../../components/Card";
import { inputClass, rowActionClass } from "./academic/formStyles";
import { useAuth } from "../../context/AuthContext";
import { MessageSquareOff } from "lucide-react";

const STATUS_FILTERS = ["OPEN", "RESOLVED", "ALL"];

export default function FeedbackQueue() {
  const { role } = useAuth();
  // ADMIN and HOD can both reply/resolve server-side now (FeedbackController).
  // No per-item department check is needed here — see LeaveQueue.jsx's
  // comment: GET /feedback is already HOD-scoped, so every row an HOD sees
  // already belongs to their own department.
  const canRespond = role === "ADMIN" || role === "HOD";
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
      <div className="mb-6">
        <h1 className="font-display text-2xl font-semibold text-ink">Feedback</h1>
      </div>

      <Card
        title="Submissions"
        action={
          <div className="flex items-center gap-1">
            {STATUS_FILTERS.map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setStatusFilter(filter)}
                className={`rounded px-3 py-1.5 text-xs font-medium transition-colors duration-150 ease-out ${
                  statusFilter === filter ? "bg-accent-soft text-accent" : "text-ink-secondary hover:text-ink"
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        }
      >
        {message && (
          <p className={`mb-4 text-sm ${message.tone === "success" ? "text-ink-secondary" : "text-danger"}`}>
            {message.text}
          </p>
        )}

        {loading ? (
          <p className="text-sm text-ink-secondary">Loading…</p>
        ) : loadError ? (
          <p className="text-sm text-danger">{loadError}</p>
        ) : items.length === 0 ? (
          <p className="flex items-center gap-2 py-4 text-sm text-ink-secondary">
            <MessageSquareOff className="h-4 w-4" aria-hidden="true" />
            No feedback.
          </p>
        ) : (
          <div className="flex flex-col divide-y divide-border">
            {items.map((item) => (
              <div key={item.id} className="py-4 first:pt-0 last:pb-0">
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium text-ink">{item.submitterName}</span>
                  <StatusBadge status={item.status} />
                </div>
                <p className="mt-1 max-w-2xl text-sm text-ink-secondary">{item.message}</p>

                {canRespond && item.status === "OPEN" ? (
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
                        className={`${rowActionClass} disabled:opacity-50`}
                      >
                        Send reply
                      </button>
                      <button
                        type="button"
                        disabled={busyId === item.id}
                        onClick={() => handleResolve(item.id)}
                        className={`${rowActionClass} disabled:opacity-50`}
                      >
                        Mark resolved
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="mt-3 max-w-2xl rounded-md bg-surface-alt px-3 py-2 text-sm text-ink-secondary">
                    {item.reply || "No reply was recorded."}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
