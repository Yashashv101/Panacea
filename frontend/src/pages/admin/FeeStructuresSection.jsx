import { useState } from "react";
import apiClient from "../../api/client";
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
  extractErrorMessage,
} from "./academic/formStyles";
import Card from "../../components/Card";

const EMPTY_FORM = { courseId: "", semesterId: "", tuitionAmount: "", examFeeAmount: "" };

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

function toPayload(f) {
  return {
    courseId: Number(f.courseId),
    semesterId: Number(f.semesterId),
    tuitionAmount: f.tuitionAmount,
    examFeeAmount: f.examFeeAmount,
  };
}

export default function FeeStructuresSection({ feeStructures, setFeeStructures, courses, semesters }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);

  const semesterLabel = (id) => {
    const semester = semesters.find((s) => s.id === id);
    return semester ? `Sem ${semester.number} — ${semester.label}` : "—";
  };

  async function handleCreate(e) {
    e.preventDefault();
    setMessage(null);
    setSubmitting(true);
    try {
      const { data } = await apiClient.post("/fees/structures", toPayload(form));
      setFeeStructures((prev) => [...prev, data]);
      setForm(EMPTY_FORM);
      setMessage({ tone: "success", text: "Fee structure created." });
    } catch (err) {
      setMessage({ tone: "error", text: extractErrorMessage(err, "Could not create the fee structure.") });
    } finally {
      setSubmitting(false);
    }
  }

  function startEdit(structure) {
    setEditingId(structure.id);
    setEditForm({
      courseId: String(structure.courseId),
      semesterId: String(structure.semesterId),
      tuitionAmount: String(structure.tuitionAmount),
      examFeeAmount: String(structure.examFeeAmount),
    });
  }

  function cancelEdit() {
    setEditingId(null);
  }

  async function handleSaveEdit(id) {
    setMessage(null);
    try {
      const { data } = await apiClient.put(`/fees/structures/${id}`, toPayload(editForm));
      setFeeStructures((prev) => prev.map((f) => (f.id === id ? data : f)));
      cancelEdit();
    } catch (err) {
      setMessage({ tone: "error", text: extractErrorMessage(err, "Could not update the fee structure.") });
    }
  }

  const canCreate = courses.length > 0 && semesters.length > 0;

  return (
    <Card title="Fee Structures">
      {!canCreate ? (
        <p className="text-sm text-ink-secondary">Add at least one course and semester before setting fee structures.</p>
      ) : (
        <form onSubmit={handleCreate} className="mb-6 flex max-w-3xl flex-col gap-5">
          <div className="grid grid-cols-2 gap-5">
            <label className="flex flex-col gap-1.5">
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
          </div>
          <div className="grid grid-cols-2 gap-5">
            <label className="flex flex-col gap-1.5">
              <span className={labelClass}>Tuition amount</span>
              <input
                type="number"
                min="0"
                step="0.01"
                required
                value={form.tuitionAmount}
                onChange={(e) => setForm((prev) => ({ ...prev, tuitionAmount: e.target.value }))}
                className={inputClass}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={labelClass}>Exam fee amount</span>
              <input
                type="number"
                min="0"
                step="0.01"
                required
                value={form.examFeeAmount}
                onChange={(e) => setForm((prev) => ({ ...prev, examFeeAmount: e.target.value }))}
                className={inputClass}
              />
            </label>
          </div>
          <button type="submit" disabled={submitting} className={primaryButtonClass}>
            {submitting ? "Adding…" : "Add fee structure"}
          </button>
        </form>
      )}

      {message && (
        <p className={`mb-4 text-sm ${message.tone === "success" ? "text-ink-secondary" : "text-danger"}`}>
          {message.text}
        </p>
      )}

      {feeStructures.length === 0 ? (
        <p className="py-3 text-sm text-ink-secondary">No fee structures yet.</p>
      ) : (
        <div className={tableWrapClass}>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className={theadRowClass}>
                <th className={thClass}>Course</th>
                <th className={thClass}>Semester</th>
                <th className={thClass}>Tuition</th>
                <th className={thClass}>Exam fee</th>
                <th className={thClass}>Total</th>
                <th className={`${thClass} text-right`}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {feeStructures.map((structure) => (
                <tr key={structure.id} className={trClass}>
                  {editingId === structure.id ? (
                    <td colSpan={6} className="px-4 py-4">
                      <div className="flex flex-col gap-4">
                        <div className="grid grid-cols-2 gap-4">
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
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={editForm.tuitionAmount}
                            onChange={(e) => setEditForm((prev) => ({ ...prev, tuitionAmount: e.target.value }))}
                            className={inputClass}
                          />
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={editForm.examFeeAmount}
                            onChange={(e) => setEditForm((prev) => ({ ...prev, examFeeAmount: e.target.value }))}
                            className={inputClass}
                          />
                        </div>
                        <div className="flex items-center gap-4">
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(structure.id)}
                            className={primaryButtonClass}
                          >
                            Save
                          </button>
                          <button type="button" onClick={cancelEdit} className={rowActionClass}>
                            Cancel
                          </button>
                        </div>
                      </div>
                    </td>
                  ) : (
                    <>
                      <td className={`${tdClass} font-medium`}>{structure.courseName}</td>
                      <td className={`${tdClass} text-ink-secondary`}>{semesterLabel(structure.semesterId)}</td>
                      <td className={`${tdClass} font-mono`}>{currencyFormatter.format(structure.tuitionAmount)}</td>
                      <td className={`${tdClass} font-mono`}>{currencyFormatter.format(structure.examFeeAmount)}</td>
                      <td className={`${tdClass} font-mono font-semibold`}>
                        {currencyFormatter.format(structure.totalAmount)}
                      </td>
                      <td className={`${tdClass} text-right`}>
                        <button type="button" onClick={() => startEdit(structure)} className={rowActionClass}>
                          Edit
                        </button>
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
  );
}
