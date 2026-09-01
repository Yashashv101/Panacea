import { useState } from "react";
import apiClient from "../../../api/client";
import {
  inputClass,
  labelClass,
  primaryButtonClass,
  rowActionClass,
  tableWrapClass,
  theadRowClass,
  thClass,
  tdClass,
  trClass,
  folioClass,
  extractErrorMessage,
} from "./formStyles";
import Card from "../../../components/Card";

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
    <div className="flex flex-col gap-6">
      <Card title="Add section">
        {courses.length === 0 ? (
          <p className="text-sm text-ink-secondary">Add a course first before creating sections.</p>
        ) : (
          <form onSubmit={handleCreate} className="flex max-w-lg items-end gap-4">
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
          <p className={`mt-4 text-sm ${message.tone === "success" ? "text-ink-secondary" : "text-danger"}`}>
            {message.text}
          </p>
        )}
      </Card>

      {sections.length === 0 ? (
        <Card title="Sections">
          <p className="py-3 text-sm text-ink-secondary">No sections yet.</p>
        </Card>
      ) : (
        courses
          .filter((course) => sections.some((s) => s.courseId === course.id))
          .map((course) => {
            const courseSections = sections.filter((s) => s.courseId === course.id);
            return (
              <Card
                key={course.id}
                title={course.name}
                action={
                  <span className="font-mono text-xs text-ink-muted">
                    {courseSections.length} section{courseSections.length === 1 ? "" : "s"}
                  </span>
                }
              >
                <div className={tableWrapClass}>
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className={theadRowClass}>
                        <th className={thClass}>#</th>
                        <th className={thClass}>Name</th>
                        <th className={`${thClass} text-right`}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {courseSections.map((section, i) => (
                        <tr key={section.id} className={trClass}>
                          {editingId === section.id ? (
                            <>
                              <td className={tdClass}>
                                <span className={folioClass}>{String(i + 1).padStart(2, "0")}</span>
                              </td>
                              <td className={tdClass}>
                                <div className="flex items-center gap-3">
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
                                    {courses.map((c) => (
                                      <option key={c.id} value={c.id}>
                                        {c.name}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </td>
                              <td className={`${tdClass} text-right`}>
                                <div className="flex items-center justify-end gap-4">
                                  <button
                                    type="button"
                                    onClick={() => handleSaveEdit(section.id)}
                                    className={rowActionClass}
                                  >
                                    Save
                                  </button>
                                  <button type="button" onClick={cancelEdit} className={rowActionClass}>
                                    Cancel
                                  </button>
                                </div>
                              </td>
                            </>
                          ) : (
                            <>
                              <td className={tdClass}>
                                <span className={folioClass}>{String(i + 1).padStart(2, "0")}</span>
                              </td>
                              <td className={`${tdClass} font-medium`}>{section.name}</td>
                              <td className={`${tdClass} text-right`}>
                                <div className="flex items-center justify-end gap-4">
                                  <button type="button" onClick={() => startEdit(section)} className={rowActionClass}>
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDelete(section.id)}
                                    className={rowActionClass}
                                  >
                                    {confirmingDeleteId === section.id ? "Confirm delete?" : "Delete"}
                                  </button>
                                </div>
                              </td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            );
          })
      )}
    </div>
  );
}
