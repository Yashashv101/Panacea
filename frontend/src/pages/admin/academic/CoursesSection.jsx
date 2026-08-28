import { useState } from "react";
import apiClient from "../../../api/client";
import { inputClass, labelClass, primaryButtonClass, rowActionClass, extractErrorMessage } from "./formStyles";

export default function CoursesSection({ courses, setCourses }) {
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [confirmingDeleteId, setConfirmingDeleteId] = useState(null);

  async function handleCreate(e) {
    e.preventDefault();
    setMessage(null);
    setSubmitting(true);
    try {
      const { data } = await apiClient.post("/courses", { name });
      setCourses((prev) => [...prev, data]);
      setName("");
      setMessage({ tone: "success", text: "Course created." });
    } catch (err) {
      setMessage({ tone: "error", text: extractErrorMessage(err, "Could not create the course.") });
    } finally {
      setSubmitting(false);
    }
  }

  function startEdit(course) {
    setEditingId(course.id);
    setEditName(course.name);
    setConfirmingDeleteId(null);
  }

  function cancelEdit() {
    setEditingId(null);
  }

  async function handleSaveEdit(id) {
    setMessage(null);
    try {
      const { data } = await apiClient.put(`/courses/${id}`, { name: editName });
      setCourses((prev) => prev.map((c) => (c.id === id ? data : c)));
      cancelEdit();
    } catch (err) {
      setMessage({ tone: "error", text: extractErrorMessage(err, "Could not update the course.") });
    }
  }

  async function handleDelete(id) {
    if (confirmingDeleteId !== id) {
      setConfirmingDeleteId(id);
      return;
    }
    setMessage(null);
    try {
      await apiClient.delete(`/courses/${id}`);
      setCourses((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      setMessage({ tone: "error", text: extractErrorMessage(err, "Could not delete the course.") });
    } finally {
      setConfirmingDeleteId(null);
    }
  }

  return (
    <section className="mb-10 border-b border-brass/20 pb-8">
      <h2 className="mb-4 font-display text-lg font-semibold text-ink">Courses</h2>

      <form onSubmit={handleCreate} className="mb-6 flex max-w-md items-end gap-4">
        <label className="flex flex-1 flex-col gap-1.5">
          <span className={labelClass}>Name</span>
          <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
        </label>
        <button type="submit" disabled={submitting} className={primaryButtonClass}>
          {submitting ? "Adding…" : "Add course"}
        </button>
      </form>

      {message && (
        <p className={`mb-4 text-sm ${message.tone === "success" ? "text-slate" : "text-oxblood"}`}>{message.text}</p>
      )}

      {courses.length === 0 ? (
        <p className="border-b border-brass/20 py-3 text-sm text-slate">No courses yet.</p>
      ) : (
        <div className="flex flex-col">
          {courses.map((course) => (
            <div key={course.id} className="flex items-center justify-between border-b border-brass/20 py-3">
              {editingId === course.id ? (
                <>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className={`${inputClass} max-w-xs flex-1`}
                  />
                  <div className="flex items-center gap-4">
                    <button type="button" onClick={() => handleSaveEdit(course.id)} className={rowActionClass}>
                      Save
                    </button>
                    <button type="button" onClick={cancelEdit} className={rowActionClass}>
                      Cancel
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <span className="text-sm text-ink">{course.name}</span>
                  <div className="flex items-center gap-4">
                    <button type="button" onClick={() => startEdit(course)} className={rowActionClass}>
                      Edit
                    </button>
                    <button type="button" onClick={() => handleDelete(course.id)} className={rowActionClass}>
                      {confirmingDeleteId === course.id ? "Confirm delete?" : "Delete"}
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
