import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import apiClient from "../../api/client";

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
      <div className="mb-6 border-b border-brass/20 pb-4">
        <h1 className="font-display text-2xl font-semibold text-ink">
          At-Risk Students
        </h1>
        <p className="mt-1 text-xs uppercase tracking-wide text-slate">
          Department students flagged for attendance (&lt; 75%) or CIE performance (Test 1 + Test 2 &lt; 20/50)
        </p>
      </div>

      {loading ? (
        <p className="py-4 text-sm text-slate">Evaluating academic records…</p>
      ) : error ? (
        <p className="py-4 text-sm text-oxblood">{error}</p>
      ) : students.length === 0 ? (
        <div className="border-b border-brass/20 py-6">
          <p className="text-sm text-slate">
            No students are currently flagged as at-risk in your department.
          </p>
        </div>
      ) : (
        <div className="max-w-4xl">
          <div className="mb-2 border-b border-brass/40 pb-1 flex items-center justify-between">
            <span className="font-display text-xs uppercase tracking-widest text-brass">
              Flagged Students ({students.length})
            </span>
            <span className="text-xs text-slate">
              Click a student to view trigger details
            </span>
          </div>

          <div className="flex flex-col">
            {students.map((student) => {
              const isExpanded = expandedId === student.studentId;
              const reasonCount = student.reasons.length;

              return (
                <div
                  key={student.studentId}
                  className="border-b border-brass/20 transition-colors"
                >
                  {/* Student row (initial view: names and summary) */}
                  <button
                    type="button"
                    onClick={() => toggleExpand(student.studentId)}
                    className="flex w-full items-center justify-between py-3 text-left hover:bg-card px-2 -mx-2 transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-ink">
                          {student.studentName}
                        </span>
                        <span className="font-mono text-xs text-slate">
                          {student.sectionName}
                        </span>
                        <span className="font-mono text-xs text-slate">
                          {student.email}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <span className="font-mono text-xs text-oxblood font-medium">
                        {reasonCount} {reasonCount === 1 ? "flag" : "flags"}
                      </span>
                      <span className="font-mono text-xs text-slate">
                        {isExpanded ? "▲ Hide" : "▼ Details"}
                      </span>
                    </div>
                  </button>

                  {/* Expanded detail view */}
                  {isExpanded && (
                    <div className="mb-4 mt-2 bg-card/60 p-4 border-l-2 border-oxblood">
                      <div className="mb-3 flex items-center justify-between">
                        <span className="text-xs font-medium uppercase tracking-wide text-slate">
                          Triggered Conditions for {student.studentName}
                        </span>
                        <Link
                          to="/hod/students"
                          className="text-xs text-oxblood hover:underline uppercase tracking-wide"
                        >
                          Open Student Lookup →
                        </Link>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-left text-sm">
                          <thead>
                            <tr className="border-b border-brass/20 text-xs font-medium uppercase tracking-wide text-slate">
                              <th className="py-2 pr-4 font-normal">Subject</th>
                              <th className="py-2 px-3 font-normal">Trigger Category</th>
                              <th className="py-2 pl-3 font-normal text-right">Details</th>
                            </tr>
                          </thead>
                          <tbody>
                            {student.reasons.map((r, idx) => (
                              <tr
                                key={`${r.subjectId}-${r.reason}-${idx}`}
                                className="border-b border-brass/10 last:border-b-0"
                              >
                                <td className="py-2.5 pr-4 text-ink font-medium">
                                  {r.subjectName}
                                </td>
                                <td className="py-2.5 px-3">
                                  {r.reason === "attendance" ? (
                                    <span className="text-xs font-mono text-oxblood uppercase">
                                      Attendance (&lt; 75%)
                                    </span>
                                  ) : (
                                    <span className="text-xs font-mono text-oxblood uppercase">
                                      CIE Marks (&lt; 20/50)
                                    </span>
                                  )}
                                </td>
                                <td className="py-2.5 pl-3 text-right font-mono text-xs text-ink">
                                  {r.reason === "attendance" ? (
                                    <span>
                                      {r.attendancePercentage != null
                                        ? `${r.attendancePercentage.toFixed(1)}%`
                                        : "—"}
                                      {r.totalSessions != null && (
                                        <span className="ml-1 text-slate">
                                          ({r.presentSessions}/{r.totalSessions} sessions)
                                        </span>
                                      )}
                                    </span>
                                  ) : (
                                    <span>
                                      T1: {r.test1} · T2: {r.test2}{" "}
                                      <span className="font-semibold text-oxblood">
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
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
