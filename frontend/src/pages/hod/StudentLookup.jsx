import { useEffect, useState } from "react";
import apiClient from "../../api/client";

const inputClass =
  "border-0 border-b border-brass/40 bg-transparent px-0 py-2 text-sm text-ink outline-none focus:border-oxblood";

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
      setError(
        err.response?.status === 404
          ? "No student found with that email."
          : "Could not run the search."
      );
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
        const subjectsRes = await apiClient.get(
          `/students/${student.id}/subjects`
        );
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
              const attRes = await apiClient.get(
                `/attendance/percentage/student/${student.id}`,
                {
                  params: { subjectId: subject.id },
                }
              );
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
          setRecordsError(
            "Could not load enrolled subjects and academic performance."
          );
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
      <div className="mb-6 border-b border-brass/20 pb-4">
        <h1 className="font-display text-2xl font-semibold text-ink">
          Student Lookup
        </h1>
        <p className="mt-1 text-xs uppercase tracking-wide text-slate">
          Search student record and performance by email
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="mb-8 flex max-w-md items-end gap-4"
      >
        <label className="flex flex-1 flex-col gap-1.5">
          <span className="text-xs font-medium uppercase tracking-wide text-slate">
            Student email
          </span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="student@example.com"
            className={inputClass}
          />
        </label>
        <button
          type="submit"
          disabled={searching}
          className="w-fit rounded bg-oxblood px-5 py-2.5 text-sm font-medium text-paper transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {searching ? "Searching…" : "Search"}
        </button>
      </form>

      {error && <p className="text-sm text-oxblood">{error}</p>}

      {student && (
        <div className="flex flex-col gap-8">
          {/* Student metadata */}
          <div className="max-w-xl">
            <div className="border-b border-brass/20 py-3">
              <span className="text-sm text-ink font-medium">
                {student.firstName} {student.lastName}
              </span>
              <span className="ml-4 font-mono text-sm text-slate">
                {student.email}
              </span>
            </div>
            <div className="flex items-center justify-between border-b border-brass/20 py-3">
              <span className="text-xs font-medium uppercase tracking-wide text-slate">
                Course
              </span>
              <span className="text-sm text-ink">{student.courseName}</span>
            </div>
            <div className="flex items-center justify-between border-b border-brass/20 py-3">
              <span className="text-xs font-medium uppercase tracking-wide text-slate">
                Section
              </span>
              <span className="text-sm text-ink">{student.sectionName}</span>
            </div>
            <div className="flex items-center justify-between border-b border-brass/20 py-3">
              <span className="text-xs font-medium uppercase tracking-wide text-slate">
                Semester
              </span>
              <span className="text-sm text-ink">{student.semesterLabel}</span>
            </div>
          </div>

          {/* Academic Performance / Enrolled Subjects Table */}
          <div className="max-w-4xl">
            <div className="mb-2 border-b border-brass/40 pb-1">
              <span className="font-display text-xs uppercase tracking-widest text-brass">
                Enrolled Subjects & Academic Record
              </span>
            </div>

            {loadingRecords ? (
              <p className="py-4 text-sm text-slate">
                Loading academic records…
              </p>
            ) : recordsError ? (
              <p className="py-4 text-sm text-oxblood">{recordsError}</p>
            ) : records.length === 0 ? (
              <p className="py-4 text-sm text-slate">
                No enrolled subjects found for this student.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-brass/30 text-xs font-medium uppercase tracking-wide text-slate">
                      <th className="py-2.5 pr-4 font-normal">Subject</th>
                      <th className="py-2.5 px-3 font-normal">Type</th>
                      <th className="py-2.5 px-3 font-normal text-right">
                        Attendance
                      </th>
                      <th className="py-2.5 px-3 font-normal text-right">
                        Test 1
                      </th>
                      <th className="py-2.5 px-3 font-normal text-right">
                        Test 2
                      </th>
                      <th className="py-2.5 px-3 font-normal text-right">
                        Quiz
                      </th>
                      <th className="py-2.5 px-3 font-normal text-right">
                        Experiential
                      </th>
                      <th className="py-2.5 px-3 font-normal text-right">
                        SEE
                      </th>
                      <th className="py-2.5 pl-3 font-normal text-right">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map(({ subject, attendance, result }) => (
                      <tr
                        key={subject.id}
                        className="border-b border-brass/10 hover:bg-card transition-colors"
                      >
                        <td className="py-3 pr-4 font-medium text-ink">
                          {subject.name}
                          <span className="ml-2 font-mono text-xs text-slate">
                            {subject.credits} cr
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono text-xs text-slate uppercase">
                          {subject.type}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-sm text-ink">
                          {attendance != null ? (
                            `${attendance.percentage.toFixed(1)}%`
                          ) : (
                            <span className="text-xs text-slate">
                              not recorded
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right">
                          {result?.test1 != null ? (
                            <span className="font-mono text-sm text-ink">
                              {result.test1}
                            </span>
                          ) : (
                            <span className="text-xs text-slate">
                              not entered yet
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right">
                          {result?.test2 != null ? (
                            <span className="font-mono text-sm text-ink">
                              {result.test2}
                            </span>
                          ) : (
                            <span className="text-xs text-slate">
                              not entered yet
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right">
                          {result?.quiz != null ? (
                            <span className="font-mono text-sm text-ink">
                              {result.quiz}
                              {result.quizMaxScore != null && (
                                <span className="text-xs text-slate">
                                  /{result.quizMaxScore}
                                </span>
                              )}
                            </span>
                          ) : (
                            <span className="text-xs text-slate">
                              not entered yet
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right">
                          {result?.experiential != null ? (
                            <span className="font-mono text-sm text-ink">
                              {result.experiential}
                            </span>
                          ) : (
                            <span className="text-xs text-slate">
                              not entered yet
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right">
                          {result?.see != null ? (
                            <span className="font-mono text-sm text-ink">
                              {result.see}
                            </span>
                          ) : (
                            <span className="text-xs text-slate">
                              not entered yet
                            </span>
                          )}
                        </td>
                        <td className="py-3 pl-3 text-right font-mono text-sm font-medium text-ink">
                          {result?.total != null ? (
                            result.total.toFixed(1)
                          ) : (
                            <span className="text-xs text-slate">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
