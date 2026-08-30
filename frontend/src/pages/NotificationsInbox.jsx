import { useEffect, useState } from "react";
import apiClient from "../api/client";

const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export default function NotificationsInbox() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

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

  return (
    <div>
      <div className="mb-6 border-b border-brass/20 pb-4">
        <h1 className="font-display text-2xl font-semibold text-ink">Notifications</h1>
      </div>

      {loading ? (
        <p className="text-sm text-slate">Loading…</p>
      ) : loadError ? (
        <p className="text-sm text-oxblood">{loadError}</p>
      ) : notifications.length === 0 ? (
        <p className="border-b border-brass/20 py-3 text-sm text-slate">No notifications yet.</p>
      ) : (
        <div className="flex flex-col">
          {notifications.map((notification) => (
            <div key={notification.id} className="flex items-center justify-between border-b border-brass/20 py-3">
              <span className="text-sm text-ink">{notification.message}</span>
              <span className="shrink-0 pl-6 font-mono text-xs text-slate">
                {dateFormatter.format(new Date(notification.createdAt))}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
