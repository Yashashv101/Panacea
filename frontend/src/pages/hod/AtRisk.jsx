import { Fragment, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import apiClient from "../../api/client";
import Card from "../../components/Card";
import MetricCard from "../../components/MetricCard";
import StatusBadge from "../../components/StatusBadge";
import { tableWrapClass, theadRowClass, thClass, tdClass, trClass } from "../admin/academic/formStyles";
import { AlertTriangle } from "lucide-react";

function ReasonBadge({ reason }) {
  return reason === "attendance" ? (
    <StatusBadge status="ATTENDANCE < 75%" variant="negative" />
  ) : (
    <StatusBadge status="CIE MARKS < 20/50" variant="pending" />
  );
}

export default function AtRisk() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function loadAtRisk() {
      setLoading(true);
      setError(null);
      try {
        const { data } = await apiClient.get("/students/at-risk");
        if (!cancelled) {
          setStudents(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err.response?.status === 403
              ? "You are not authorized to view at-risk students."
              : "Could not load at-risk students."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadAtRisk();

    return () => {
      cancelled = true;
    };
  }, []);

  function toggleExpand(id) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-semibold text-ink">At-Risk Students</h1>
        <p className="mt-1 text-sm text-ink-secondary">
          Department students flagged for attendance (&lt; 75%) or CIE performance (Test 1 + Test 2 &lt; 20/50)
        </p>
      </div>

      {loading ? (
        <p className="py-4 text-sm text-ink-secondary">Evaluating academic records…</p>
      ) : error ? (
        <p className="py-4 text-sm text-danger">{error}</p>
      ) : students.length === 0 ? (
        <Card>
          <p className="text-sm text-ink-secondary">
            No students are currently flagged as at-risk in your department.
          </p>
        </Card>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="max-w-xs">
            <MetricCard label="Flagged Students" value={students.length} icon={AlertTriangle} tone="danger" />
          </div>

          <Card title="Flagged Students" action={<span className="text-xs text-ink-muted">Click a row for trigger details</span>}>
            <div className={tableWrapClass}>
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className={theadRowClass}>
                    <th className={thClass}>Student</th>
                    <th className={thClass}>Section</th>
                    <th className={thClass}>Email</th>
                    <th className={`${thClass} text-right`}>Flags</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => {
                    const isExpanded = expandedId === student.studentId;
                    const reasonCount = student.reasons.length;

                    return (
                      <Fragment key={student.studentId}>
                        <tr
                          onClick={() => toggleExpand(student.studentId)}
                          className={`${trClass} cursor-pointer`}
                        >
                          <td className={`${tdClass} font-medium`}>{student.studentName}</td>
                          <td className={`${tdClass} font-mono text-xs text-ink-secondary`}>{student.sectionName}</td>
                          <td className={`${tdClass} font-mono text-xs text-ink-muted`}>{student.email}</td>
                          <td className={`${tdClass} text-right`}>
                            <span className="font-mono text-xs font-medium text-danger">
                              {reasonCount} {reasonCount === 1 ? "flag" : "flags"}
                            </span>
                            <span className="ml-3 text-xs text-ink-muted">{isExpanded ? "▲" : "▼"}</span>
                          </td>
                        </tr>

                        {isExpanded && (
                          <tr className={trClass}>
                            <td colSpan={4} className="bg-surface-alt/60 px-4 py-4">
                              <div className="mb-3 flex items-center justify-between">
                                <span className="text-xs font-medium uppercase tracking-wide text-ink-muted">
                                  Triggered Conditions for {student.studentName}
                                </span>
                                <Link to="/hod/students" className="text-xs font-medium text-accent hover:underline">
                                  Open Student Lookup →
                                </Link>
                              </div>

                              <div className="overflow-x-auto rounded-lg border border-border bg-surface">
                                <table className="w-full text-left text-sm">
                                  <thead>
                                    <tr className={theadRowClass}>
                                      <th className={thClass}>Subject</th>
                                      <th className={thClass}>Trigger</th>
                                      <th className={`${thClass} text-right`}>Details</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {student.reasons.map((r, idx) => (
                                      <tr key={`${r.subjectId}-${r.reason}-${idx}`} className={trClass}>
                                        <td className={`${tdClass} font-medium`}>{r.subjectName}</td>
                                        <td className={tdClass}>
                                          <ReasonBadge reason={r.reason} />
                                        </td>
                                        <td className={`${tdClass} text-right font-mono text-xs`}>
                                          {r.reason === "attendance" ? (
                                            <span>
                                              {r.attendancePercentage != null
                                                ? `${r.attendancePercentage.toFixed(1)}%`
                                                : "—"}
                                              {r.totalSessions != null && (
                                                <span className="ml-1 text-ink-muted">
                                                  ({r.presentSessions}/{r.totalSessions} sessions)
                                                </span>
                                              )}
                                            </span>
                                          ) : (
                                            <span>
                                              T1: {r.test1} · T2: {r.test2}{" "}
                                              <span className="font-semibold text-warning">
                                                (Total: {r.marksTotal != null ? r.marksTotal.toFixed(1) : "—"} / 50)
                                              </span>
                                            </span>
                                          )}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
