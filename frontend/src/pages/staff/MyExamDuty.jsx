import { useEffect, useState } from "react";
import apiClient from "../../api/client";
import MetricCard from "../../components/MetricCard";
import Card from "../../components/Card";
import { tableWrapClass, theadRowClass, thClass, tdClass, trClass } from "../admin/academic/formStyles";
import { ClipboardCheck } from "lucide-react";

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
      <div className="mb-6">
        <h1 className="font-display text-2xl font-semibold text-ink">My Exam Duty</h1>
      </div>

      {loading ? (
        <p className="text-sm text-ink-secondary">Loading…</p>
      ) : loadError ? (
        <p className="text-sm text-danger">{loadError}</p>
      ) : (
        <>
          <div className="mb-6 max-w-xs">
            <MetricCard label="Exam Duties" value={assignments.length} icon={ClipboardCheck} />
          </div>

          <Card title="Assignments">
            {assignments.length === 0 ? (
              <p className="py-3 text-sm text-ink-secondary">No exam invigilation duty has been assigned to you.</p>
            ) : (
              <div className={tableWrapClass}>
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className={theadRowClass}>
                      <th className={thClass}>Exam session</th>
                      <th className={`${thClass} text-right`}>Assigned</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assignments.map((assignment) => (
                      <tr key={assignment.id} className={trClass}>
                        <td className={`${tdClass} font-medium`}>{assignment.examSessionReference}</td>
                        <td className={`${tdClass} text-right font-mono text-xs text-ink-muted`}>
                          {dateFormatter.format(new Date(assignment.assignedAt))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
