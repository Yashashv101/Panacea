import { useEffect, useState } from "react";
import apiClient from "../api/client";
import StatusStamp from "../components/StatusStamp.jsx";
import { inputClass, labelClass, primaryButtonClass, extractErrorMessage } from "./admin/academic/formStyles";

const EMPTY_FORM = { reason: "", startDate: "", endDate: "" };

export default function LeaveRequestForm() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  async function load() {
    try {
      const { data } = await apiClient.get("/leave/requests/me");
      setRequests(data);
      setLoadError(null);
    } catch {
      setLoadError("Could not load your leave requests.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage(null);
    setSubmitting(true);
    try {
      await apiClient.post("/leave/requests", form);
      setForm(EMPTY_FORM);
      setMessage({ tone: "success", text: "Leave request submitted." });
      await load();
    } catch (err) {
      setMessage({ tone: "error", text: extractErrorMessage(err, "Could not submit the leave request.") });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div className="mb-6 border-b border-brass/20 pb-4">
        <h1 className="font-display text-2xl font-semibold text-ink">Leave Requests</h1>
      </div>

      <form onSubmit={handleSubmit} className="mb-8 flex max-w-xl flex-col gap-4 border-b border-brass/20 pb-8">
        <div className="flex gap-4">
          <label className="flex flex-1 flex-col gap-1.5">
            <span className={labelClass}>Start date</span>
            <input
              type="date"
              required
              value={form.startDate}
              onChange={(e) => setForm((prev) => ({ ...prev, startDate: e.target.value }))}
              className={inputClass}
            />
          </label>
          <label className="flex flex-1 flex-col gap-1.5">
            <span className={labelClass}>End date</span>
            <input
              type="date"
              required
              value={form.endDate}
              onChange={(e) => setForm((prev) => ({ ...prev, endDate: e.target.value }))}
              className={inputClass}
            />
          </label>
        </div>
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Reason</span>
          <textarea
            rows={3}
            required
            value={form.reason}
            onChange={(e) => setForm((prev) => ({ ...prev, reason: e.target.value }))}
            className={inputClass}
          />
        </label>
        <button type="submit" disabled={submitting} className={primaryButtonClass}>
          {submitting ? "Submitting…" : "Submit request"}
        </button>
        {message && (
          <p className={`text-sm ${message.tone === "success" ? "text-slate" : "text-oxblood"}`}>{message.text}</p>
        )}
      </form>

      <h2 className="mb-4 font-display text-lg font-semibold text-ink">My Requests</h2>

      {loading ? (
        <p className="text-sm text-slate">Loading…</p>
      ) : loadError ? (
        <p className="text-sm text-oxblood">{loadError}</p>
      ) : requests.length === 0 ? (
        <p className="border-b border-brass/20 py-3 text-sm text-slate">You haven't submitted any leave requests.</p>
      ) : (
        <div className="flex flex-col">
          {requests.map((request) => (
            <div key={request.id} className="border-b border-brass/20 py-3">
              <div className="flex items-center gap-4">
                <span className="font-mono text-sm text-slate">
                  {request.startDate} → {request.endDate}
                </span>
                <StatusStamp status={request.status} />
              </div>
              <p className="mt-1 max-w-2xl text-sm text-slate">{request.reason}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
