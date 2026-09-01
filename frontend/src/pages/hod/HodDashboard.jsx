import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import apiClient from "../../api/client";
import DashboardCalendarSidebar from "../../components/DashboardCalendarSidebar";
import MetricCard from "../../components/MetricCard";
import { Users, GraduationCap, Clock, MessageSquare } from "lucide-react";

function MetricLink({ to, children }) {
  return to ? (
    <Link to={to} className="block rounded-lg transition-transform duration-150 ease-out hover:-translate-y-0.5">
      {children}
    </Link>
  ) : (
    children
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
      <div className="mb-6">
        <h1 className="font-display text-2xl font-semibold text-ink">HOD Dashboard</h1>
      </div>

      <div className="flex flex-col items-start gap-6 lg:flex-row">
        <div className="w-full min-w-0 flex-1">
          {loading ? (
            <p className="text-sm text-ink-secondary">Loading…</p>
          ) : loadError ? (
            <p className="text-sm text-danger">{loadError}</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <MetricCard label="Staff in your department" value={counts.staff} icon={Users} />
              <MetricCard label="Students in your department" value={counts.students} icon={GraduationCap} />
              <MetricLink to="/hod/leave">
                <MetricCard
                  label="Pending leave requests"
                  value={counts.pendingLeave}
                  icon={Clock}
                  tone={counts.pendingLeave > 0 ? "warning" : "default"}
                />
              </MetricLink>
              <MetricLink to="/hod/feedback">
                <MetricCard
                  label="Open feedback items"
                  value={counts.openFeedback}
                  icon={MessageSquare}
                  tone={counts.openFeedback > 0 ? "warning" : "default"}
                />
              </MetricLink>
            </div>
          )}
        </div>

        <DashboardCalendarSidebar />
      </div>
    </div>
  );
}
