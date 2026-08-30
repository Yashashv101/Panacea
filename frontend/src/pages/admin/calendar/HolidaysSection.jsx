import { useState } from "react";
import apiClient from "../../../api/client";
import { inputClass, labelClass, primaryButtonClass, rowActionClass, extractErrorMessage } from "../academic/formStyles";

const EMPTY_FORM = { date: "", name: "", description: "" };

export default function HolidaysSection({ holidays, setHolidays }) {
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
      const { data } = await apiClient.post("/calendar/holidays", form);
      setHolidays((prev) => [...prev, data].sort((a, b) => a.date.localeCompare(b.date)));
      setForm(EMPTY_FORM);
      setMessage({ tone: "success", text: "Holiday created." });
    } catch (err) {
      setMessage({ tone: "error", text: extractErrorMessage(err, "Could not create the holiday.") });
    } finally {
      setSubmitting(false);
    }
  }

  function startEdit(holiday) {
    setEditingId(holiday.id);
    setEditForm({ date: holiday.date, name: holiday.name, description: holiday.description ?? "" });
    setConfirmingDeleteId(null);
  }

  function cancelEdit() {
    setEditingId(null);
  }

  async function handleSaveEdit(id) {
    setMessage(null);
    try {
      const { data } = await apiClient.put(`/calendar/holidays/${id}`, editForm);
      setHolidays((prev) => prev.map((h) => (h.id === id ? data : h)).sort((a, b) => a.date.localeCompare(b.date)));
      cancelEdit();
    } catch (err) {
      setMessage({ tone: "error", text: extractErrorMessage(err, "Could not update the holiday.") });
    }
  }

  async function handleDelete(id) {
    if (confirmingDeleteId !== id) {
      setConfirmingDeleteId(id);
      return;
    }
    setMessage(null);
    try {
      await apiClient.delete(`/calendar/holidays/${id}`);
      setHolidays((prev) => prev.filter((h) => h.id !== id));
    } catch (err) {
      setMessage({ tone: "error", text: extractErrorMessage(err, "Could not delete the holiday.") });
    } finally {
      setConfirmingDeleteId(null);
    }
  }

  return (
    <section className="mb-10 border-b border-brass/20 pb-8">
      <h2 className="mb-4 font-display text-lg font-semibold text-ink">Holidays</h2>

      <form onSubmit={handleCreate} className="mb-6 flex max-w-2xl items-end gap-4">
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Date</span>
          <input
            type="date"
            required
            value={form.date}
            onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))}
            className={inputClass}
          />
        </label>
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
          <span className={labelClass}>Description (optional)</span>
          <input
            type="text"
            value={form.description}
            onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
            className={inputClass}
          />
        </label>
        <button type="submit" disabled={submitting} className={primaryButtonClass}>
          {submitting ? "Adding…" : "Add holiday"}
        </button>
      </form>

      {message && (
        <p className={`mb-4 text-sm ${message.tone === "success" ? "text-slate" : "text-oxblood"}`}>{message.text}</p>
      )}

      {holidays.length === 0 ? (
        <p className="border-b border-brass/20 py-3 text-sm text-slate">No holidays yet.</p>
      ) : (
        <div className="flex flex-col">
          {holidays.map((holiday) => (
            <div key={holiday.id} className="border-b border-brass/20 py-3">
              {editingId === holiday.id ? (
                <div className="flex items-end gap-4">
                  <input
                    type="date"
                    value={editForm.date}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, date: e.target.value }))}
                    className={inputClass}
                  />
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                    className={`${inputClass} flex-1`}
                  />
                  <input
                    type="text"
                    value={editForm.description}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, description: e.target.value }))}
                    className={`${inputClass} flex-1`}
                  />
                  <div className="flex items-center gap-4">
                    <button type="button" onClick={() => handleSaveEdit(holiday.id)} className={rowActionClass}>
                      Save
                    </button>
                    <button type="button" onClick={cancelEdit} className={rowActionClass}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="font-mono text-sm text-slate">{holiday.date}</span>
                    <span className="text-sm text-ink">{holiday.name}</span>
                    {holiday.description && <span className="text-xs text-slate">{holiday.description}</span>}
                  </div>
                  <div className="flex items-center gap-4">
                    <button type="button" onClick={() => startEdit(holiday)} className={rowActionClass}>
                      Edit
                    </button>
                    <button type="button" onClick={() => handleDelete(holiday.id)} className={rowActionClass}>
                      {confirmingDeleteId === holiday.id ? "Confirm delete?" : "Delete"}
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
