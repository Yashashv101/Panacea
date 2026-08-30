import { useState } from "react";
import apiClient from "../../../api/client";
import { inputClass, labelClass, primaryButtonClass, rowActionClass, extractErrorMessage } from "../academic/formStyles";

const EMPTY_FORM = { startDate: "", endDate: "", name: "", description: "", semesterId: "", courseId: "" };

function toPayload(f) {
  return {
    startDate: f.startDate,
    endDate: f.endDate || null,
    name: f.name,
    description: f.description || null,
    semesterId: Number(f.semesterId),
    courseId: f.courseId ? Number(f.courseId) : null,
  };
}

export default function ExamSchedulesSection({ exams, setExams, semesters, courses }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState(null);

  function sortExams(list) {
    return [...list].sort((a, b) => a.startDate.localeCompare(b.startDate));
  }

  async function handleCreate(e) {
    e.preventDefault();
    setMessage(null);
    setSubmitting(true);
    try {
      const { data } = await apiClient.post("/calendar/exams", toPayload(form));
      setExams((prev) => sortExams([...prev, data]));
      setForm(EMPTY_FORM);
      setMessage({ tone: "success", text: "Exam schedule created." });
    } catch (err) {
      setMessage({ tone: "error", text: extractErrorMessage(err, "Could not create the exam schedule.") });
    } finally {
      setSubmitting(false);
    }
  }

  function startEdit(exam) {
    setEditingId(exam.id);
    setEditForm({
      startDate: exam.startDate,
      endDate: exam.endDate ?? "",
      name: exam.name,
      description: exam.description ?? "",
      semesterId: String(exam.semesterId),
      courseId: exam.courseId ? String(exam.courseId) : "",
    });
    setConfirmingDeleteId(null);
  }

  function cancelEdit() {
    setEditingId(null);
  }

  async function handleSaveEdit(id) {
    setMessage(null);
    try {
      const { data } = await apiClient.put(`/calendar/exams/${id}`, toPayload(editForm));
      setExams((prev) => sortExams(prev.map((x) => (x.id === id ? data : x))));
      cancelEdit();
    } catch (err) {
      setMessage({ tone: "error", text: extractErrorMessage(err, "Could not update the exam schedule.") });
    }
  }

  async function handleDelete(id) {
    if (confirmingDeleteId !== id) {
      setConfirmingDeleteId(id);
      return;
    }
    setMessage(null);
    try {
      await apiClient.delete(`/calendar/exams/${id}`);
      setExams((prev) => prev.filter((x) => x.id !== id));
    } catch (err) {
      setMessage({ tone: "error", text: extractErrorMessage(err, "Could not delete the exam schedule.") });
    } finally {
      setConfirmingDeleteId(null);
    }
  }

  function semesterLabel(id) {
    const semester = semesters.find((s) => s.id === id);
    return semester ? `Sem ${semester.number} — ${semester.label}` : "—";
  }

  function courseName(id) {
    if (!id) return "All departments";
    return courses.find((c) => c.id === id)?.name ?? "—";
  }

  const canCreate = semesters.length > 0;

  return (
    <section>
      <h2 className="mb-4 font-display text-lg font-semibold text-ink">Exam Schedules</h2>

      {!canCreate ? (
        <p className="mb-4 text-sm text-slate">Add at least one semester before scheduling exams.</p>
      ) : (
        <form onSubmit={handleCreate} className="mb-6 flex max-w-3xl flex-col gap-5">
          <div className="grid grid-cols-2 gap-5">
            <label className="flex flex-col gap-1.5">
              <span className={labelClass}>Start date</span>
              <input
                type="date"
                required
                value={form.startDate}
                onChange={(e) => setForm((prev) => ({ ...prev, startDate: e.target.value }))}
                className={inputClass}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={labelClass}>End date (optional, for a multi-day window)</span>
              <input
                type="date"
                value={form.endDate}
                onChange={(e) => setForm((prev) => ({ ...prev, endDate: e.target.value }))}
                className={inputClass}
              />
            </label>
          </div>
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
              <span className={labelClass}>Department (optional — leave blank for all)</span>
              <select
                value={form.courseId}
                onChange={(e) => setForm((prev) => ({ ...prev, courseId: e.target.value }))}
                className={inputClass}
              >
                <option value="">All departments</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>Description (optional)</span>
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              className={inputClass}
            />
          </label>
          <button type="submit" disabled={submitting} className={primaryButtonClass}>
            {submitting ? "Adding…" : "Add exam schedule"}
          </button>
        </form>
      )}

      {message && (
        <p className={`mb-4 text-sm ${message.tone === "success" ? "text-slate" : "text-oxblood"}`}>{message.text}</p>
      )}

      {exams.length === 0 ? (
        <p className="border-b border-brass/20 py-3 text-sm text-slate">No exam schedules yet.</p>
      ) : (
        <div className="flex flex-col">
          {exams.map((exam) => (
            <div key={exam.id} className="border-b border-brass/20 py-3">
              {editingId === exam.id ? (
                <div className="flex flex-col gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <input
                      type="date"
                      value={editForm.startDate}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, startDate: e.target.value }))}
                      className={inputClass}
                    />
                    <input
                      type="date"
                      value={editForm.endDate}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, endDate: e.target.value }))}
                      className={inputClass}
                    />
                  </div>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                    className={inputClass}
                  />
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
                      value={editForm.courseId}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, courseId: e.target.value }))}
                      className={inputClass}
                    >
                      <option value="">All departments</option>
                      {courses.map((course) => (
                        <option key={course.id} value={course.id}>
                          {course.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <input
                    type="text"
                    value={editForm.description}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, description: e.target.value }))}
                    className={inputClass}
                  />
                  <div className="flex items-center gap-4">
                    <button type="button" onClick={() => handleSaveEdit(exam.id)} className={rowActionClass}>
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
                      <span className="font-mono text-sm text-slate">
                        {exam.startDate}
                        {exam.endDate ? ` – ${exam.endDate}` : ""}
                      </span>
                      <span className="text-sm text-ink">{exam.name}</span>
                    </div>
                    <div className="mt-1 text-xs text-slate">
                      {semesterLabel(exam.semesterId)} · {courseName(exam.courseId)}
                      {exam.description ? ` · ${exam.description}` : ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <button type="button" onClick={() => startEdit(exam)} className={rowActionClass}>
                      Edit
                    </button>
                    <button type="button" onClick={() => handleDelete(exam.id)} className={rowActionClass}>
                      {confirmingDeleteId === exam.id ? "Confirm delete?" : "Delete"}
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
