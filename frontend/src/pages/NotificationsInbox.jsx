import { useEffect, useState } from "react";
import apiClient from "../api/client";

const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

const FILTERS = [
  { id: "ALL", label: "All" },
  { id: "ANNOUNCEMENT", label: "Announcements" },
  { id: "GENERAL", label: "General Alerts" },
];

export default function NotificationsInbox() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [activeFilter, setActiveFilter] = useState("ALL");

  useEffect(() => {
    let cancelled = false;

    apiClient
      .get("/notifications/me")
      .then((res) => {
        if (!cancelled) setNotifications(res.data);
      })
      .catch(() => {
        if (!cancelled) setLoadError("Could not load notifications.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const visibleNotifications = notifications.filter((n) => {
    if (activeFilter === "ALL") return true;
    if (activeFilter === "ANNOUNCEMENT") return n.type === "ANNOUNCEMENT";
    return n.type !== "ANNOUNCEMENT";
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between border-b border-brass/20 pb-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">
            Notifications & Announcements
          </h1>
          <p className="mt-1 text-xs uppercase tracking-wide text-slate">
            Inbox for system alerts and department broadcasts
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setActiveFilter(f.id)}
              className={`rounded px-3 py-1.5 text-xs font-medium uppercase tracking-wide transition-colors ${
                activeFilter === f.id
                  ? "bg-card text-oxblood font-semibold border border-brass/30"
                  : "text-slate hover:text-ink"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-slate">Loading…</p>
      ) : loadError ? (
        <p className="text-sm text-oxblood">{loadError}</p>
      ) : visibleNotifications.length === 0 ? (
        <p className="border-b border-brass/20 py-3 text-sm text-slate">
          {activeFilter === "ANNOUNCEMENT"
            ? "No department announcements received yet."
            : "No notifications yet."}
        </p>
      ) : (
        <div className="flex flex-col">
          {visibleNotifications.map((notification) => {
            const isAnnouncement = notification.type === "ANNOUNCEMENT";
            return (
              <div
                key={notification.id}
                className={`flex items-center justify-between border-b border-brass/20 py-3.5 px-2 -mx-2 transition-colors ${
                  isAnnouncement ? "bg-card/40" : ""
                }`}
              >
                <div className="flex items-start gap-3 min-w-0 pr-4">
                  {isAnnouncement && (
                    <span className="shrink-0 font-mono text-[10px] uppercase font-semibold text-oxblood bg-card px-2 py-0.5 border border-oxblood/30 rounded-[3px]">
                      Announcement
                    </span>
                  )}
                  <span className="text-sm text-ink break-words">
                    {notification.message}
                  </span>
                </div>
                <span className="shrink-0 pl-4 font-mono text-xs text-slate">
                  {dateFormatter.format(new Date(notification.createdAt))}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
