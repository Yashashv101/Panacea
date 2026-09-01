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

const EMPTY_FORM = { startYear: "", endYear: "" };

export default function SessionsSection({ sessions, setSessions }) {
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
      const { data } = await apiClient.post("/sessions", {
        startYear: form.startYear,
        endYear: form.endYear,
      });
      setSessions((prev) => [...prev, data]);
      setForm(EMPTY_FORM);
      setMessage({ tone: "success", text: "Session created." });
    } catch (err) {
      setMessage({ tone: "error", text: extractErrorMessage(err, "Could not create the session.") });
    } finally {
      setSubmitting(false);
    }
  }

  function startEdit(session) {
    setEditingId(session.id);
    setEditForm({ startYear: session.startYear, endYear: session.endYear });
    setConfirmingDeleteId(null);
  }

  function cancelEdit() {
    setEditingId(null);
  }

  async function handleSaveEdit(id) {
    setMessage(null);
    try {
      const { data } = await apiClient.put(`/sessions/${id}`, {
        startYear: editForm.startYear,
        endYear: editForm.endYear,
      });
      setSessions((prev) => prev.map((s) => (s.id === id ? data : s)));
      cancelEdit();
    } catch (err) {
      setMessage({ tone: "error", text: extractErrorMessage(err, "Could not update the session.") });
    }
  }

  async function handleDelete(id) {
    if (confirmingDeleteId !== id) {
      setConfirmingDeleteId(id);
      return;
    }
    setMessage(null);
    try {
      await apiClient.delete(`/sessions/${id}`);
      setSessions((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      setMessage({
        tone: "error",
        text: extractErrorMessage(
          err,
          "Could not delete the session — sessions with semesters attached can't be removed."
        ),
      });
    } finally {
      setConfirmingDeleteId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Card title="Add session">
        <form onSubmit={handleCreate} className="flex max-w-md items-end gap-4">
          <label className="flex flex-1 flex-col gap-1.5">
            <span className={labelClass}>Start of session</span>
            <input
              type="date"
              required
              value={form.startYear}
              onChange={(e) => setForm((prev) => ({ ...prev, startYear: e.target.value }))}
              className={inputClass}
            />
          </label>
          <label className="flex flex-1 flex-col gap-1.5">
            <span className={labelClass}>End of session</span>
            <input
              type="date"
              required
              value={form.endYear}
              onChange={(e) => setForm((prev) => ({ ...prev, endYear: e.target.value }))}
              className={inputClass}
            />
          </label>
          <button type="submit" disabled={submitting} className={primaryButtonClass}>
            {submitting ? "Adding…" : "Add session"}
          </button>
        </form>

        {message && (
          <p className={`mt-4 text-sm ${message.tone === "success" ? "text-ink-secondary" : "text-danger"}`}>
            {message.text}
          </p>
        )}
      </Card>

      <Card title="Sessions">
        {sessions.length === 0 ? (
          <p className="py-3 text-sm text-ink-secondary">No sessions yet.</p>
        ) : (
          <div className={tableWrapClass}>
            <table className="w-full text-left text-sm">
              <thead>
                <tr className={theadRowClass}>
                  <th className={thClass}>#</th>
                  <th className={thClass}>Session</th>
                  <th className={`${thClass} text-right`}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((session, i) => (
                  <tr key={session.id} className={trClass}>
                    {editingId === session.id ? (
                      <>
                        <td className={tdClass}>
                          <span className={folioClass}>{String(i + 1).padStart(2, "0")}</span>
                        </td>
                        <td className={tdClass}>
                          <div className="flex items-center gap-3">
                            <input
                              type="date"
                              value={editForm.startYear}
                              onChange={(e) => setEditForm((prev) => ({ ...prev, startYear: e.target.value }))}
                              className={inputClass}
                            />
                            <input
                              type="date"
                              value={editForm.endYear}
                              onChange={(e) => setEditForm((prev) => ({ ...prev, endYear: e.target.value }))}
                              className={inputClass}
                            />
                          </div>
                        </td>
                        <td className={`${tdClass} text-right`}>
                          <div className="flex items-center justify-end gap-4">
                            <button type="button" onClick={() => handleSaveEdit(session.id)} className={rowActionClass}>
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
                        <td className={`${tdClass} font-mono`}>{session.label}</td>
                        <td className={`${tdClass} text-right`}>
                          <div className="flex items-center justify-end gap-4">
                            <button type="button" onClick={() => startEdit(session)} className={rowActionClass}>
                              Edit
                            </button>
                            <button type="button" onClick={() => handleDelete(session.id)} className={rowActionClass}>
                              {confirmingDeleteId === session.id ? "Confirm delete?" : "Delete"}
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
