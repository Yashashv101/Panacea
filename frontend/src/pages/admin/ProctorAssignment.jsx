import { useEffect, useMemo, useState } from "react";
import apiClient from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import {
  inputClass,
  labelClass,
  primaryButtonClass,
  tableWrapClass,
  theadRowClass,
  thClass,
  tdClass,
  trClass,
  folioClass,
} from "./academic/formStyles";
import MetricCard from "../../components/MetricCard";
import Card from "../../components/Card";
import { UserCog, GraduationCap, UserCheck, ClipboardList } from "lucide-react";

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
  const [sections, setSections] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [activeTab, setActiveTab] = useState("EXAM");

  // Students in the selected staff member's own department, fetched lazily
  // per department (there's no bulk "students by course" endpoint for
  // ADMIN — only by-section — same approach as the Users page's department
  // drill-down). Keyed by courseId so switching between staff in the same
  // department doesn't refetch.
  const [studentsByCourse, setStudentsByCourse] = useState({});
  const [studentsLoadingCourseId, setStudentsLoadingCourseId] = useState(null);

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
            apiClient.get("/users", { params: { role: "STUDENT" } }),
            apiClient.get("/sections")
          );
        }
        const [assignmentsRes, staffRes, studentsRes, sectionsRes] = await Promise.all(requests);
        if (cancelled) return;
        setAssignments(assignmentsRes.data);
        if (canAssign) {
          setStaff(staffRes.data);
          setStudents(studentsRes.data);
          setSections(sectionsRes.data);
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

  async function loadStudentsForCourse(courseId) {
    if (studentsByCourse[courseId]) return;
    setStudentsLoadingCourseId(courseId);
    try {
      const courseSections = sections.filter((sec) => String(sec.courseId) === String(courseId));
      const results = await Promise.all(
        courseSections.map((sec) => apiClient.get("/students", { params: { sectionId: sec.id } }))
      );
      const merged = results.flatMap(({ data }) => data);
      setStudentsByCourse((prev) => ({ ...prev, [courseId]: merged }));
    } catch {
      // Leave the department's slot unset — the picker falls back to the
      // full student list below rather than showing a dead end.
    } finally {
      setStudentsLoadingCourseId((prev) => (prev === courseId ? null : prev));
    }
  }

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

  const examAssignments = assignments.filter((a) => a.assignmentType === "EXAM");
  const mentorAssignments = assignments.filter((a) => a.assignmentType === "MENTOR");
  const staffWithCaseload = new Set(assignments.map((a) => a.staffId)).size;

  const tabs = useMemo(
    () => [
      { key: "EXAM", label: "Exam Invigilation", count: examAssignments.length },
      { key: "MENTOR", label: "Student Mentors", count: mentorAssignments.length },
    ],
    [examAssignments.length, mentorAssignments.length]
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
  const visibleAssignments = activeTab === "EXAM" ? examAssignments : mentorAssignments;

  const selectedStaff = staff.find((member) => String(member.id) === String(form.staffId));
  // Once a staff member is picked, narrow the student list to their own
  // department — falls back to the full roster if that staff member has no
  // department or the department fetch hasn't resolved yet.
  const departmentStudents =
    selectedStaff?.staffCourseId && studentsByCourse[selectedStaff.staffCourseId]
      ? studentsByCourse[selectedStaff.staffCourseId]
      : students;
  const isLoadingDepartmentStudents =
    selectedStaff?.staffCourseId && studentsLoadingCourseId === selectedStaff.staffCourseId;

  function handleStaffChange(staffId) {
    setForm((prev) => ({ ...prev, staffId, studentId: "" }));
    const member = staff.find((s) => String(s.id) === String(staffId));
    if (member?.staffCourseId) {
      loadStudentsForCourse(member.staffCourseId);
    }
  }

  useEffect(() => {
    // Covers switching Type to "Student mentor" after a staff member is
    // already selected (staffId isn't cleared on a Type change).
    if (form.assignmentType === "MENTOR" && selectedStaff?.staffCourseId) {
      loadStudentsForCourse(selectedStaff.staffCourseId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.assignmentType, selectedStaff?.staffCourseId]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-semibold text-ink">Proctor Assignment</h1>
        <p className="mt-1 text-sm text-ink-secondary">Exam invigilation duty and student mentorship caseloads.</p>
      </div>

      {loading ? (
        <p className="text-sm text-ink-secondary">Loading…</p>
      ) : loadError ? (
        <p className="text-sm text-danger">{loadError}</p>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard label="Staff on duty" value={staffWithCaseload} icon={UserCog} />
            <MetricCard label="Exam invigilation" value={examAssignments.length} icon={ClipboardList} />
            <MetricCard label="Student mentors" value={mentorAssignments.length} icon={GraduationCap} />
            <MetricCard label="Total assignments" value={assignments.length} icon={UserCheck} />
          </div>

          {canAssign && (
            <Card title="Assign a proctor" className="mb-6">
              {!canCreate ? (
                <p className="text-sm text-ink-secondary">
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
                          setForm((prev) => ({
                            ...prev,
                            assignmentType: e.target.value,
                            examSessionReference: "",
                            studentId: "",
                          }))
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
                        onChange={(e) => handleStaffChange(e.target.value)}
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
                        disabled={!form.staffId || isLoadingDepartmentStudents}
                        value={form.studentId}
                        onChange={(e) => setForm((prev) => ({ ...prev, studentId: e.target.value }))}
                        className={inputClass}
                      >
                        <option value="" disabled>
                          {!form.staffId
                            ? "Select a staff member first"
                            : isLoadingDepartmentStudents
                            ? "Loading students…"
                            : "Select a student"}
                        </option>
                        {departmentStudents.map((student) => (
                          <option key={student.id} value={student.id} disabled={mentoredStudentIds.has(student.id)}>
                            {student.firstName} {student.lastName} ({student.email})
                            {mentoredStudentIds.has(student.id) ? " — already mentored" : ""}
                          </option>
                        ))}
                      </select>
                      {form.staffId && !isLoadingDepartmentStudents && selectedStaff?.staffCourseId && (
                        <span className="text-xs text-ink-muted">
                          Showing students in {selectedStaff.staffCourseName ?? "this department"}.
                        </span>
                      )}
                    </label>
                  )}

                  {message && (
                    <p className={`text-sm ${message.tone === "success" ? "text-ink-secondary" : "text-danger"}`}>
                      {message.text}
                    </p>
                  )}

                  <button type="submit" disabled={submitting} className={primaryButtonClass}>
                    {submitting ? "Assigning…" : "Assign proctor"}
                  </button>
                </form>
              )}
            </Card>
          )}

          <Card
            title="Assignments"
            action={
              <nav className="flex flex-wrap items-center gap-x-6">
                {tabs.map((tab) => {
                  const isActive = activeTab === tab.key;
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setActiveTab(tab.key)}
                      className={`text-sm font-medium transition-colors duration-150 ease-out ${
                        isActive ? "text-accent" : "text-ink-secondary hover:text-ink"
                      }`}
                    >
                      {tab.label} ({tab.count})
                    </button>
                  );
                })}
              </nav>
            }
          >
            {visibleAssignments.length === 0 ? (
              <p className="py-3 text-sm text-ink-secondary">
                No {activeTab === "EXAM" ? "exam invigilation" : "student mentor"} assignments yet.
              </p>
            ) : (
              <div className={tableWrapClass}>
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className={theadRowClass}>
                      <th className={thClass}>#</th>
                      <th className={thClass}>Staff</th>
                      <th className={thClass}>{activeTab === "EXAM" ? "Exam session" : "Mentee"}</th>
                      <th className={`${thClass} text-right`}>Caseload</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleAssignments.map((assignment, i) => (
                      <tr key={assignment.id} className={trClass}>
                        <td className={tdClass}>
                          <span className={folioClass}>{String(i + 1).padStart(2, "0")}</span>
                        </td>
                        <td className={`${tdClass} font-medium`}>{assignment.staffName}</td>
                        <td className={`${tdClass} text-ink-secondary`}>
                          {assignment.assignmentType === "EXAM"
                            ? assignment.examSessionReference
                            : `Mentor of ${assignment.studentName}`}
                        </td>
                        <td className={`${tdClass} text-right font-mono`}>
                          {caseloadByStaffAndType[`${assignment.staffId}:${assignment.assignmentType}`]}/{MAX_CASELOAD}
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
