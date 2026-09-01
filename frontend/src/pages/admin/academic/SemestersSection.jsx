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

const EMPTY_FORM = { number: "", label: "", sessionId: "" };

// Derived from `number`, never independently settable — mirrors
// SemesterService#deriveParity on the backend, which rejects any
// mismatched value the caller sends.
function deriveParity(number) {
  return Number(number) % 2 === 1 ? "ODD" : "EVEN";
}

export default function SemestersSection({ semesters, setSemesters, sessions }) {
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
      const { data } = await apiClient.post("/semesters", {
        number: Number(form.number),
        label: form.label,
        sessionId: Number(form.sessionId),
        parity: deriveParity(form.number),
      });
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
    setEditForm({
      number: String(semester.number),
      label: semester.label,
      sessionId: String(semester.sessionId),
    });
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
        sessionId: Number(editForm.sessionId),
        parity: deriveParity(editForm.number),
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
    <div className="flex flex-col gap-6">
      <Card title="Add semester">
        <form onSubmit={handleCreate} className="flex max-w-2xl items-end gap-4">
          <label className="flex w-40 flex-col gap-1.5">
            <span className={labelClass}>Session</span>
            <select
              required
              value={form.sessionId}
              onChange={(e) => setForm((prev) => ({ ...prev, sessionId: e.target.value }))}
              className={inputClass}
            >
              <option value="" disabled>
                Select a session
              </option>
              {sessions.map((session) => (
                <option key={session.id} value={session.id}>
                  {session.label}
                </option>
              ))}
            </select>
          </label>
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
          <p className={`mt-4 text-sm ${message.tone === "success" ? "text-ink-secondary" : "text-danger"}`}>
            {message.text}
          </p>
        )}
      </Card>

      {semesters.length === 0 ? (
        <Card title="Semesters">
          <p className="py-3 text-sm text-ink-secondary">No semesters yet.</p>
        </Card>
      ) : (
        sessions
          .filter((session) => semesters.some((s) => s.sessionId === session.id))
          .map((session) => {
            const sessionSemesters = semesters
              .filter((s) => s.sessionId === session.id)
              .sort((a, b) => a.number - b.number);
            return (
              <Card
                key={session.id}
                title={session.label}
                action={
                  <span className="font-mono text-xs text-ink-muted">
                    {sessionSemesters.length} semester{sessionSemesters.length === 1 ? "" : "s"}
                  </span>
                }
              >
                <div className={tableWrapClass}>
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className={theadRowClass}>
                        <th className={thClass}>#</th>
                        <th className={thClass}>Label</th>
                        <th className={thClass}>Parity</th>
                        <th className={`${thClass} text-right`}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sessionSemesters.map((semester) => (
                        <tr key={semester.id} className={trClass}>
                          {editingId === semester.id ? (
                            <>
                              <td className={tdClass}>
                                <span className={folioClass}>{String(semester.number).padStart(2, "0")}</span>
                              </td>
                              <td className={tdClass} colSpan={2}>
                                <div className="flex items-center gap-3">
                                  <select
                                    value={editForm.sessionId}
                                    onChange={(e) => setEditForm((prev) => ({ ...prev, sessionId: e.target.value }))}
                                    className={`${inputClass} w-32`}
                                  >
                                    {sessions.map((s) => (
                                      <option key={s.id} value={s.id}>
                                        {s.label}
                                      </option>
                                    ))}
                                  </select>
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
                              </td>
                              <td className={`${tdClass} text-right`}>
                                <div className="flex items-center justify-end gap-4">
                                  <button
                                    type="button"
                                    onClick={() => handleSaveEdit(semester.id)}
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
                                <span className={folioClass}>{String(semester.number).padStart(2, "0")}</span>
                              </td>
                              <td className={`${tdClass} font-medium`}>{semester.label}</td>
                              <td className={`${tdClass} text-ink-secondary`}>{semester.parity}</td>
                              <td className={`${tdClass} text-right`}>
                                <div className="flex items-center justify-end gap-4">
                                  <button type="button" onClick={() => startEdit(semester)} className={rowActionClass}>
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDelete(semester.id)}
                                    className={rowActionClass}
                                  >
                                    {confirmingDeleteId === semester.id ? "Confirm delete?" : "Delete"}
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
            );
          })
      )}
    </div>
  );
}
