import { useEffect, useState } from "react";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip } from "chart.js";
import { Bar } from "react-chartjs-2";
import apiClient from "../../api/client";
import { inputClass, labelClass, primaryButtonClass, tableWrapClass, theadRowClass, thClass, tdClass, trClass } from "../admin/academic/formStyles";
import Card from "../../components/Card";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

function AttendanceChart({ records }) {
  const withAttendance = records.filter((r) => r.attendance != null);
  if (withAttendance.length === 0) return null;

  const labels = withAttendance.map((r) => r.subject.name);
  const values = withAttendance.map((r) => Math.max(0, Math.min(100, r.attendance.percentage)));

  const chartData = {
    labels,
    datasets: [
      {
        label: "Attendance %",
        data: values,
        backgroundColor: "#2E5CE6",
        borderRadius: 4,
        maxBarThickness: 40,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: (ctx) => `${ctx.parsed.y.toFixed(1)}%` } },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        ticks: { callback: (v) => `${v}%`, color: "#98A2B3" },
        grid: { color: "#E4E7EC" },
      },
      x: {
        ticks: { color: "#475467" },
        grid: { display: false },
      },
    },
  };

  const ariaLabel = `Bar chart of attendance percentage per subject: ${withAttendance
    .map((r) => `${r.subject.name} ${r.attendance.percentage.toFixed(0)} percent`)
    .join(", ")}`;

  return (
    <div role="img" aria-label={ariaLabel} className="h-64 w-full">
      <Bar data={chartData} options={chartOptions} />
    </div>
  );
}

