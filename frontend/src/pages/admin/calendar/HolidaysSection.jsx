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
} from "../academic/formStyles";
import Card from "../../../components/Card";

const EMPTY_FORM = { date: "", name: "", description: "" };

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function monthLabel(dateStr) {
  const [year, month] = dateStr.split("-");
  return `${MONTH_NAMES[Number(month) - 1]} ${year}`;
}

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
    <div className="flex flex-col gap-6">
      <Card title="Add holiday">
        <form onSubmit={handleCreate} className="flex max-w-2xl items-end gap-4">
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
          <p className={`mt-4 text-sm ${message.tone === "success" ? "text-ink-secondary" : "text-danger"}`}>
            {message.text}
          </p>
        )}
      </Card>

      {holidays.length === 0 ? (
        <Card title="Holidays">
          <p className="py-3 text-sm text-ink-secondary">No holidays yet.</p>
        </Card>
      ) : (
        Object.entries(
          holidays.reduce((acc, holiday) => {
            const label = monthLabel(holiday.date);
            (acc[label] ??= []).push(holiday);
            return acc;
          }, {})
        ).map(([label, monthHolidays]) => (
          <Card
            key={label}
            title={label}
            action={
              <span className="font-mono text-xs text-ink-muted">
                {monthHolidays.length} holiday{monthHolidays.length === 1 ? "" : "s"}
              </span>
            }
          >
            <div className={tableWrapClass}>
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className={theadRowClass}>
                    <th className={thClass}>#</th>
                    <th className={thClass}>Date</th>
                    <th className={thClass}>Name</th>
                    <th className={thClass}>Description</th>
                    <th className={`${thClass} text-right`}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {monthHolidays.map((holiday, i) => (
                    <tr key={holiday.id} className={trClass}>
                      {editingId === holiday.id ? (
                        <>
                          <td className={tdClass}>
                            <span className={folioClass}>{String(i + 1).padStart(2, "0")}</span>
                          </td>
                          <td className={tdClass} colSpan={3}>
                            <div className="flex items-center gap-3">
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
                            </div>
                          </td>
                          <td className={`${tdClass} text-right`}>
                            <div className="flex items-center justify-end gap-4">
                              <button
                                type="button"
                                onClick={() => handleSaveEdit(holiday.id)}
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
                          <td className={`${tdClass} font-mono`}>{holiday.date}</td>
                          <td className={`${tdClass} font-medium`}>{holiday.name}</td>
                          <td className={`${tdClass} text-ink-muted`}>{holiday.description || "—"}</td>
                          <td className={`${tdClass} text-right`}>
                            <div className="flex items-center justify-end gap-4">
                              <button type="button" onClick={() => startEdit(holiday)} className={rowActionClass}>
                                Edit
                              </button>
                              <button type="button" onClick={() => handleDelete(holiday.id)} className={rowActionClass}>
                                {confirmingDeleteId === holiday.id ? "Confirm delete?" : "Delete"}
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
        ))
      )}
    </div>
  );
}
