import { useEffect, useState } from "react";
import apiClient from "../api/client";
import StatusBadge from "../components/StatusBadge";
import Card from "../components/Card";
import { inputClass, labelClass, primaryButtonClass, extractErrorMessage } from "./admin/academic/formStyles";

export default function FeedbackForm() {
  const [messageText, setMessageText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  async function load() {
    try {
      const { data } = await apiClient.get("/feedback/me");
      setItems(data);
      setLoadError(null);
    } catch {
      setLoadError("Could not load your feedback.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage(null);
    setSubmitting(true);
    try {
      await apiClient.post("/feedback", { message: messageText });
      setMessageText("");
      setMessage({ tone: "success", text: "Feedback submitted." });
      await load();
    } catch (err) {
      setMessage({ tone: "error", text: extractErrorMessage(err, "Could not submit the feedback.") });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-semibold text-ink">Feedback</h1>
      </div>

      <Card title="New feedback" className="mb-6">
        <form onSubmit={handleSubmit} className="flex max-w-xl flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>Message</span>
            <textarea
              rows={3}
              required
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              className={inputClass}
            />
          </label>
          <button type="submit" disabled={submitting} className={primaryButtonClass}>
            {submitting ? "Submitting…" : "Submit feedback"}
          </button>
          {message && (
            <p className={`text-sm ${message.tone === "success" ? "text-ink-secondary" : "text-danger"}`}>
              {message.text}
            </p>
          )}
        </form>
      </Card>

      <Card title="My Feedback">
        {loading ? (
          <p className="text-sm text-ink-secondary">Loading…</p>
        ) : loadError ? (
          <p className="text-sm text-danger">{loadError}</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-ink-secondary">You haven't submitted any feedback.</p>
        ) : (
          <div className="flex flex-col divide-y divide-border">
            {items.map((item) => (
              <div key={item.id} className="py-4 first:pt-0 last:pb-0">
                <div className="flex items-center gap-4">
                  <StatusBadge status={item.status} />
                </div>
                <p className="mt-1 max-w-2xl text-sm text-ink-secondary">{item.message}</p>
                {item.reply && (
                  <p className="mt-3 max-w-2xl rounded-md bg-surface-alt px-3 py-2 text-sm text-ink-secondary">
                    {item.reply}
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
