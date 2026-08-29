import { useEffect, useMemo, useState } from "react";
import apiClient from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { inputClass, labelClass, primaryButtonClass, extractErrorMessage } from "../admin/academic/formStyles";

const PERIODS = [1, 2, 3, 4, 5, 6];

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

export default function MarkAttendance() {
  const { userId } = useAuth();

  const [subjects, setSubjects] = useState([]);
  const [sections, setSections] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [subjectId, setSubjectId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [date, setDate] = useState(todayIsoDate());
  const [period, setPeriod] = useState("");
  const [presentByStudentId, setPresentByStudentId] = useState({});

  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setLoadError(null);
      try {
        const [subjectsRes, sectionsRes] = await Promise.all([
          apiClient.get("/subjects"),
          apiClient.get("/sections"),
        ]);
        if (cancelled) return;
        setSubjects(subjectsRes.data);
        setSections(sectionsRes.data);
      } catch {
        if (!cancelled) setLoadError("Could not load attendance data.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

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

  const ownedSubjects = useMemo(
    () => subjects.filter((subject) => subject.primaryStaffId === userId),
    [subjects, userId]
  );

  const selectedSubject = ownedSubjects.find((subject) => subject.id === Number(subjectId));

  const availableSections = useMemo(() => {
    if (!selectedSubject) return [];
    return sections.filter((section) => selectedSubject.sectionIds.includes(section.id));
  }, [selectedSubject, sections]);

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
        setMessage({ tone: "error", text: "You are not the primary staff for this subject." });
      } else {
        setMessage({ tone: "error", text: extractErrorMessage(err, "Could not mark attendance.") });
      }
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit = subjectId && sectionId && date && period && students.length > 0;

  if (loading) {
    return (
      <div>
        <div className="mb-6 border-b border-brass/20 pb-4">
          <h1 className="font-display text-2xl font-semibold text-ink">Mark Attendance</h1>
        </div>
        <p className="text-sm text-slate">Loading…</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div>
        <div className="mb-6 border-b border-brass/20 pb-4">
          <h1 className="font-display text-2xl font-semibold text-ink">Mark Attendance</h1>
        </div>
        <p className="text-sm text-oxblood">{loadError}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 border-b border-brass/20 pb-4">
        <h1 className="font-display text-2xl font-semibold text-ink">Mark Attendance</h1>
      </div>

      {ownedSubjects.length === 0 ? (
        <p className="text-sm text-slate">
          You are not the primary staff for any subject, so there is nothing to mark attendance for.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-8">
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
                {ownedSubjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
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
                    {section.name}
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

          <section>
            <div className="mb-2 flex items-baseline justify-between border-b border-brass/20 pb-2">
              <h2 className="font-display text-lg font-semibold text-ink">Students</h2>
            </div>

            {students.length === 0 ? (
              <p className="border-b border-brass/20 py-3 text-sm text-slate">
                {sectionId ? "No students are enrolled in this section." : "Select a section to see its students."}
              </p>
            ) : (
              <div className="flex flex-col">
                {students.map((student) => {
                  const present = !!presentByStudentId[student.id];
                  return (
                    <div
                      key={student.id}
                      className="flex items-center justify-between border-b border-brass/20 py-3"
                    >
                      <span className="text-sm text-ink">
                        {student.firstName} {student.lastName}
                      </span>
                      <button
                        type="button"
                        onClick={() => togglePresent(student.id)}
                        className={`w-24 rounded border px-3 py-1.5 text-xs font-medium uppercase tracking-wide transition-opacity hover:opacity-90 ${
                          present
                            ? "border-oxblood bg-oxblood text-paper"
                            : "border-oxblood text-oxblood"
                        }`}
                      >
                        {present ? "Present" : "Absent"}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {message && (
            <p className={`text-sm ${message.tone === "success" ? "text-slate" : "text-oxblood"}`}>
              {message.text}
            </p>
          )}

          <button type="submit" disabled={submitting || !canSubmit} className={primaryButtonClass}>
            {submitting ? "Marking…" : "Mark attendance"}
          </button>
        </form>
      )}
    </div>
  );
}
