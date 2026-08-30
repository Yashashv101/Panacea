import { useEffect, useState } from "react";
import apiClient from "../api/client";
import StatusStamp from "../components/StatusStamp.jsx";
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
      <div className="mb-6 border-b border-brass/20 pb-4">
        <h1 className="font-display text-2xl font-semibold text-ink">Feedback</h1>
      </div>

      <form onSubmit={handleSubmit} className="mb-8 flex max-w-xl flex-col gap-4 border-b border-brass/20 pb-8">
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
          <p className={`text-sm ${message.tone === "success" ? "text-slate" : "text-oxblood"}`}>{message.text}</p>
        )}
      </form>

      <h2 className="mb-4 font-display text-lg font-semibold text-ink">My Feedback</h2>

      {loading ? (
        <p className="text-sm text-slate">Loading…</p>
      ) : loadError ? (
        <p className="text-sm text-oxblood">{loadError}</p>
      ) : items.length === 0 ? (
        <p className="border-b border-brass/20 py-3 text-sm text-slate">You haven't submitted any feedback.</p>
      ) : (
        <div className="flex flex-col">
          {items.map((item) => (
            <div key={item.id} className="border-b border-brass/20 py-4">
              <div className="flex items-center gap-4">
                <StatusStamp status={item.status} />
              </div>
              <p className="mt-1 max-w-2xl text-sm text-slate">{item.message}</p>
              {item.reply && (
                <p className="mt-3 max-w-2xl border-l-2 border-brass/30 pl-3 text-sm text-slate">{item.reply}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
