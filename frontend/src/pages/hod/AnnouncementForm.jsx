import { useEffect, useState } from "react";
import apiClient from "../../api/client";

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
      <div className="mb-6 border-b border-brass/20 pb-4">
        <h1 className="font-display text-2xl font-semibold text-ink">
          Department Announcements
        </h1>
        <p className="mt-1 text-xs uppercase tracking-wide text-slate">
          Broadcast official announcements to department students and faculty
        </p>
      </div>

      {/* New Announcement Form */}
      <div className="max-w-xl mb-10">
        <div className="mb-4 border-b border-brass/40 pb-1">
          <span className="font-display text-xs uppercase tracking-widest text-brass">
            New Broadcast
          </span>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-slate">
              Announcement Message
            </span>
            <textarea
              rows={4}
              maxLength={2000}
              required
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Enter announcement text..."
              className="border border-brass/30 bg-transparent p-3 text-sm text-ink outline-none focus:border-oxblood rounded-[3px]"
            />
            <span className="text-right text-[11px] text-slate font-mono">
              {message.length} / 2000
            </span>
          </label>

          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-slate">
              Target Audience
            </span>
            <div className="flex flex-col gap-2.5">
              {AUDIENCE_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className="flex items-start gap-3 cursor-pointer select-none"
                >
                  <input
                    type="radio"
                    name="audience"
                    value={opt.value}
                    checked={audience === opt.value}
                    onChange={(e) => setAudience(e.target.value)}
                    className="mt-0.5 accent-oxblood cursor-pointer"
                  />
                  <div>
                    <span className="text-sm font-medium text-ink block">
                      {opt.label}
                    </span>
                    <span className="text-xs text-slate">{opt.desc}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting || !message.trim()}
            className="w-fit rounded bg-oxblood px-5 py-2.5 text-sm font-medium text-paper transition-opacity hover:opacity-90 disabled:opacity-50 mt-2"
          >
            {submitting ? "Broadcasting…" : "Broadcast Announcement"}
          </button>

          {feedback && (
            <p
              className={`text-xs mt-1 ${
                feedback.tone === "success" ? "text-slate" : "text-oxblood"
              }`}
            >
              {feedback.text}
            </p>
          )}
        </form>
      </div>

      {/* Broadcast History */}
      <div className="max-w-3xl">
        <div className="mb-2 border-b border-brass/40 pb-1 flex items-center justify-between">
          <span className="font-display text-xs uppercase tracking-widest text-brass">
            Broadcast History
          </span>
        </div>

        {loadingHistory ? (
          <p className="py-3 text-sm text-slate">Loading history…</p>
        ) : announcements.length === 0 ? (
          <p className="py-3 text-sm text-slate">
            No announcements sent yet from your department.
          </p>
        ) : (
          <div className="flex flex-col">
            {announcements.map((item) => (
              <div
                key={item.id}
                className="border-b border-brass/10 py-3.5 flex flex-col gap-1.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs uppercase font-medium text-oxblood bg-card px-2 py-0.5 border border-brass/20 rounded-[3px]">
                      {item.audience}
                    </span>
                    <span className="text-xs text-slate">
                      By {item.authorName}
                    </span>
                  </div>
                  <span className="font-mono text-xs text-slate">
                    {dateFormatter.format(new Date(item.createdAt))}
                  </span>
                </div>
                <p className="text-sm text-ink whitespace-pre-wrap">
                  {item.message}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
