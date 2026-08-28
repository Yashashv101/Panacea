import { useState } from "react";
import apiClient from "../../../api/client";
import { inputClass, labelClass, primaryButtonClass, rowActionClass, extractErrorMessage } from "./formStyles";

const EMPTY_FORM = { name: "", courseId: "" };

export default function SectionsSection({ sections, setSections, courses }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState(null);

  async function handleCreate(e) {
    e.preventDefault();
    setMessage(null);
    setSubmitting(true);
    try {
      const { data } = await apiClient.post("/sections", { name: form.name, courseId: Number(form.courseId) });
      setSections((prev) => [...prev, data]);
      setForm(EMPTY_FORM);
      setMessage({ tone: "success", text: "Section created." });
    } catch (err) {
      setMessage({ tone: "error", text: extractErrorMessage(err, "Could not create the section.") });
    } finally {
      setSubmitting(false);
    }
  }

  function startEdit(section) {
    setEditingId(section.id);
    setEditForm({ name: section.name, courseId: String(section.courseId) });
    setConfirmingDeleteId(null);
  }

  function cancelEdit() {
    setEditingId(null);
  }

  async function handleSaveEdit(id) {
    setMessage(null);
    try {
      const { data } = await apiClient.put(`/sections/${id}`, {
        name: editForm.name,
        courseId: Number(editForm.courseId),
      });
      setSections((prev) => prev.map((s) => (s.id === id ? data : s)));
      cancelEdit();
    } catch (err) {
      setMessage({ tone: "error", text: extractErrorMessage(err, "Could not update the section.") });
    }
  }

  async function handleDelete(id) {
    if (confirmingDeleteId !== id) {
      setConfirmingDeleteId(id);
      return;
    }
    setMessage(null);
    try {
      await apiClient.delete(`/sections/${id}`);
      setSections((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      setMessage({ tone: "error", text: extractErrorMessage(err, "Could not delete the section.") });
    } finally {
      setConfirmingDeleteId(null);
    }
  }

  return (
    <section className="mb-10 border-b border-brass/20 pb-8">
      <h2 className="mb-4 font-display text-lg font-semibold text-ink">Sections</h2>

      {courses.length === 0 ? (
        <p className="mb-4 text-sm text-slate">Add a course first before creating sections.</p>
      ) : (
        <form onSubmit={handleCreate} className="mb-6 flex max-w-lg items-end gap-4">
          <label className="flex flex-1 flex-col gap-1.5">
            <span className={labelClass}>Name</span>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              className={inputClass}
            />
          </label>
          <label className="flex flex-1 flex-col gap-1.5">
            <span className={labelClass}>Course</span>
            <select
              required
              value={form.courseId}
              onChange={(e) => setForm((prev) => ({ ...prev, courseId: e.target.value }))}
              className={inputClass}
            >
              <option value="" disabled>
                Select a course
              </option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.name}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" disabled={submitting} className={primaryButtonClass}>
            {submitting ? "Adding…" : "Add section"}
          </button>
        </form>
      )}

      {message && (
        <p className={`mb-4 text-sm ${message.tone === "success" ? "text-slate" : "text-oxblood"}`}>{message.text}</p>
      )}

      {sections.length === 0 ? (
        <p className="border-b border-brass/20 py-3 text-sm text-slate">No sections yet.</p>
      ) : (
        <div className="flex flex-col">
          {sections.map((section) => (
            <div key={section.id} className="flex items-center justify-between border-b border-brass/20 py-3">
              {editingId === section.id ? (
                <>
                  <div className="flex flex-1 items-center gap-4">
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                      className={`${inputClass} max-w-xs`}
                    />
                    <select
                      value={editForm.courseId}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, courseId: e.target.value }))}
                      className={inputClass}
                    >
                      {courses.map((course) => (
                        <option key={course.id} value={course.id}>
                          {course.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-4">
                    <button type="button" onClick={() => handleSaveEdit(section.id)} className={rowActionClass}>
                      Save
                    </button>
                    <button type="button" onClick={cancelEdit} className={rowActionClass}>
                      Cancel
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-ink">{section.name}</span>
                    <span className="text-sm text-slate">{section.courseName}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <button type="button" onClick={() => startEdit(section)} className={rowActionClass}>
                      Edit
                    </button>
                    <button type="button" onClick={() => handleDelete(section.id)} className={rowActionClass}>
                      {confirmingDeleteId === section.id ? "Confirm delete?" : "Delete"}
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
