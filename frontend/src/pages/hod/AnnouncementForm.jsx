import { useEffect, useState } from "react";
import apiClient from "../../api/client";
import Card from "../../components/Card";
import StatusBadge from "../../components/StatusBadge";
import { inputClass, labelClass, primaryButtonClass } from "../admin/academic/formStyles";

const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const AUDIENCE_OPTIONS = [
  { value: "EVERYONE", label: "Department (Students & Faculty)", desc: "Broadcast to all students and faculty in your department" },
  { value: "STUDENTS", label: "Students only", desc: "Sent exclusively to enrolled students in your department" },
  { value: "STAFF", label: "Faculty only", desc: "Sent exclusively to faculty assigned to your department" },
];

export default function AnnouncementForm() {
  const [message, setMessage] = useState("");
  const [audience, setAudience] = useState("EVERYONE");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const [announcements, setAnnouncements] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  async function loadHistory() {
    try {
      const { data } = await apiClient.get("/announcements");
      setAnnouncements(data);
    } catch {
      // Non-fatal if history cannot be loaded
    } finally {
      setLoadingHistory(false);
    }
  }

  useEffect(() => {
    loadHistory();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!message.trim()) return;

    setSubmitting(true);
    setFeedback(null);

    try {
      const { data } = await apiClient.post("/announcements", {
        message: message.trim(),
        audience,
      });

      setFeedback({
        tone: "success",
        text: `Announcement broadcast successfully to ${data.recipientCount} recipient(s).`,
      });
      setMessage("");
      loadHistory();
    } catch (err) {
      setFeedback({
        tone: "error",
        text: err.response?.data?.message || "Could not broadcast announcement.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-semibold text-ink">Department Announcements</h1>
        <p className="mt-1 text-sm text-ink-secondary">
          Broadcast official announcements to department students and faculty
        </p>
      </div>

      <div className="flex flex-col gap-6">
        <Card title="New Broadcast">
          <form onSubmit={handleSubmit} className="flex max-w-xl flex-col gap-5">
            <label className="flex flex-col gap-1.5">
              <span className={labelClass}>Announcement Message</span>
              <textarea
                rows={4}
                maxLength={2000}
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Enter announcement text..."
                className={inputClass}
              />
              <span className="text-right font-mono text-[11px] text-ink-muted">{message.length} / 2000</span>
            </label>

            <div className="flex flex-col gap-2">
              <span className={labelClass}>Target Audience</span>
              <div className="flex flex-col gap-2.5">
                {AUDIENCE_OPTIONS.map((opt) => (
                  <label key={opt.value} className="flex cursor-pointer select-none items-start gap-3">
                    <input
                      type="radio"
                      name="audience"
                      value={opt.value}
                      checked={audience === opt.value}
                      onChange={(e) => setAudience(e.target.value)}
                      className="mt-0.5 cursor-pointer accent-accent"
                    />
                    <div>
                      <span className="block text-sm font-medium text-ink">{opt.label}</span>
                      <span className="text-xs text-ink-muted">{opt.desc}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <button type="submit" disabled={submitting || !message.trim()} className={`${primaryButtonClass} mt-1 w-fit`}>
              {submitting ? "Broadcasting…" : "Broadcast Announcement"}
            </button>

            {feedback && (
              <p className={`text-xs ${feedback.tone === "success" ? "text-ink-secondary" : "text-danger"}`}>
                {feedback.text}
              </p>
            )}
          </form>
        </Card>

        <Card title="Broadcast History">
          {loadingHistory ? (
            <p className="text-sm text-ink-secondary">Loading history…</p>
          ) : announcements.length === 0 ? (
            <p className="text-sm text-ink-secondary">No announcements sent yet from your department.</p>
          ) : (
            <div className="flex flex-col divide-y divide-border">
              {announcements.map((item) => (
                <div key={item.id} className="flex flex-col gap-1.5 py-3.5 first:pt-0 last:pb-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <StatusBadge status={item.audience} variant="neutral" />
                      <span className="text-xs text-ink-muted">By {item.authorName}</span>
                    </div>
                    <span className="font-mono text-xs text-ink-muted">
                      {dateFormatter.format(new Date(item.createdAt))}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap text-sm text-ink">{item.message}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
