import { useEffect, useState } from "react";
import apiClient from "../api/client";
import StatusStamp from "./StatusStamp";

const TYPE_LABELS = {
  HOLIDAY: "Holiday",
  EXAM: "Exam",
  EVENT: "Event",
};

function formatRange(entry) {
  if (entry.endDate && entry.endDate !== entry.date) {
    return `${entry.date} – ${entry.endDate}`;
  }
  return entry.date;
}

/**
 * Shared read-only "what's coming up" feed for the HOD/staff/student
 * dashboards — backs onto GET /api/calendar/upcoming, which merges
 * Holiday, ExamSchedule, and CollegeEvent into one date-sorted list. No
 * role-specific fetching needed: the endpoint itself has no @PreAuthorize,
 * so any authenticated role sees the same institution-wide feed.
 */
export default function UpcomingCalendar() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    apiClient
      .get("/calendar/upcoming")
      .then((res) => {
        if (!cancelled) setEntries(res.data);
      })
      .catch(() => {
        if (!cancelled) setLoadError("Could not load the academic calendar.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mb-8">
      <h2 className="mb-2 border-b border-brass/20 pb-2 font-display text-lg font-semibold text-ink">
        Upcoming on the calendar
      </h2>
      {loading ? (
        <p className="border-b border-brass/20 py-3 text-sm text-slate">Loading…</p>
      ) : loadError ? (
        <p className="border-b border-brass/20 py-3 text-sm text-oxblood">{loadError}</p>
      ) : entries.length === 0 ? (
        <p className="border-b border-brass/20 py-3 text-sm text-slate">Nothing coming up.</p>
      ) : (
        <div className="flex flex-col">
          {entries.map((entry, index) => (
            <div
              key={`${entry.type}-${entry.date}-${index}`}
              className="flex items-center justify-between border-b border-brass/20 py-3"
            >
              <div className="flex items-center gap-4">
                <StatusStamp status={TYPE_LABELS[entry.type] ?? entry.type} variant="neutral" />
                <div>
                  <div className="text-sm text-ink">{entry.title}</div>
                  {entry.description && <div className="text-xs text-slate">{entry.description}</div>}
                </div>
              </div>
              <span className="font-mono text-sm text-slate">{formatRange(entry)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
