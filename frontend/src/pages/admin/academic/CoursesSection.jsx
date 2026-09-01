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
import StatusBadge from "../../../components/StatusBadge";
import Card from "../../../components/Card";

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
    <div className="flex flex-col gap-6">
      <Card title="Add course">
        <form onSubmit={handleCreate} className="flex max-w-md items-end gap-4">
          <label className="flex flex-1 flex-col gap-1.5">
            <span className={labelClass}>Name</span>
            <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
          </label>
          <button type="submit" disabled={submitting} className={primaryButtonClass}>
            {submitting ? "Adding…" : "Add course"}
          </button>
        </form>

        {message && (
          <p className={`mt-4 text-sm ${message.tone === "success" ? "text-ink-secondary" : "text-danger"}`}>
            {message.text}
          </p>
        )}
      </Card>

      <Card title="Courses">
        {courses.length === 0 ? (
          <p className="py-3 text-sm text-ink-secondary">No courses yet.</p>
        ) : (
          <div className={tableWrapClass}>
            <table className="w-full text-left text-sm">
              <thead>
                <tr className={theadRowClass}>
                  <th className={thClass}>#</th>
                  <th className={thClass}>Name</th>
                  <th className={thClass}>Status</th>
                  <th className={`${thClass} text-right`}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {courses.map((course, i) => (
                  <tr key={course.id} className={trClass}>
                    {editingId === course.id ? (
                      <>
                        <td className={tdClass}>
                          <span className={folioClass}>{String(i + 1).padStart(2, "0")}</span>
                        </td>
                        <td className={tdClass} colSpan={2}>
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className={`${inputClass} max-w-xs`}
                          />
                        </td>
                        <td className={`${tdClass} text-right`}>
                          <div className="flex items-center justify-end gap-4">
                            <button type="button" onClick={() => handleSaveEdit(course.id)} className={rowActionClass}>
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
                        <td className={`${tdClass} font-medium`}>{course.name}</td>
                        <td className={tdClass}>
                          <StatusBadge status={course.active ? "ACTIVE" : "INACTIVE"} variant={course.active ? "positive" : "neutral"} />
                        </td>
                        <td className={`${tdClass} text-right`}>
                          <div className="flex items-center justify-end gap-4">
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
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
