import { useEffect, useState } from "react";
import apiClient from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { useMyAssignedSubjects } from "../../hooks/useMyAssignedSubjects";
import { inputClass, labelClass, primaryButtonClass, extractErrorMessage } from "../admin/academic/formStyles";
import MetricCard from "../../components/MetricCard";
import Card from "../../components/Card";
import { Users, UserCheck, UserX } from "lucide-react";

const PERIODS = [1, 2, 3, 4, 5, 6];

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

export default function MarkAttendance() {
  const { userId } = useAuth();

  const [students, setStudents] = useState([]);

  const [subjectId, setSubjectId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [date, setDate] = useState(todayIsoDate());
  const [period, setPeriod] = useState("");
  const [presentByStudentId, setPresentByStudentId] = useState({});

  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);

  const { assignedSubjects, selectedSubject, loading, loadError } = useMyAssignedSubjects(subjectId, {
    errorMessage: "Could not load attendance data.",
  });

  // The roster depends on which section is selected — fetch it fresh each
  // time, rather than loading every student up front.
  useEffect(() => {
    let cancelled = false;

    if (!sectionId) {
      setStudents([]);
      setPresentByStudentId({});
      return () => {
        cancelled = true;
      };
    }

    apiClient
      .get("/students", { params: { sectionId } })
      .then((res) => {
        if (cancelled) return;
        setStudents(res.data);
        setPresentByStudentId(Object.fromEntries(res.data.map((student) => [student.id, true])));
      })
      .catch(() => {
        if (!cancelled) {
          setStudents([]);
          setPresentByStudentId({});
        }
      });

    return () => {
      cancelled = true;
    };
  }, [sectionId]);

  const availableSections = selectedSubject?.sections ?? [];

  function handleSubjectChange(value) {
    setSubjectId(value);
    setSectionId("");
  }

  function togglePresent(studentId) {
    setPresentByStudentId((prev) => ({ ...prev, [studentId]: !prev[studentId] }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage(null);
    setSubmitting(true);
    try {
      await apiClient.post("/attendance/mark", {
        subjectId: Number(subjectId),
        sectionId: Number(sectionId),
        date,
        period: Number(period),
        students: students.map((student) => ({
          studentId: student.id,
          present: !!presentByStudentId[student.id],
        })),
      });
      setMessage({ tone: "success", text: "Attendance marked." });
    } catch (err) {
      if (err.response?.status === 403) {
        setMessage({ tone: "error", text: "You are not assigned to this subject and section." });
      } else {
        setMessage({ tone: "error", text: extractErrorMessage(err, "Could not mark attendance.") });
      }
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit = subjectId && sectionId && date && period && students.length > 0;
  const presentCount = students.filter((s) => presentByStudentId[s.id]).length;
  const absentCount = students.length - presentCount;

  if (loading) {
    return (
      <div>
        <div className="mb-6">
          <h1 className="font-display text-2xl font-semibold text-ink">Mark Attendance</h1>
        </div>
        <p className="text-sm text-ink-secondary">Loading…</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div>
        <div className="mb-6">
          <h1 className="font-display text-2xl font-semibold text-ink">Mark Attendance</h1>
        </div>
        <p className="text-sm text-danger">{loadError}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-semibold text-ink">Mark Attendance</h1>
      </div>

      {assignedSubjects.length === 0 ? (
        <p className="text-sm text-ink-secondary">
          You do not have any assigned subjects or sections to mark attendance for.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <Card title="Session details">
            <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">
              <label className="flex flex-col gap-1.5">
                <span className={labelClass}>Subject</span>
                <select
                  required
                  value={subjectId}
                  onChange={(e) => handleSubjectChange(e.target.value)}
                  className={inputClass}
                >
                  <option value="" disabled>
                    Select a subject
                  </option>
                  {assignedSubjects.map((subject) => (
                    <option key={subject.subjectId} value={subject.subjectId}>
                      {subject.subjectName} ({subject.type})
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1.5">
                <span className={labelClass}>Section</span>
                <select
                  required
                  disabled={!selectedSubject}
                  value={sectionId}
                  onChange={(e) => setSectionId(e.target.value)}
                  className={inputClass}
                >
                  <option value="" disabled>
                    {selectedSubject ? "Select a section" : "Select a subject first"}
                  </option>
                  {availableSections.map((section) => (
                    <option key={section.id} value={section.id}>
                      Section {section.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1.5">
                <span className={labelClass}>Date</span>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className={inputClass}
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className={labelClass}>Period</span>
                <select
                  required
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                  className={inputClass}
                >
                  <option value="" disabled>
                    Select a period
                  </option>
                  {PERIODS.map((p) => (
                    <option key={p} value={p}>
                      Period {p}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </Card>

          {students.length > 0 && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <MetricCard label="Total Students" value={students.length} icon={Users} />
              <MetricCard label="Present" value={presentCount} icon={UserCheck} tone="success" />
              <MetricCard label="Absent" value={absentCount} icon={UserX} tone={absentCount > 0 ? "danger" : "default"} />
            </div>
          )}

          <Card title="Students">
            {students.length === 0 ? (
              <p className="text-sm text-ink-secondary">
                {sectionId ? "No students are enrolled in this section." : "Select a section to see its students."}
              </p>
            ) : (
              <div className="flex flex-col divide-y divide-border">
                {students.map((student) => {
                  const present = !!presentByStudentId[student.id];
                  return (
                    <div key={student.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                      <span className="text-sm text-ink">
                        {student.firstName} {student.lastName}
                      </span>
                      <button
                        type="button"
                        onClick={() => togglePresent(student.id)}
                        className={`w-24 rounded border px-3 py-1.5 text-xs font-medium transition-colors duration-150 ease-out ${
                          present
                            ? "border-success bg-success/10 text-success"
                            : "border-danger bg-danger/10 text-danger"
                        }`}
                      >
                        {present ? "Present" : "Absent"}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {message && (
            <p className={`text-sm ${message.tone === "success" ? "text-ink-secondary" : "text-danger"}`}>
              {message.text}
            </p>
          )}

          <button type="submit" disabled={submitting || !canSubmit} className={`${primaryButtonClass} w-fit`}>
            {submitting ? "Marking…" : "Mark attendance"}
          </button>
        </form>
      )}
    </div>
  );
}
