import { useEffect, useState } from "react";
import apiClient from "../../api/client";
import { useAuth } from "../../context/AuthContext";

const inputClass =
  "border-0 border-b border-brass/40 bg-transparent px-0 py-2 text-sm text-ink outline-none focus:border-oxblood";
const labelClass = "text-xs font-medium uppercase tracking-wide text-slate";
const primaryButtonClass =
  "w-fit rounded bg-oxblood px-5 py-2.5 text-sm font-medium text-paper transition-opacity hover:opacity-90 disabled:opacity-50";

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

  return (
    <div>
      <div className="mb-6 border-b border-brass/20 pb-4">
        <h1 className="font-display text-2xl font-semibold text-ink">Staff Assignment</h1>
        <p className="mt-1 text-sm text-slate">
          Assign staff members to teach subjects per section (1 to N staff per subject).
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-slate">Loading…</p>
      ) : loadError ? (
        <p className="text-sm text-oxblood">{loadError}</p>
      ) : (
        <>
          {canAssign && (
            <section className="mb-8 border-b border-brass/20 pb-8">
              <h2 className="mb-4 font-display text-lg font-semibold text-ink">Assign teacher to section(s)</h2>

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
                        Select a staff member
                      </option>
                      {staff.map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.firstName} {member.lastName} ({member.email})
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
                          className="text-xs uppercase font-medium tracking-wide text-oxblood hover:underline"
                        >
                          {selectedSectionIds.size === availableSections.length ? "Deselect All" : "Select All"}
                        </button>
                      )}
                    </div>

                    {availableSections.length === 0 ? (
                      <p className="text-xs text-slate">No sections found for this subject.</p>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {availableSections.map((sec) => {
                          const isSelected = selectedSectionIds.has(sec.id);
                          const currentTeacher = currentAssignedStaffBySectionId[sec.id];
                          return (
                            <button
                              key={sec.id}
                              type="button"
                              onClick={() => toggleSection(sec.id)}
                              className={`flex flex-col items-start p-3 border text-left transition-colors rounded ${
                                isSelected
                                  ? "border-oxblood bg-card text-ink"
                                  : "border-brass/30 hover:border-brass/60 text-slate"
                              }`}
                            >
                              <span className="text-sm font-medium text-ink">Section {sec.name}</span>
                              <span className="text-[11px] text-slate mt-1">
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
                  <p className={`text-sm ${message.tone === "success" ? "text-slate" : "text-oxblood"}`}>
                    {message.text}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={submitting || !selectedSubjectId || !selectedStaffId || selectedSectionIds.size === 0}
                  className={primaryButtonClass}
                >
                  {submitting ? "Assigning…" : "Assign Staff"}
                </button>
              </form>
            </section>
          )}

          <section>
            <h2 className="mb-4 font-display text-lg font-semibold text-ink">
              Current Staff Assignments ({assignments.length})
            </h2>

            {assignments.length === 0 ? (
              <p className="border-b border-brass/20 py-3 text-sm text-slate">No staff assignments recorded yet.</p>
            ) : (
              <div className="flex flex-col">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-brass/30 text-xs font-medium uppercase tracking-wide text-slate">
                      <th className="py-2.5 pr-4">Subject</th>
                      <th className="py-2.5 pr-4">Course</th>
                      <th className="py-2.5 pr-4">Section</th>
                      <th className="py-2.5 pr-4">Assigned Staff</th>
                      {canAssign && <th className="py-2.5 text-right">Action</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {assignments.map((a) => (
                      <tr key={a.id} className="border-b border-brass/10 hover:bg-card/50 transition-colors">
                        <td className="py-3 pr-4 font-medium text-ink">{a.subjectName}</td>
                        <td className="py-3 pr-4 font-mono text-xs text-slate">{a.courseName ?? "—"}</td>
                        <td className="py-3 pr-4 font-mono text-xs text-ink">Section {a.sectionName}</td>
                        <td className="py-3 pr-4 text-slate">
                          <span className="text-ink">{a.staffName}</span>{" "}
                          <span className="text-xs font-mono text-slate">({a.staffEmail})</span>
                        </td>
                        {canAssign && (
                          <td className="py-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleUnassign(a.id)}
                              className="text-xs uppercase font-medium tracking-wide text-oxblood hover:underline"
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
            )}
          </section>
        </>
      )}
    </div>
  );
}
