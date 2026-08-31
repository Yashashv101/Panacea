import { useEffect, useState } from "react";
import apiClient from "../../api/client";
import TimetableGrid from "../../components/TimetableGrid";
import { useAuth } from "../../context/AuthContext";

export default function MyTimetable() {
  const { userId } = useAuth();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    apiClient
      .get(`/timetable/staff/${userId}`)
      .then((res) => {
        if (!cancelled) setEntries(res.data);
      })
      .catch(() => {
        if (!cancelled) setLoadError("Could not load your timetable.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  return (
    <div>
      <div className="mb-6 border-b border-brass/20 pb-4">
        <h1 className="font-display text-2xl font-semibold text-ink">My Timetable</h1>
        <p className="mt-1 text-sm text-slate">Weekly schedule of your classes across all assigned sections.</p>
      </div>

      {loading ? (
        <p className="text-sm text-slate">Loading…</p>
      ) : loadError ? (
        <p className="text-sm text-oxblood">{loadError}</p>
      ) : (
        <TimetableGrid
          entries={entries}
          showSection={true}
          emptyMessage="No timetable entries have been scheduled for you yet."
        />
      )}
    </div>
  );
}
