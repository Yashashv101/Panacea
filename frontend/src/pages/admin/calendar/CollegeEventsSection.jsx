import { useState } from "react";
import apiClient from "../../../api/client";
import { inputClass, labelClass, primaryButtonClass, rowActionClass, extractErrorMessage } from "../academic/formStyles";

const EMPTY_FORM = { date: "", title: "", description: "", timeOfDay: "", location: "" };

function toPayload(f) {
  return {
    date: f.date,
    title: f.title,
    description: f.description || null,
    timeOfDay: f.timeOfDay || null,
    location: f.location || null,
  };
}

export default function CollegeEventsSection({ events, setEvents }) {
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
      const { data } = await apiClient.post("/calendar/events", toPayload(form));
      setEvents((prev) => [...prev, data].sort((a, b) => a.date.localeCompare(b.date)));
      setForm(EMPTY_FORM);
      setMessage({ tone: "success", text: "Event created." });
    } catch (err) {
      setMessage({ tone: "error", text: extractErrorMessage(err, "Could not create the event.") });
    } finally {
      setSubmitting(false);
    }
  }

  function startEdit(event) {
    setEditingId(event.id);
    setEditForm({
      date: event.date,
      title: event.title,
      description: event.description ?? "",
      timeOfDay: event.timeOfDay ?? "",
      location: event.location ?? "",
    });
    setConfirmingDeleteId(null);
  }

  function cancelEdit() {
    setEditingId(null);
  }

  async function handleSaveEdit(id) {
    setMessage(null);
    try {
      const { data } = await apiClient.put(`/calendar/events/${id}`, toPayload(editForm));
      setEvents((prev) => prev.map((e) => (e.id === id ? data : e)).sort((a, b) => a.date.localeCompare(b.date)));
      cancelEdit();
    } catch (err) {
      setMessage({ tone: "error", text: extractErrorMessage(err, "Could not update the event.") });
    }
  }

  async function handleDelete(id) {
    if (confirmingDeleteId !== id) {
      setConfirmingDeleteId(id);
      return;
    }
    setMessage(null);
    try {
      await apiClient.delete(`/calendar/events/${id}`);
      setEvents((prev) => prev.filter((e) => e.id !== id));
    } catch (err) {
      setMessage({ tone: "error", text: extractErrorMessage(err, "Could not delete the event.") });
    } finally {
      setConfirmingDeleteId(null);
    }
  }

  return (
    <section className="mb-10 border-b border-brass/20 pb-8">
      <h2 className="mb-4 font-display text-lg font-semibold text-ink">College Events</h2>

      <form onSubmit={handleCreate} className="mb-6 flex max-w-3xl flex-col gap-5">
        <div className="grid grid-cols-2 gap-5">
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
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>Title</span>
            <input
              type="text"
              required
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              className={inputClass}
            />
          </label>
        </div>
        <div className="grid grid-cols-3 gap-5">
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>Time (optional)</span>
            <input
              type="time"
              value={form.timeOfDay}
              onChange={(e) => setForm((prev) => ({ ...prev, timeOfDay: e.target.value }))}
              className={inputClass}
            />
          </label>
          <label className="col-span-2 flex flex-col gap-1.5">
            <span className={labelClass}>Location (optional)</span>
            <input
              type="text"
              value={form.location}
              onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))}
              className={inputClass}
            />
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
          {submitting ? "Adding…" : "Add event"}
        </button>
      </form>

      {message && (
        <p className={`mb-4 text-sm ${message.tone === "success" ? "text-slate" : "text-oxblood"}`}>{message.text}</p>
      )}

      {events.length === 0 ? (
        <p className="border-b border-brass/20 py-3 text-sm text-slate">No events yet.</p>
      ) : (
        <div className="flex flex-col">
          {events.map((event) => (
            <div key={event.id} className="border-b border-brass/20 py-3">
              {editingId === event.id ? (
                <div className="flex flex-col gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <input
                      type="date"
                      value={editForm.date}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, date: e.target.value }))}
                      className={inputClass}
                    />
                    <input
                      type="text"
                      value={editForm.title}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, title: e.target.value }))}
                      className={inputClass}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <input
                      type="time"
                      value={editForm.timeOfDay}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, timeOfDay: e.target.value }))}
                      className={inputClass}
                    />
                    <input
                      type="text"
                      value={editForm.location}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, location: e.target.value }))}
                      className={`${inputClass} col-span-2`}
                    />
                  </div>
                  <input
                    type="text"
                    value={editForm.description}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, description: e.target.value }))}
                    className={inputClass}
                  />
                  <div className="flex items-center gap-4">
                    <button type="button" onClick={() => handleSaveEdit(event.id)} className={rowActionClass}>
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
                      <span className="font-mono text-sm text-slate">{event.date}</span>
                      <span className="text-sm text-ink">{event.title}</span>
                      {event.timeOfDay && <span className="font-mono text-xs text-slate">{event.timeOfDay}</span>}
                    </div>
                    {(event.location || event.description) && (
                      <div className="mt-1 text-xs text-slate">
                        {[event.location, event.description].filter(Boolean).join(" · ")}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <button type="button" onClick={() => startEdit(event)} className={rowActionClass}>
                      Edit
                    </button>
                    <button type="button" onClick={() => handleDelete(event.id)} className={rowActionClass}>
                      {confirmingDeleteId === event.id ? "Confirm delete?" : "Delete"}
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
