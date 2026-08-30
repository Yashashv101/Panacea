import { useEffect, useState } from "react";
import apiClient from "../../api/client";
import { useAuth } from "../../context/AuthContext";

const inputClass =
  "border-0 border-b border-brass/40 bg-transparent px-0 py-2 text-sm text-ink outline-none focus:border-oxblood";
const labelClass = "text-xs font-medium uppercase tracking-wide text-slate";
const primaryButtonClass =
  "w-fit rounded bg-oxblood px-5 py-2.5 text-sm font-medium text-paper transition-opacity hover:opacity-90 disabled:opacity-50";

const EMPTY_FORM = { assignmentType: "EXAM", staffId: "", examSessionReference: "", studentId: "" };
const MAX_CASELOAD = 25;

function extractErrorMessage(err, fallback) {
  const status = err.response?.status;
  if (status === 400 && err.response?.data?.errors) {
    return Object.values(err.response.data.errors)[0] ?? fallback;
  }
  if (status === 409) return err.response.data?.message ?? fallback;
  return fallback;
}

export default function ProctorAssignment() {
  const { role } = useAuth();
  // ADMIN and HOD can both create assignments server-side now
  // (ProctorAssignmentController). No per-option department check is needed
  // on the staff/student dropdowns below — they're populated from
  // GET /users, which is already HOD-scoped, so every option an HOD can
  // pick is already in their own department (and for MENTOR, the backend
  // additionally checks the student's own course, not just the staff's —
  // see ProctorAssignmentService#requireHodScopeAllowsStudent).
  const canAssign = role === "ADMIN" || role === "HOD";
  const [staff, setStaff] = useState([]);
  const [students, setStudents] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setLoadError(null);
      try {
        const requests = [apiClient.get("/proctor/assignments")];
        if (canAssign) {
          requests.push(
            apiClient.get("/users", { params: { role: "STAFF" } }),
            apiClient.get("/users", { params: { role: "STUDENT" } })
          );
        }
        const [assignmentsRes, staffRes, studentsRes] = await Promise.all(requests);
        if (cancelled) return;
        setAssignments(assignmentsRes.data);
        if (canAssign) {
          setStaff(staffRes.data);
          setStudents(studentsRes.data);
        }
      } catch {
        if (!cancelled) setLoadError("Could not load proctor assignments.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [canAssign]);

  // EXAM caseload and MENTOR caseload are each capped at 25 independently per
  // staff member (ProctorAssignmentService), so they're counted separately here.
  const caseloadByStaffAndType = assignments.reduce((acc, a) => {
    const key = `${a.staffId}:${a.assignmentType}`;
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
  const mentoredStudentIds = new Set(
    assignments.filter((a) => a.assignmentType === "MENTOR").map((a) => a.studentId)
  );

  async function handleCreate(e) {
    e.preventDefault();
    setMessage(null);
    setSubmitting(true);
    try {
      const { data } = await apiClient.post("/proctor/assignments", {
        staffId: Number(form.staffId),
        assignmentType: form.assignmentType,
        examSessionReference: form.assignmentType === "EXAM" ? form.examSessionReference : null,
        studentId: form.assignmentType === "MENTOR" ? Number(form.studentId) : null,
      });
      setAssignments((prev) => [...prev, data]);
      setForm(EMPTY_FORM);
      setMessage({ tone: "success", text: "Proctor assigned." });
    } catch (err) {
      setMessage({ tone: "error", text: extractErrorMessage(err, "Could not create the assignment.") });
    } finally {
      setSubmitting(false);
    }
  }

  const canCreate = staff.length > 0 && (form.assignmentType === "EXAM" || students.length > 0);

  return (
    <div>
      <div className="mb-6 border-b border-brass/20 pb-4">
        <h1 className="font-display text-2xl font-semibold text-ink">Proctor Assignment</h1>
      </div>

      {loading ? (
        <p className="text-sm text-slate">Loading…</p>
      ) : loadError ? (
        <p className="text-sm text-oxblood">{loadError}</p>
      ) : (
        <>
          {canAssign && (
          <section className="mb-8 border-b border-brass/20 pb-8">
            <h2 className="mb-4 font-display text-lg font-semibold text-ink">Assign a proctor</h2>

            {!canCreate ? (
              <p className="mb-4 text-sm text-slate">
                {staff.length === 0 ? "No staff members available to assign." : "No students available to mentor."}
              </p>
            ) : (
              <form onSubmit={handleCreate} className="flex max-w-xl flex-col gap-5">
                <div className="grid grid-cols-2 gap-5">
                  <label className="flex flex-col gap-1.5">
                    <span className={labelClass}>Type</span>
                    <select
                      value={form.assignmentType}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, assignmentType: e.target.value, examSessionReference: "", studentId: "" }))
                      }
                      className={inputClass}
                    >
                      <option value="EXAM">Exam invigilation</option>
                      <option value="MENTOR">Student mentor</option>
                    </select>
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className={labelClass}>Staff</span>
                    <select
                      required
                      value={form.staffId}
                      onChange={(e) => setForm((prev) => ({ ...prev, staffId: e.target.value }))}
                      className={inputClass}
                    >
                      <option value="" disabled>
                        Select a staff member
                      </option>
                      {staff.map((member) => {
                        const caseload = caseloadByStaffAndType[`${member.id}:${form.assignmentType}`] ?? 0;
                        return (
                          <option key={member.id} value={member.id}>
                            {member.firstName} {member.lastName} ({caseload}/{MAX_CASELOAD})
                          </option>
                        );
                      })}
                    </select>
                  </label>
                </div>

                {form.assignmentType === "EXAM" ? (
                  <label className="flex flex-col gap-1.5">
                    <span className={labelClass}>Exam session reference</span>
                    <input
                      type="text"
                      required
                      value={form.examSessionReference}
                      onChange={(e) => setForm((prev) => ({ ...prev, examSessionReference: e.target.value }))}
                      className={inputClass}
                    />
                  </label>
                ) : (
                  <label className="flex flex-col gap-1.5">
                    <span className={labelClass}>Student</span>
                    <select
                      required
                      value={form.studentId}
                      onChange={(e) => setForm((prev) => ({ ...prev, studentId: e.target.value }))}
                      className={inputClass}
                    >
                      <option value="" disabled>
                        Select a student
                      </option>
                      {students.map((student) => (
                        <option key={student.id} value={student.id} disabled={mentoredStudentIds.has(student.id)}>
                          {student.firstName} {student.lastName} ({student.email})
                          {mentoredStudentIds.has(student.id) ? " — already mentored" : ""}
                        </option>
                      ))}
                    </select>
                  </label>
                )}

                {message && (
                  <p className={`text-sm ${message.tone === "success" ? "text-slate" : "text-oxblood"}`}>
                    {message.text}
                  </p>
                )}

                <button type="submit" disabled={submitting} className={primaryButtonClass}>
                  {submitting ? "Assigning…" : "Assign proctor"}
                </button>
              </form>
            )}
          </section>
          )}

          <section>
            <h2 className="mb-4 font-display text-lg font-semibold text-ink">Assignments</h2>

            {assignments.length === 0 ? (
              <p className="border-b border-brass/20 py-3 text-sm text-slate">No proctor assignments yet.</p>
            ) : (
              <div className="flex flex-col">
                {assignments.map((assignment) => (
                  <div key={assignment.id} className="flex items-center justify-between border-b border-brass/20 py-3">
                    <span className="text-sm text-ink">{assignment.staffName}</span>
                    <span className="font-mono text-sm text-slate">
                      {assignment.assignmentType === "EXAM"
                        ? assignment.examSessionReference
                        : `Mentor of ${assignment.studentName}`}
                    </span>
                    <span className="font-mono text-xs text-slate">
                      {caseloadByStaffAndType[`${assignment.staffId}:${assignment.assignmentType}`]}/{MAX_CASELOAD}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
