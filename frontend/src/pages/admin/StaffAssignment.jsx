import { useEffect, useMemo, useState } from "react";
import apiClient from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import {
  inputClass,
  labelClass,
  primaryButtonClass,
  dangerActionClass,
  tableWrapClass,
  theadRowClass,
  thClass,
  tdClass,
  trClass,
  folioClass,
} from "./academic/formStyles";
import MetricCard from "../../components/MetricCard";
import Card from "../../components/Card";
import { BookOpen, Users, Grid3x3, UserCog } from "lucide-react";

function extractErrorMessage(err, fallback) {
  const status = err.response?.status;
  if (status === 400 && err.response?.data?.errors) {
    return Object.values(err.response.data.errors)[0] ?? fallback;
  }
  if (status === 409 || status === 400) return err.response.data?.message ?? fallback;
  return fallback;
}

export default function StaffAssignment() {
  const { role } = useAuth();
  const canAssign = role === "ADMIN" || role === "HOD";

  const [subjects, setSubjects] = useState([]);
  const [staff, setStaff] = useState([]);
  const [sections, setSections] = useState([]);
  const [assignments, setAssignments] = useState([]);

  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [selectedSectionIds, setSelectedSectionIds] = useState(new Set());

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
        const [subjectsRes, staffRes, sectionsRes, assignmentsRes] = await Promise.all([
          apiClient.get("/subjects"),
          apiClient.get("/users", { params: { role: "STAFF" } }),
          apiClient.get("/sections"),
          apiClient.get("/academic/staff-assignments"),
        ]);
        if (cancelled) return;
        setSubjects(subjectsRes.data);
        setStaff(staffRes.data);
        setSections(sectionsRes.data);
        setAssignments(assignmentsRes.data);
      } catch {
        if (!cancelled) setLoadError("Could not load staff assignment data.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedSubject = subjects.find((s) => String(s.id) === String(selectedSubjectId));

  // Sections that belong to the selected subject
  const availableSections = sections.filter((sec) => {
    if (!selectedSubject) return false;
    return (
      selectedSubject.sectionIds?.includes(sec.id) ||
      selectedSubject.courseIds?.includes(sec.courseId)
    );
  });

  // Lookup who is currently assigned to (selectedSubject, section)
  const currentAssignedStaffBySectionId = assignments
    .filter((a) => String(a.subjectId) === String(selectedSubjectId))
    .reduce((acc, a) => {
      acc[a.sectionId] = a.staffName;
      return acc;
    }, {});

  function toggleSection(sectionId) {
    setSelectedSectionIds((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  }

  function handleSelectAllSections() {
    if (selectedSectionIds.size === availableSections.length) {
      setSelectedSectionIds(new Set());
    } else {
      setSelectedSectionIds(new Set(availableSections.map((s) => s.id)));
    }
  }

  async function handleAssign(e) {
    e.preventDefault();
    setMessage(null);
    if (!selectedSubjectId || !selectedStaffId || selectedSectionIds.size === 0) {
      setMessage({ tone: "error", text: "Please select a subject, staff member, and at least one section." });
      return;
    }

    setSubmitting(true);
    try {
      await apiClient.post("/academic/staff-assignments", {
        subjectId: Number(selectedSubjectId),
        staffId: Number(selectedStaffId),
        sectionIds: Array.from(selectedSectionIds),
      });

      const { data } = await apiClient.get("/academic/staff-assignments");
      setAssignments(data);
      setSelectedSectionIds(new Set());
      setMessage({ tone: "success", text: "Staff assigned successfully." });
    } catch (err) {
      setMessage({ tone: "error", text: extractErrorMessage(err, "Could not assign staff.") });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUnassign(assignmentId) {
    try {
      await apiClient.delete(`/academic/staff-assignments/${assignmentId}`);
      setAssignments((prev) => prev.filter((a) => a.id !== assignmentId));
    } catch (err) {
      alert(extractErrorMessage(err, "Could not remove assignment."));
    }
  }

  const assignmentsByCourse = useMemo(
    () =>
      assignments.reduce((acc, a) => {
        const label = a.courseName ?? "Unassigned department";
        (acc[label] ??= []).push(a);
        return acc;
      }, {}),
    [assignments]
  );

  const filteredStaff = staff.filter((member) => {
    if (!selectedSubject || !selectedSubject.courseIds || selectedSubject.courseIds.length === 0) {
      return true;
    }
    if (!member.staffCourseId) return true;
    return selectedSubject.courseIds.includes(member.staffCourseId);
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-semibold text-ink">Staff Assignment</h1>
        <p className="mt-1 text-sm text-ink-secondary">
          Assign staff members to teach subjects per section (1 to N staff per subject).
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-ink-secondary">Loading…</p>
      ) : loadError ? (
        <p className="text-sm text-danger">{loadError}</p>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard label="Subjects" value={subjects.length} icon={BookOpen} />
            <MetricCard label="Staff" value={staff.length} icon={Users} />
            <MetricCard label="Sections" value={sections.length} icon={Grid3x3} />
            <MetricCard label="Assignments" value={assignments.length} icon={UserCog} />
          </div>

          {canAssign && (
            <Card title="Assign teacher to section(s)" className="mb-6">
              <form onSubmit={handleAssign} className="flex max-w-2xl flex-col gap-5">
                <div className="grid grid-cols-2 gap-5">
                  <label className="flex flex-col gap-1.5">
                    <span className={labelClass}>Subject</span>
                    <select
                      required
                      value={selectedSubjectId}
                      onChange={(e) => {
                        setSelectedSubjectId(e.target.value);
                        setSelectedSectionIds(new Set());
                        setSelectedStaffId("");
                      }}
                      className={inputClass}
                    >
                      <option value="" disabled>
                        Select a subject
                      </option>
                      {subjects.map((sub) => (
                        <option key={sub.id} value={sub.id}>
                          {sub.name} ({sub.type}, {sub.credits} credits)
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="flex flex-col gap-1.5">
                    <span className={labelClass}>Staff Member</span>
                    <select
                      required
                      value={selectedStaffId}
                      onChange={(e) => setSelectedStaffId(e.target.value)}
                      className={inputClass}
                    >
                      <option value="" disabled>
                        {filteredStaff.length === 0 ? "No staff in this department" : "Select a staff member"}
                      </option>
                      {filteredStaff.map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.firstName} {member.lastName}{" "}
                          {member.staffCourseName ? `(${member.staffCourseName})` : `(${member.email})`}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                {selectedSubject && (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className={labelClass}>Sections to assign</span>
                      {availableSections.length > 1 && (
                        <button
                          type="button"
                          onClick={handleSelectAllSections}
                          className="text-xs font-medium text-accent hover:underline"
                        >
                          {selectedSectionIds.size === availableSections.length ? "Deselect All" : "Select All"}
                        </button>
                      )}
                    </div>

                    {availableSections.length === 0 ? (
                      <p className="text-xs text-ink-muted">No sections found for this subject.</p>
                    ) : (
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        {availableSections.map((sec) => {
                          const isSelected = selectedSectionIds.has(sec.id);
                          const currentTeacher = currentAssignedStaffBySectionId[sec.id];
                          return (
                            <button
                              key={sec.id}
                              type="button"
                              onClick={() => toggleSection(sec.id)}
                              className={`flex flex-col items-start rounded-md border p-3 text-left transition-colors duration-150 ease-out ${
                                isSelected
                                  ? "border-accent bg-accent-soft text-ink"
                                  : "border-border text-ink-secondary hover:border-border-strong"
                              }`}
                            >
                              <span className="text-sm font-medium text-ink">Section {sec.name}</span>
                              <span className="mt-1 text-[11px] text-ink-muted">
                                {currentTeacher ? `Assigned: ${currentTeacher}` : "Unassigned"}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {message && (
                  <p className={`text-sm ${message.tone === "success" ? "text-ink-secondary" : "text-danger"}`}>
                    {message.text}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={submitting || !selectedSubjectId || !selectedStaffId || selectedSectionIds.size === 0}
                  className={`${primaryButtonClass} w-fit`}
                >
                  {submitting ? "Assigning…" : "Assign Staff"}
                </button>
              </form>
            </Card>
          )}

          <Card title={`Current Staff Assignments (${assignments.length})`}>
            {assignments.length === 0 ? (
              <p className="py-3 text-sm text-ink-secondary">No staff assignments recorded yet.</p>
            ) : (
              <div className="flex flex-col gap-6">
                {Object.entries(assignmentsByCourse).map(([courseLabel, courseAssignments]) => (
                  <div key={courseLabel}>
                    <div className="mb-1 flex items-baseline gap-3 border-b border-border-strong pb-1.5">
                      <span className="font-display text-sm font-semibold text-ink">{courseLabel}</span>
                      <span className="font-mono text-xs text-ink-muted">
                        {courseAssignments.length} assignment{courseAssignments.length === 1 ? "" : "s"}
                      </span>
                    </div>
                    <div className={tableWrapClass}>
                      <table className="w-full text-left text-sm">
                        <thead>
                          <tr className={theadRowClass}>
                            <th className={thClass}>#</th>
                            <th className={thClass}>Subject</th>
                            <th className={thClass}>Section</th>
                            <th className={thClass}>Assigned Staff</th>
                            {canAssign && <th className={`${thClass} text-right`}>Action</th>}
                          </tr>
                        </thead>
                        <tbody>
                          {courseAssignments.map((a, i) => (
                            <tr key={a.id} className={trClass}>
                              <td className={tdClass}>
                                <span className={folioClass}>{String(i + 1).padStart(2, "0")}</span>
                              </td>
                              <td className={`${tdClass} font-medium`}>{a.subjectName}</td>
                              <td className={`${tdClass} font-mono text-xs`}>Section {a.sectionName}</td>
                              <td className={`${tdClass} text-ink-secondary`}>
                                <span className="text-ink">{a.staffName}</span>{" "}
                                <span className="font-mono text-xs text-ink-muted">({a.staffEmail})</span>
                              </td>
                              {canAssign && (
                                <td className={`${tdClass} text-right`}>
                                  <button
                                    type="button"
                                    onClick={() => handleUnassign(a.id)}
                                    className={dangerActionClass}
                                  >
                                    Unassign
                                  </button>
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
