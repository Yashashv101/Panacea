import { useEffect, useState } from "react";
import apiClient from "../../api/client";
import StatusBadge from "../../components/StatusBadge.jsx";
import MetricCard from "../../components/MetricCard";
import Card from "../../components/Card";
import { Users2 } from "lucide-react";

export default function Mentees() {
  const [mentees, setMentees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    apiClient
      .get("/proctor/assignments/my-mentees")
      .then((res) => {
        if (!cancelled) setMentees(res.data);
      })
      .catch(() => {
        if (!cancelled) setLoadError("Could not load your mentees.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div>
        <div className="mb-6">
          <h1 className="font-display text-2xl font-semibold text-ink">My Mentees</h1>
        </div>
        <p className="text-sm text-ink-secondary">Loading…</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div>
        <div className="mb-6">
          <h1 className="font-display text-2xl font-semibold text-ink">My Mentees</h1>
        </div>
        <p className="text-sm text-danger">{loadError}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-semibold text-ink">My Mentees</h1>
      </div>

      <div className="mb-6 max-w-xs">
        <MetricCard label="Mentees" value={mentees.length} icon={Users2} />
      </div>

      <Card title="Mentees">
        {mentees.length === 0 ? (
          <p className="py-3 text-sm text-ink-secondary">No students have been assigned to you as a mentor yet.</p>
        ) : (
          <div className="flex flex-col divide-y divide-border">
            {mentees.map((mentee) => (
              <div key={mentee.studentId} className="py-4 first:pt-0 last:pb-0">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-ink">{mentee.studentName}</div>
                    <div className="mt-0.5 font-mono text-xs text-ink-muted">{mentee.email}</div>
                  </div>
                  <div className="flex items-center gap-6">
                    <span className="text-sm text-ink-secondary">
                      {mentee.courseName} — {mentee.sectionName}
                    </span>
                    <StatusBadge status={mentee.feeStatus ?? "NOT PAID"} />
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {mentee.subjects.length === 0 ? (
                    <span className="text-xs text-ink-muted">No subjects on record.</span>
                  ) : (
                    mentee.subjects.map((subject) => (
                      <span
                        key={subject.id}
                        className="rounded-md border border-border bg-surface-alt px-2 py-1 text-xs text-ink-secondary"
                      >
                        {subject.name}
                      </span>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
