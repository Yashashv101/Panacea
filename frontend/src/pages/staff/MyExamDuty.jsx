import { useEffect, useState } from "react";
import apiClient from "../../api/client";

const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export default function MyExamDuty() {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    apiClient
      .get("/proctor/assignments/me")
      .then((res) => {
        if (!cancelled) setAssignments(res.data.filter((a) => a.assignmentType === "EXAM"));
      })
      .catch(() => {
        if (!cancelled) setLoadError("Could not load your exam duty.");
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
        <h1 className="font-display text-2xl font-semibold text-ink">My Exam Duty</h1>
      </div>

      {loading ? (
        <p className="text-sm text-slate">Loading…</p>
      ) : loadError ? (
        <p className="text-sm text-oxblood">{loadError}</p>
      ) : assignments.length === 0 ? (
        <p className="border-b border-brass/20 py-3 text-sm text-slate">
          No exam invigilation duty has been assigned to you.
        </p>
      ) : (
        <div className="flex flex-col">
          {assignments.map((assignment) => (
            <div key={assignment.id} className="flex items-center justify-between border-b border-brass/20 py-3">
              <span className="text-sm text-ink">{assignment.examSessionReference}</span>
              <span className="font-mono text-xs text-slate">
                Assigned {dateFormatter.format(new Date(assignment.assignedAt))}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
