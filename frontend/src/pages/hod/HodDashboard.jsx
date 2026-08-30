import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import apiClient from "../../api/client";

function Row({ label, value, to }) {
  const content = (
    <div className="flex items-center justify-between border-b border-brass/20 py-4">
      <span className="text-sm text-ink">{label}</span>
      <span className="font-mono text-lg text-ink">{value}</span>
    </div>
  );
  return to ? (
    <Link to={to} className="block transition-colors hover:bg-card">
      {content}
    </Link>
  ) : (
    content
  );
}

export default function HodDashboard() {
  const [counts, setCounts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setLoadError(null);
      try {
        const [staffRes, studentsRes, leaveRes, feedbackRes] = await Promise.all([
          apiClient.get("/users", { params: { role: "STAFF" } }),
          apiClient.get("/users", { params: { role: "STUDENT" } }),
          apiClient.get("/leave/requests", { params: { status: "PENDING" } }),
          apiClient.get("/feedback", { params: { status: "OPEN" } }),
        ]);
        if (cancelled) return;
        setCounts({
          staff: staffRes.data.length,
          students: studentsRes.data.length,
          pendingLeave: leaveRes.data.length,
          openFeedback: feedbackRes.data.length,
        });
      } catch {
        if (!cancelled) setLoadError("Could not load the department summary.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      <div className="mb-6 border-b border-brass/20 pb-4">
        <h1 className="font-display text-2xl font-semibold text-ink">HOD Dashboard</h1>
      </div>

      {loading ? (
        <p className="text-sm text-slate">Loading…</p>
      ) : loadError ? (
        <p className="text-sm text-oxblood">{loadError}</p>
      ) : (
        <div className="flex max-w-xl flex-col">
          <Row label="Staff in your department" value={counts.staff} />
          <Row label="Students in your department" value={counts.students} />
          <Row label="Pending leave requests" value={counts.pendingLeave} to="/hod/leave" />
          <Row label="Open feedback items" value={counts.openFeedback} to="/hod/feedback" />
        </div>
      )}
    </div>
  );
}
