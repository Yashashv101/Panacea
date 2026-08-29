import { useEffect, useMemo, useState } from "react";
import apiClient from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { inputClass, labelClass, primaryButtonClass, extractErrorMessage } from "../admin/academic/formStyles";

const EMPTY_COMPONENTS = { test1: "", test2: "", quiz: "", experiential: "", see: "" };

export default function EnterResults() {
  const { userId } = useAuth();

  const [subjects, setSubjects] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [subjectId, setSubjectId] = useState("");
  const [semesterId, setSemesterId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [components, setComponents] = useState(EMPTY_COMPONENTS);

  const [lookingUp, setLookingUp] = useState(false);
  const [existingResult, setExistingResult] = useState(null);

  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setLoadError(null);
      try {
        const [subjectsRes, semestersRes] = await Promise.all([
          apiClient.get("/subjects"),
          apiClient.get("/semesters"),
        ]);
        if (cancelled) return;
        setSubjects(subjectsRes.data);
        setSemesters(semestersRes.data);
      } catch {
        if (!cancelled) setLoadError("Could not load results data.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const ownedSubjects = useMemo(
    () => subjects.filter((subject) => subject.primaryStaffId === userId),
    [subjects, userId]
  );

  const selectedSubject = ownedSubjects.find((subject) => subject.id === Number(subjectId));

  function handleSubjectChange(value) {
    setSubjectId(value);
    const subject = ownedSubjects.find((s) => s.id === Number(value));
    setSemesterId(subject ? String(subject.semesterId) : "");
    setStudentId("");
  }

  // The roster depends on the selected subject's section(s) — a subject can be
  // taught to more than one section, so fetch each and merge, deduplicating by id.
  useEffect(() => {
    let cancelled = false;

    if (!selectedSubject || selectedSubject.sectionIds.length === 0) {
      setStudents([]);
      return () => {
        cancelled = true;
      };
    }

    Promise.all(
      selectedSubject.sectionIds.map((sectionId) =>
        apiClient.get("/students", { params: { sectionId } }).then((res) => res.data)
      )
    )
      .then((rosters) => {
        if (cancelled) return;
        const byId = new Map();
        rosters.flat().forEach((student) => byId.set(student.id, student));
        setStudents([...byId.values()]);
      })
      .catch(() => {
        if (!cancelled) setStudents([]);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedSubject]);

  // Pre-fill the form from any existing result once subject + semester + student are all chosen.
  useEffect(() => {
    if (!subjectId || !semesterId || !studentId) {
      setExistingResult(null);
      setComponents(EMPTY_COMPONENTS);
      return;
    }

    let cancelled = false;
    setLookingUp(true);
    setMessage(null);

    apiClient
      .get("/results", { params: { studentId, subjectId, semesterId } })
      .then((res) => {
        if (cancelled) return;
        if (res.status === 200 && res.data) {
          setExistingResult(res.data);
          setComponents({
            test1: String(res.data.test1),
            test2: String(res.data.test2),
            quiz: String(res.data.quiz),
            experiential: String(res.data.experiential),
            see: String(res.data.see),
          });
        } else {
          setExistingResult(null);
          setComponents(EMPTY_COMPONENTS);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setExistingResult(null);
          setComponents(EMPTY_COMPONENTS);
        }
      })
      .finally(() => {
        if (!cancelled) setLookingUp(false);
      });

    return () => {
      cancelled = true;
    };
  }, [subjectId, semesterId, studentId]);

  function updateComponent(field, value) {
    setComponents((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage(null);
    setSubmitting(true);
    try {
      const { data } = await apiClient.post("/results", {
        studentId: Number(studentId),
        subjectId: Number(subjectId),
        semesterId: Number(semesterId),
        test1: Number(components.test1),
        test2: Number(components.test2),
        quiz: Number(components.quiz),
        experiential: Number(components.experiential),
        see: Number(components.see),
      });
      setExistingResult(data);
      setMessage({
        tone: "success",
        text: `Result saved. Total: ${data.total.toFixed(1)}`,
      });
    } catch (err) {
      if (err.response?.status === 403) {
        setMessage({ tone: "error", text: "You are not the primary staff for this subject." });
      } else {
        setMessage({ tone: "error", text: extractErrorMessage(err, "Could not save the result.") });
      }
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit =
    subjectId &&
    semesterId &&
    studentId &&
    components.test1 !== "" &&
    components.test2 !== "" &&
    components.quiz !== "" &&
    components.experiential !== "" &&
    components.see !== "";

  if (loading) {
    return (
      <div>
        <div className="mb-6 border-b border-brass/20 pb-4">
          <h1 className="font-display text-2xl font-semibold text-ink">Enter Results</h1>
        </div>
        <p className="text-sm text-slate">Loading…</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div>
        <div className="mb-6 border-b border-brass/20 pb-4">
          <h1 className="font-display text-2xl font-semibold text-ink">Enter Results</h1>
        </div>
        <p className="text-sm text-oxblood">{loadError}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 border-b border-brass/20 pb-4">
        <h1 className="font-display text-2xl font-semibold text-ink">Enter Results</h1>
      </div>

      {ownedSubjects.length === 0 ? (
        <p className="text-sm text-slate">
          You are not the primary staff for any subject, so there is nothing to enter results for.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="flex max-w-2xl flex-col gap-8">
          <div className="grid grid-cols-2 gap-5">
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
              <span className={labelClass}>Semester</span>
              <select
                required
                disabled={!selectedSubject}
                value={semesterId}
                onChange={(e) => setSemesterId(e.target.value)}
                className={inputClass}
              >
                <option value="" disabled>
                  {selectedSubject ? "Select a semester" : "Select a subject first"}
                </option>
                {semesters.map((semester) => (
                  <option key={semester.id} value={semester.id}>
                    Sem {semester.number} — {semester.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>Student</span>
            <select
              required
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              className={inputClass}
            >
              <option value="" disabled>
                Select a student
              </option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.firstName} {student.lastName}
                </option>
              ))}
            </select>
            {selectedSubject && students.length === 0 && (
              <span className="text-xs text-slate">No students are enrolled in this subject's section.</span>
            )}
          </label>

          <section>
            <div className="mb-4 flex items-baseline justify-between border-b border-brass/20 pb-2">
              <h2 className="font-display text-lg font-semibold text-ink">Components</h2>
              {lookingUp && <span className="text-xs text-slate">Checking for an existing result…</span>}
              {!lookingUp && existingResult && (
                <span className="text-xs text-slate">Editing an existing result</span>
              )}
            </div>

            <div className="grid grid-cols-3 gap-5 sm:grid-cols-5">
              <label className="flex flex-col gap-1.5">
                <span className={labelClass}>Test 1</span>
                <input
                  type="number"
                  step="any"
                  required
                  value={components.test1}
                  onChange={(e) => updateComponent("test1", e.target.value)}
                  className={inputClass}
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className={labelClass}>Test 2</span>
                <input
                  type="number"
                  step="any"
                  required
                  value={components.test2}
                  onChange={(e) => updateComponent("test2", e.target.value)}
                  className={inputClass}
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className={labelClass}>Quiz</span>
                <input
                  type="number"
                  step="any"
                  required
                  value={components.quiz}
                  onChange={(e) => updateComponent("quiz", e.target.value)}
                  className={inputClass}
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className={labelClass}>Experiential</span>
                <input
                  type="number"
                  step="any"
                  required
                  value={components.experiential}
                  onChange={(e) => updateComponent("experiential", e.target.value)}
                  className={inputClass}
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className={labelClass}>SEE</span>
                <input
                  type="number"
                  step="any"
                  required
                  value={components.see}
                  onChange={(e) => updateComponent("see", e.target.value)}
                  className={inputClass}
                />
              </label>
            </div>
          </section>

          {message && (
            <p className={`text-sm ${message.tone === "success" ? "text-slate" : "text-oxblood"}`}>
              {message.text}
            </p>
          )}

          <button type="submit" disabled={submitting || !canSubmit} className={primaryButtonClass}>
            {submitting ? "Saving…" : existingResult ? "Update result" : "Save result"}
          </button>
        </form>
      )}
    </div>
  );
}
