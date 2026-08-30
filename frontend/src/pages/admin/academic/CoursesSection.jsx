import { useState } from "react";
import apiClient from "../../../api/client";
import { inputClass, labelClass, primaryButtonClass, rowActionClass, extractErrorMessage } from "./formStyles";
import StatusStamp from "../../../components/StatusStamp";

export default function CoursesSection({ courses, setCourses }) {
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [confirmingActiveId, setConfirmingActiveId] = useState(null);

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
    setConfirmingActiveId(null);
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

  async function handleToggleActive(course) {
    if (confirmingActiveId !== course.id) {
      setConfirmingActiveId(course.id);
      return;
    }
    setMessage(null);
    setConfirmingActiveId(null);
    try {
      const { data } = await apiClient.patch(`/courses/${course.id}/active`, { active: !course.active });
      setCourses((prev) => prev.map((c) => (c.id === data.id ? data : c)));
    } catch (err) {
      setMessage({ tone: "error", text: extractErrorMessage(err, "Could not update the course's active state.") });
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
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-ink">{course.name}</span>
                    <StatusStamp status={course.active ? "ACTIVE" : "INACTIVE"} />
                  </div>
                  <div className="flex items-center gap-4">
                    <button type="button" onClick={() => startEdit(course)} className={rowActionClass}>
                      Edit
                    </button>
                    <button type="button" onClick={() => handleToggleActive(course)} className={rowActionClass}>
                      {confirmingActiveId === course.id
                        ? `Confirm ${course.active ? "deactivate" : "activate"}?`
                        : course.active
                        ? "Deactivate"
                        : "Activate"}
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
