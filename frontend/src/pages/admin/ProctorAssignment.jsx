import { useEffect, useState } from "react";
import apiClient from "../../api/client";

const inputClass =
  "border-0 border-b border-brass/40 bg-transparent px-0 py-2 text-sm text-ink outline-none focus:border-oxblood";
const labelClass = "text-xs font-medium uppercase tracking-wide text-slate";
const primaryButtonClass =
  "w-fit rounded bg-oxblood px-5 py-2.5 text-sm font-medium text-paper transition-opacity hover:opacity-90 disabled:opacity-50";

const EMPTY_FORM = { staffId: "", examSessionReference: "" };
const MAX_CASELOAD = 25;

function extractErrorMessage(err, fallback) {
  const status = err.response?.status;
  if (status === 400 && err.response?.data?.errors) {
    return Object.values(err.response.data.errors)[0] ?? fallback;
  }
  if (status === 409) return err.response.data?.message ?? fallback;
  return fallback;
}

export default function ProctorAssignment() {
  const [staff, setStaff] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setLoadError(null);
      try {
        const [staffRes, assignmentsRes] = await Promise.all([
          apiClient.get("/users", { params: { role: "STAFF" } }),
          apiClient.get("/proctor/assignments"),
        ]);
        if (cancelled) return;
        setStaff(staffRes.data);
        setAssignments(assignmentsRes.data);
      } catch {
        if (!cancelled) setLoadError("Could not load proctor assignments.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const caseloadByStaff = assignments.reduce((acc, a) => {
    acc[a.staffId] = (acc[a.staffId] ?? 0) + 1;
    return acc;
  }, {});

  async function handleCreate(e) {
    e.preventDefault();
    setMessage(null);
    setSubmitting(true);
    try {
      const { data } = await apiClient.post("/proctor/assignments", {
        staffId: Number(form.staffId),
        examSessionReference: form.examSessionReference,
      });
      setAssignments((prev) => [...prev, data]);
      setForm(EMPTY_FORM);
      setMessage({ tone: "success", text: "Proctor assigned." });
    } catch (err) {
      setMessage({ tone: "error", text: extractErrorMessage(err, "Could not create the assignment.") });
    } finally {
      setSubmitting(false);
    }
  }

  const canCreate = staff.length > 0;

  return (
    <div>
      <div className="mb-6 border-b border-brass/20 pb-4">
        <h1 className="font-display text-2xl font-semibold text-ink">Proctor Assignment</h1>
      </div>

      {loading ? (
        <p className="text-sm text-slate">Loading…</p>
      ) : loadError ? (
        <p className="text-sm text-oxblood">{loadError}</p>
      ) : (
        <>
          <section className="mb-8 border-b border-brass/20 pb-8">
            <h2 className="mb-4 font-display text-lg font-semibold text-ink">Assign a proctor</h2>

            {!canCreate ? (
              <p className="mb-4 text-sm text-slate">No staff members available to assign.</p>
            ) : (
              <form onSubmit={handleCreate} className="flex max-w-xl flex-col gap-5">
                <div className="grid grid-cols-2 gap-5">
                  <label className="flex flex-col gap-1.5">
                    <span className={labelClass}>Staff</span>
                    <select
                      required
                      value={form.staffId}
                      onChange={(e) => setForm((prev) => ({ ...prev, staffId: e.target.value }))}
                      className={inputClass}
                    >
                      <option value="" disabled>
                        Select a staff member
                      </option>
                      {staff.map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.firstName} {member.lastName}
                          {caseloadByStaff[member.id] ? ` (${caseloadByStaff[member.id]}/${MAX_CASELOAD})` : ""}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className={labelClass}>Exam session reference</span>
                    <input
                      type="text"
                      required
                      value={form.examSessionReference}
                      onChange={(e) => setForm((prev) => ({ ...prev, examSessionReference: e.target.value }))}
                      className={inputClass}
                    />
                  </label>
                </div>

                {message && (
                  <p className={`text-sm ${message.tone === "success" ? "text-slate" : "text-oxblood"}`}>
                    {message.text}
                  </p>
                )}

                <button type="submit" disabled={submitting} className={primaryButtonClass}>
                  {submitting ? "Assigning…" : "Assign proctor"}
                </button>
              </form>
            )}
          </section>

          <section>
            <h2 className="mb-4 font-display text-lg font-semibold text-ink">Assignments</h2>

            {assignments.length === 0 ? (
              <p className="border-b border-brass/20 py-3 text-sm text-slate">No proctor assignments yet.</p>
            ) : (
              <div className="flex flex-col">
                {assignments.map((assignment) => (
                  <div key={assignment.id} className="flex items-center justify-between border-b border-brass/20 py-3">
                    <span className="text-sm text-ink">{assignment.staffName}</span>
                    <span className="font-mono text-sm text-slate">{assignment.examSessionReference}</span>
                    <span className="font-mono text-xs text-slate">
                      {caseloadByStaff[assignment.staffId]}/{MAX_CASELOAD}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
