import { useEffect, useState } from "react";
import apiClient from "../api/client";
import Card from "../components/Card";
import { Megaphone } from "lucide-react";

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
      <div className="mb-6">
        <h1 className="font-display text-2xl font-semibold text-ink">Notifications & Announcements</h1>
        <p className="mt-1 text-xs text-ink-muted">Inbox for system alerts and department broadcasts</p>
      </div>

      <Card
        action={
          <div className="flex items-center gap-1">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setActiveFilter(f.id)}
                className={`rounded px-3 py-1.5 text-xs font-medium transition-colors duration-150 ease-out ${
                  activeFilter === f.id ? "bg-accent-soft text-accent" : "text-ink-secondary hover:text-ink"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        }
      >
        {loading ? (
          <p className="text-sm text-ink-secondary">Loading…</p>
        ) : loadError ? (
          <p className="text-sm text-danger">{loadError}</p>
        ) : visibleNotifications.length === 0 ? (
          <p className="text-sm text-ink-secondary">
            {activeFilter === "ANNOUNCEMENT"
              ? "No department announcements received yet."
              : "No notifications yet."}
          </p>
        ) : (
          <div className="flex flex-col divide-y divide-border">
            {visibleNotifications.map((notification) => {
              const isAnnouncement = notification.type === "ANNOUNCEMENT";
              return (
                <div
                  key={notification.id}
                  className={`flex items-center justify-between gap-4 py-3.5 first:pt-0 last:pb-0 ${
                    isAnnouncement ? "rounded-md bg-accent-soft/40 px-3 -mx-3" : ""
                  }`}
                >
                  <div className="flex min-w-0 items-start gap-3 pr-4">
                    {isAnnouncement && (
                      <span className="mt-0.5 inline-flex shrink-0 items-center gap-1 rounded-md bg-accent-soft px-2 py-0.5 font-mono text-[10px] font-semibold uppercase text-accent">
                        <Megaphone className="h-3 w-3" aria-hidden="true" />
                        Announcement
                      </span>
                    )}
                    <span className="break-words text-sm text-ink">{notification.message}</span>
                  </div>
                  <span className="shrink-0 pl-4 font-mono text-xs text-ink-muted">
                    {dateFormatter.format(new Date(notification.createdAt))}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