export default function StudentLookup() {
  const [email, setEmail] = useState("");
  const [student, setStudent] = useState(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState(null);

  const [records, setRecords] = useState([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [recordsError, setRecordsError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setSearching(true);
    setError(null);
    setStudent(null);
    setRecords([]);
    setRecordsError(null);

    try {
      const { data } = await apiClient.get("/students/by-email", {
        params: { email: email.trim() },
      });
      setStudent(data);
    } catch (err) {
      setError(err.response?.status === 404 ? "No student found with that email." : "Could not run the search.");
    } finally {
      setSearching(false);
    }
  }

  useEffect(() => {
    if (!student?.id) return;
    let cancelled = false;

    async function loadPerformance() {
      setLoadingRecords(true);
      setRecordsError(null);
      try {
        const subjectsRes = await apiClient.get(`/students/${student.id}/subjects`);
        if (cancelled) return;
        const subjects = subjectsRes.data;

        if (subjects.length === 0) {
          setRecords([]);
          return;
        }

        const details = await Promise.all(
          subjects.map(async (subject) => {
            let attendance = null;
            let result = null;

            try {
              const attRes = await apiClient.get(`/attendance/percentage/student/${student.id}`, {
                params: { subjectId: subject.id },
              });
              attendance = attRes.data;
            } catch {
              // Non-fatal if attendance not recorded yet
            }

            try {
              const resRes = await apiClient.get("/results", {
                params: {
                  studentId: student.id,
                  subjectId: subject.id,
                  semesterId: student.semesterId,
                },
              });
              if (resRes.status === 200 && resRes.data) {
                result = resRes.data;
              }
            } catch {
              // Non-fatal if result not entered yet (204 / 404)
            }

            return { subject, attendance, result };
          })
        );

        if (!cancelled) {
          setRecords(details);
        }
      } catch {
        if (!cancelled) {
          setRecordsError("Could not load enrolled subjects and academic performance.");
        }
      } finally {
        if (!cancelled) {
          setLoadingRecords(false);
        }
      }
    }

    loadPerformance();

    return () => {
      cancelled = true;
    };
  }, [student]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-semibold text-ink">Student Lookup</h1>
        <p className="mt-1 text-sm text-ink-secondary">Search student record and performance by email</p>
      </div>

      <Card title="Search" className="mb-6">
        <form onSubmit={handleSubmit} className="flex max-w-md items-end gap-4">
          <label className="flex flex-1 flex-col gap-1.5">
            <span className={labelClass}>Student email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="student@example.com"
              className={inputClass}
            />
          </label>
          <button type="submit" disabled={searching} className={primaryButtonClass}>
            {searching ? "Searching…" : "Search"}
          </button>
        </form>

        {error && <p className="mt-4 text-sm text-danger">{error}</p>}
      </Card>

      {student && (
        <div className="flex flex-col gap-6">
          <Card title="Student">
            <div className="flex flex-col divide-y divide-border">
              <div className="flex items-center justify-between py-2.5 first:pt-0">
                <span className="text-sm font-medium text-ink">
                  {student.firstName} {student.lastName}
                </span>
                <span className="font-mono text-sm text-ink-secondary">{student.email}</span>
              </div>
              <div className="flex items-center justify-between py-2.5">
                <span className={labelClass}>Course</span>
                <span className="text-sm text-ink">{student.courseName}</span>
              </div>
              <div className="flex items-center justify-between py-2.5">
                <span className={labelClass}>Section</span>
                <span className="text-sm text-ink">{student.sectionName}</span>
              </div>
              <div className="flex items-center justify-between py-2.5 last:pb-0">
                <span className={labelClass}>Semester</span>
                <span className="text-sm text-ink">{student.semesterLabel}</span>
              </div>
            </div>
          </Card>

          {loadingRecords ? (
            <Card title="Enrolled Subjects & Academic Record">
              <p className="text-sm text-ink-secondary">Loading academic records…</p>
            </Card>
          ) : recordsError ? (
            <Card title="Enrolled Subjects & Academic Record">
              <p className="text-sm text-danger">{recordsError}</p>
            </Card>
          ) : records.length === 0 ? (
            <Card title="Enrolled Subjects & Academic Record">
              <p className="text-sm text-ink-secondary">No enrolled subjects found for this student.</p>
            </Card>
          ) : (
            <>
              <Card title="Attendance by Subject">
                <AttendanceChart records={records} />
              </Card>

              <Card title="Enrolled Subjects & Academic Record">
                <div className={tableWrapClass}>
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className={theadRowClass}>
                        <th className={thClass}>Subject</th>
                        <th className={thClass}>Type</th>
                        <th className={`${thClass} text-right`}>Attendance</th>
                        <th className={`${thClass} text-right`}>Test 1</th>
                        <th className={`${thClass} text-right`}>Test 2</th>
                        <th className={`${thClass} text-right`}>Quiz</th>
                        <th className={`${thClass} text-right`}>Experiential</th>
                        <th className={`${thClass} text-right`}>SEE</th>
                        <th className={`${thClass} text-right`}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {records.map(({ subject, attendance, result }) => (
                        <tr key={subject.id} className={trClass}>
                          <td className={`${tdClass} font-medium`}>
                            {subject.name}
                            <span className="ml-2 font-mono text-xs text-ink-muted">{subject.credits} cr</span>
                          </td>
                          <td className={`${tdClass} font-mono text-xs uppercase text-ink-muted`}>{subject.type}</td>
                          <td className={`${tdClass} text-right font-mono`}>
                            {attendance != null ? (
                              `${attendance.percentage.toFixed(1)}%`
                            ) : (
                              <span className="text-xs text-ink-muted">not recorded</span>
                            )}
                          </td>
                          <td className={`${tdClass} text-right`}>
                            {result?.test1 != null ? (
                              <span className="font-mono">{result.test1}</span>
                            ) : (
                              <span className="text-xs text-ink-muted">not entered yet</span>
                            )}
                          </td>
                          <td className={`${tdClass} text-right`}>
                            {result?.test2 != null ? (
                              <span className="font-mono">{result.test2}</span>
                            ) : (
                              <span className="text-xs text-ink-muted">not entered yet</span>
                            )}
                          </td>
                          <td className={`${tdClass} text-right`}>
                            {result?.quiz != null ? (
                              <span className="font-mono">
                                {result.quiz}
                                {result.quizMaxScore != null && (
                                  <span className="text-xs text-ink-muted">/{result.quizMaxScore}</span>
                                )}
                              </span>
                            ) : (
                              <span className="text-xs text-ink-muted">not entered yet</span>
                            )}
                          </td>
                          <td className={`${tdClass} text-right`}>
                            {result?.experiential != null ? (
                              <span className="font-mono">{result.experiential}</span>
                            ) : (
                              <span className="text-xs text-ink-muted">not entered yet</span>
                            )}
                          </td>
                          <td className={`${tdClass} text-right`}>
                            {result?.see != null ? (
                              <span className="font-mono">{result.see}</span>
                            ) : (
                              <span className="text-xs text-ink-muted">not entered yet</span>
                            )}
                          </td>
                          <td className={`${tdClass} text-right font-mono font-semibold`}>
                            {result?.total != null ? result.total.toFixed(1) : <span className="text-ink-muted">—</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </>
          )}
        </div>
      )}
    </div>
  );
}
