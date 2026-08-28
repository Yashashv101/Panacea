import { useState } from "react";
import apiClient from "../../../api/client";
import { inputClass, labelClass, primaryButtonClass, rowActionClass, extractErrorMessage } from "./formStyles";

const EMPTY_FORM = { number: "", label: "" };

export default function SemestersSection({ semesters, setSemesters }) {
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
      const { data } = await apiClient.post("/semesters", { number: Number(form.number), label: form.label });
      setSemesters((prev) => [...prev, data]);
      setForm(EMPTY_FORM);
      setMessage({ tone: "success", text: "Semester created." });
    } catch (err) {
      setMessage({ tone: "error", text: extractErrorMessage(err, "Could not create the semester.") });
    } finally {
      setSubmitting(false);
    }
  }

  function startEdit(semester) {
    setEditingId(semester.id);
    setEditForm({ number: String(semester.number), label: semester.label });
    setConfirmingDeleteId(null);
  }

  function cancelEdit() {
    setEditingId(null);
  }

  async function handleSaveEdit(id) {
    setMessage(null);
    try {
      const { data } = await apiClient.put(`/semesters/${id}`, {
        number: Number(editForm.number),
        label: editForm.label,
      });
      setSemesters((prev) => prev.map((s) => (s.id === id ? data : s)));
      cancelEdit();
    } catch (err) {
      setMessage({ tone: "error", text: extractErrorMessage(err, "Could not update the semester.") });
    }
  }

  async function handleDelete(id) {
    if (confirmingDeleteId !== id) {
      setConfirmingDeleteId(id);
      return;
    }
    setMessage(null);
    try {
      await apiClient.delete(`/semesters/${id}`);
      setSemesters((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      setMessage({ tone: "error", text: extractErrorMessage(err, "Could not delete the semester.") });
    } finally {
      setConfirmingDeleteId(null);
    }
  }

  return (
    <section className="mb-10 border-b border-brass/20 pb-8">
      <h2 className="mb-4 font-display text-lg font-semibold text-ink">Semesters</h2>

      <form onSubmit={handleCreate} className="mb-6 flex max-w-md items-end gap-4">
        <label className="flex w-24 flex-col gap-1.5">
          <span className={labelClass}>Number</span>
          <input
            type="number"
            min="1"
            required
            value={form.number}
            onChange={(e) => setForm((prev) => ({ ...prev, number: e.target.value }))}
            className={inputClass}
          />
        </label>
        <label className="flex flex-1 flex-col gap-1.5">
          <span className={labelClass}>Label</span>
          <input
            type="text"
            required
            value={form.label}
            onChange={(e) => setForm((prev) => ({ ...prev, label: e.target.value }))}
            className={inputClass}
          />
        </label>
        <button type="submit" disabled={submitting} className={primaryButtonClass}>
          {submitting ? "Adding…" : "Add semester"}
        </button>
      </form>

      {message && (
        <p className={`mb-4 text-sm ${message.tone === "success" ? "text-slate" : "text-oxblood"}`}>{message.text}</p>
      )}

      {semesters.length === 0 ? (
        <p className="border-b border-brass/20 py-3 text-sm text-slate">No semesters yet.</p>
      ) : (
        <div className="flex flex-col">
          {semesters.map((semester) => (
            <div key={semester.id} className="flex items-center justify-between border-b border-brass/20 py-3">
              {editingId === semester.id ? (
                <>
                  <div className="flex flex-1 items-center gap-4">
                    <input
                      type="number"
                      min="1"
                      value={editForm.number}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, number: e.target.value }))}
                      className={`${inputClass} w-20`}
                    />
                    <input
                      type="text"
                      value={editForm.label}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, label: e.target.value }))}
                      className={`${inputClass} max-w-xs flex-1`}
                    />
                  </div>
                  <div className="flex items-center gap-4">
                    <button type="button" onClick={() => handleSaveEdit(semester.id)} className={rowActionClass}>
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
                    <span className="font-mono text-sm text-slate">Sem {semester.number}</span>
                    <span className="text-sm text-ink">{semester.label}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <button type="button" onClick={() => startEdit(semester)} className={rowActionClass}>
                      Edit
                    </button>
                    <button type="button" onClick={() => handleDelete(semester.id)} className={rowActionClass}>
                      {confirmingDeleteId === semester.id ? "Confirm delete?" : "Delete"}
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
