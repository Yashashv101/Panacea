import { useState } from "react";
import apiClient from "../../../api/client";
import { inputClass, labelClass, primaryButtonClass, rowActionClass, extractErrorMessage } from "./formStyles";

const EMPTY_FORM = { name: "", credits: "", primaryStaffId: "", semesterId: "", courseIds: [], sectionIds: [] };

function toggleId(list, id) {
  return list.includes(id) ? list.filter((existing) => existing !== id) : [...list, id];
}

export default function SubjectsSection({ subjects, setSubjects, semesters, courses, sections, staff }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState(null);

  function toPayload(f) {
    return {
      name: f.name,
      credits: Number(f.credits),
      primaryStaffId: f.primaryStaffId ? Number(f.primaryStaffId) : null,
      semesterId: Number(f.semesterId),
      courseIds: f.courseIds.map(Number),
      sectionIds: f.sectionIds.map(Number),
    };
  }

  async function handleCreate(e) {
    e.preventDefault();
    setMessage(null);
    setSubmitting(true);
    try {
      const { data } = await apiClient.post("/subjects", toPayload(form));
      setSubjects((prev) => [...prev, data]);
      setForm(EMPTY_FORM);
      setMessage({ tone: "success", text: "Subject created." });
    } catch (err) {
      setMessage({ tone: "error", text: extractErrorMessage(err, "Could not create the subject.") });
    } finally {
      setSubmitting(false);
    }
  }

  function startEdit(subject) {
    setEditingId(subject.id);
    setEditForm({
      name: subject.name,
      credits: String(subject.credits),
      primaryStaffId: subject.primaryStaffId ? String(subject.primaryStaffId) : "",
      semesterId: String(subject.semesterId),
      courseIds: subject.courseIds.map(String),
      sectionIds: subject.sectionIds.map(String),
    });
    setConfirmingDeleteId(null);
  }

  function cancelEdit() {
    setEditingId(null);
  }

  async function handleSaveEdit(id) {
    setMessage(null);
    try {
      const { data } = await apiClient.put(`/subjects/${id}`, toPayload(editForm));
      setSubjects((prev) => prev.map((s) => (s.id === id ? data : s)));
      cancelEdit();
    } catch (err) {
      setMessage({ tone: "error", text: extractErrorMessage(err, "Could not update the subject.") });
    }
  }

  async function handleDelete(id) {
    if (confirmingDeleteId !== id) {
      setConfirmingDeleteId(id);
      return;
    }
    setMessage(null);
    try {
      await apiClient.delete(`/subjects/${id}`);
      setSubjects((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      setMessage({ tone: "error", text: extractErrorMessage(err, "Could not delete the subject.") });
    } finally {
      setConfirmingDeleteId(null);
    }
  }

  function courseNames(ids) {
    return courses.filter((c) => ids.includes(c.id)).map((c) => c.name).join(", ") || "—";
  }

  function sectionNames(ids) {
    return sections.filter((s) => ids.includes(s.id)).map((s) => s.name).join(", ") || "—";
  }

  const canCreate = semesters.length > 0 && courses.length > 0 && sections.length > 0;

  return (
    <section>
      <h2 className="mb-4 font-display text-lg font-semibold text-ink">Subjects</h2>

      {!canCreate ? (
        <p className="mb-4 text-sm text-slate">
          Add at least one semester, course, and section before creating subjects.
        </p>
      ) : (
        <form onSubmit={handleCreate} className="mb-6 flex max-w-2xl flex-col gap-5">
          <div className="grid grid-cols-2 gap-5">
            <label className="flex flex-col gap-1.5">
              <span className={labelClass}>Name</span>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                className={inputClass}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={labelClass}>Credits</span>
              <input
                type="number"
                min="1"
                required
                value={form.credits}
                onChange={(e) => setForm((prev) => ({ ...prev, credits: e.target.value }))}
                className={inputClass}
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-5">
            <label className="flex flex-col gap-1.5">
              <span className={labelClass}>Semester</span>
              <select
                required
                value={form.semesterId}
                onChange={(e) => setForm((prev) => ({ ...prev, semesterId: e.target.value }))}
                className={inputClass}
              >
                <option value="" disabled>
                  Select a semester
                </option>
                {semesters.map((semester) => (
                  <option key={semester.id} value={semester.id}>
                    Sem {semester.number} — {semester.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={labelClass}>Primary staff (optional)</span>
              <select
                value={form.primaryStaffId}
                onChange={(e) => setForm((prev) => ({ ...prev, primaryStaffId: e.target.value }))}
                className={inputClass}
              >
                <option value="">Unassigned</option>
                {staff.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.firstName} {member.lastName}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-5">
            <fieldset className="flex flex-col gap-1.5">
              <legend className={labelClass}>Courses</legend>
              <div className="flex flex-wrap gap-x-4 gap-y-2 pt-1">
                {courses.map((course) => (
                  <label key={course.id} className="flex items-center gap-1.5 text-sm text-ink">
                    <input
                      type="checkbox"
                      className="accent-oxblood"
                      checked={form.courseIds.includes(String(course.id))}
                      onChange={() =>
                        setForm((prev) => ({ ...prev, courseIds: toggleId(prev.courseIds, String(course.id)) }))
                      }
                    />
                    {course.name}
                  </label>
                ))}
              </div>
            </fieldset>
            <fieldset className="flex flex-col gap-1.5">
              <legend className={labelClass}>Sections</legend>
              <div className="flex flex-wrap gap-x-4 gap-y-2 pt-1">
                {sections.map((section) => (
                  <label key={section.id} className="flex items-center gap-1.5 text-sm text-ink">
                    <input
                      type="checkbox"
                      className="accent-oxblood"
                      checked={form.sectionIds.includes(String(section.id))}
                      onChange={() =>
                        setForm((prev) => ({ ...prev, sectionIds: toggleId(prev.sectionIds, String(section.id)) }))
                      }
                    />
                    {section.name}
                  </label>
                ))}
              </div>
            </fieldset>
          </div>

          <button type="submit" disabled={submitting} className={primaryButtonClass}>
            {submitting ? "Adding…" : "Add subject"}
          </button>
        </form>
      )}

      {message && (
        <p className={`mb-4 text-sm ${message.tone === "success" ? "text-slate" : "text-oxblood"}`}>{message.text}</p>
      )}

      {subjects.length === 0 ? (
        <p className="border-b border-brass/20 py-3 text-sm text-slate">No subjects yet.</p>
      ) : (
        <div className="flex flex-col">
          {subjects.map((subject) => (
            <div key={subject.id} className="border-b border-brass/20 py-3">
              {editingId === subject.id ? (
                <div className="flex flex-col gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                      className={inputClass}
                    />
                    <input
                      type="number"
                      min="1"
                      value={editForm.credits}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, credits: e.target.value }))}
                      className={inputClass}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <select
                      value={editForm.semesterId}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, semesterId: e.target.value }))}
                      className={inputClass}
                    >
                      {semesters.map((semester) => (
                        <option key={semester.id} value={semester.id}>
                          Sem {semester.number} — {semester.label}
                        </option>
                      ))}
                    </select>
                    <select
                      value={editForm.primaryStaffId}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, primaryStaffId: e.target.value }))}
                      className={inputClass}
                    >
                      <option value="">Unassigned</option>
                      {staff.map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.firstName} {member.lastName}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-wrap gap-x-4 gap-y-2">
                      {courses.map((course) => (
                        <label key={course.id} className="flex items-center gap-1.5 text-sm text-ink">
                          <input
                            type="checkbox"
                            className="accent-oxblood"
                            checked={editForm.courseIds.includes(String(course.id))}
                            onChange={() =>
                              setEditForm((prev) => ({
                                ...prev,
                                courseIds: toggleId(prev.courseIds, String(course.id)),
                              }))
                            }
                          />
                          {course.name}
                        </label>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-2">
                      {sections.map((section) => (
                        <label key={section.id} className="flex items-center gap-1.5 text-sm text-ink">
                          <input
                            type="checkbox"
                            className="accent-oxblood"
                            checked={editForm.sectionIds.includes(String(section.id))}
                            onChange={() =>
                              setEditForm((prev) => ({
                                ...prev,
                                sectionIds: toggleId(prev.sectionIds, String(section.id)),
                              }))
                            }
                          />
                          {section.name}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <button type="button" onClick={() => handleSaveEdit(subject.id)} className={rowActionClass}>
                      Save
                    </button>
                    <button type="button" onClick={cancelEdit} className={rowActionClass}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-ink">{subject.name}</span>
                      <span className="font-mono text-sm text-slate">{subject.credits} cr</span>
                      <span className="text-sm text-slate">{subject.primaryStaffName ?? "Unassigned"}</span>
                    </div>
                    <div className="mt-1 text-xs text-slate">
                      {courseNames(subject.courseIds)} · {sectionNames(subject.sectionIds)}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <button type="button" onClick={() => startEdit(subject)} className={rowActionClass}>
                      Edit
                    </button>
                    <button type="button" onClick={() => handleDelete(subject.id)} className={rowActionClass}>
                      {confirmingDeleteId === subject.id ? "Confirm delete?" : "Delete"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
