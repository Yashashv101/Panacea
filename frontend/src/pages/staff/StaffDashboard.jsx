import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import apiClient from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import DashboardCalendarSidebar from "../../components/DashboardCalendarSidebar";

export default function StaffDashboard() {
  const { user } = useAuth();
  const [assignedSubjects, setAssignedSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setLoadError(null);
      try {
        const res = await apiClient.get("/academic/staff-assignments/me");
        if (!cancelled) setAssignedSubjects(res.data);
      } catch {
        if (!cancelled) setLoadError("Could not load your assigned subjects.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const totalSections = assignedSubjects.reduce((acc, sub) => acc + (sub.sections?.length ?? 0), 0);
  const totalWeeklyLoad = assignedSubjects.reduce(
    (acc, sub) => acc + (sub.credits ?? 0) * (sub.sections?.length ?? 0),
    0
  );

  return (
    <div>
      <div className="mb-6 border-b border-brass/20 pb-4">
        <h1 className="font-display text-2xl font-semibold text-ink">Staff Dashboard</h1>
        <p className="mt-1 text-sm text-slate">
          Welcome, {user?.firstName} {user?.lastName}. Overview of your assigned subjects and sections.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-slate">Loading…</p>
      ) : loadError ? (
        <p className="text-sm text-oxblood">{loadError}</p>
      ) : (
        <div className="flex flex-col lg:flex-row items-start gap-8">
          {/* Main Dashboard Content */}
          <div className="flex-1 min-w-0 flex flex-col gap-8 w-full">
            {/* Summary stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-b border-brass/20 pb-6">
              <div className="border border-brass/20 bg-card p-4 rounded">
                <span className="text-xs uppercase tracking-wide text-slate">Assigned Subjects</span>
                <div className="mt-1 font-mono text-2xl font-semibold text-ink">{assignedSubjects.length}</div>
              </div>
              <div className="border border-brass/20 bg-card p-4 rounded">
                <span className="text-xs uppercase tracking-wide text-slate">Total Sections</span>
                <div className="mt-1 font-mono text-2xl font-semibold text-ink">{totalSections}</div>
              </div>
              <div className="border border-brass/20 bg-card p-4 rounded">
                <span className="text-xs uppercase tracking-wide text-slate">Weekly Teaching Load</span>
                <div className="mt-1 font-mono text-2xl font-semibold text-oxblood">{totalWeeklyLoad} periods/week</div>
              </div>
            </div>

            {/* Assigned Classes */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-lg font-semibold text-ink">My Assigned Subjects & Sections</h2>
                <Link
                  to="/staff/timetable"
                  className="text-xs uppercase font-medium tracking-wide text-oxblood hover:underline"
                >
                  View My Timetable →
                </Link>
              </div>

              {assignedSubjects.length === 0 ? (
                <p className="border-b border-brass/20 py-3 text-sm text-slate">
                  No subjects have been assigned to you yet. Contact your administrator or HOD.
                </p>
              ) : (
                <div className="flex flex-col divide-y divide-brass/10 border-t border-brass/20">
                  {assignedSubjects.map((sub) => (
                    <div key={sub.subjectId} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex flex-col gap-1 min-w-0">
                        <div className="flex items-center gap-3">
                          <span className="font-medium text-ink text-base">{sub.subjectName}</span>
                          <span className="font-mono text-xs text-slate">{sub.type}</span>
                          <span className="font-mono text-xs text-slate">({sub.credits} credits/section)</span>
                        </div>
                        <div className="text-xs text-slate">
                          <span>{sub.courseName ?? "—"}</span>
                          {sub.semesterLabel && <span> · {sub.semesterLabel}</span>}
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <span className="text-xs font-medium text-slate uppercase tracking-wide">Assigned:</span>
                          {sub.sections.map((sec) => (
                            <span
                              key={sec.id}
                              className="inline-flex items-center px-2 py-0.5 rounded border border-brass/30 bg-card text-xs font-mono font-medium text-ink"
                            >
                              Section {sec.name}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center gap-4 shrink-0">
                        <Link
                          to="/staff/attendance"
                          className="text-xs uppercase font-medium tracking-wide text-oxblood hover:underline"
                        >
                          Attendance
                        </Link>
                        <Link
                          to="/staff/results"
                          className="text-xs uppercase font-medium tracking-wide text-oxblood hover:underline"
                        >
                          Results
                        </Link>
                        <Link
                          to="/staff/materials"
                          className="text-xs uppercase font-medium tracking-wide text-oxblood hover:underline"
                        >
                          Materials
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* Right Calendar & Reminders Sidebar */}
          <DashboardCalendarSidebar />
        </div>
      )}
    </div>
  );
}
