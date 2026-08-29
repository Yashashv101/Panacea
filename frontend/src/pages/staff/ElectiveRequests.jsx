import { useEffect, useState } from "react";
import apiClient from "../../api/client";
import { rowActionClass, extractErrorMessage } from "../admin/academic/formStyles";

export default function ElectiveRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [decidingId, setDecidingId] = useState(null);
  const [decideError, setDecideError] = useState(null);

  function load() {
    setLoading(true);
    apiClient
      .get("/enrollment/requests/pending")
      .then((res) => {
        setRequests(res.data);
        setLoadError(null);
      })
      .catch(() => setLoadError("Could not load pending elective requests."))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function decide(id, action) {
    setDecideError(null);
    setDecidingId(id);
    try {
      await apiClient.post(`/enrollment/requests/${id}/${action}`);
      setRequests((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      setDecideError(extractErrorMessage(err, "Could not record this decision."));
    } finally {
      setDecidingId(null);
    }
  }

  if (loading) {
    return (
      <div>
        <div className="mb-6 border-b border-brass/20 pb-4">
          <h1 className="font-display text-2xl font-semibold text-ink">Elective Requests</h1>
        </div>
        <p className="text-sm text-slate">Loading…</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div>
        <div className="mb-6 border-b border-brass/20 pb-4">
          <h1 className="font-display text-2xl font-semibold text-ink">Elective Requests</h1>
        </div>
        <p className="text-sm text-oxblood">{loadError}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 border-b border-brass/20 pb-4">
        <h1 className="font-display text-2xl font-semibold text-ink">Elective Requests</h1>
      </div>

      {decideError && <p className="mb-4 text-sm text-oxblood">{decideError}</p>}

      {requests.length === 0 ? (
        <p className="border-b border-brass/20 py-3 text-sm text-slate">
          No pending elective requests from your mentees.
        </p>
      ) : (
        <div className="flex flex-col">
          {requests.map((request) => (
            <div key={request.id} className="flex items-center justify-between border-b border-brass/20 py-3">
              <div>
                <div className="text-sm text-ink">{request.studentName}</div>
                <div className="mt-0.5 text-xs text-slate">{request.subjectName}</div>
              </div>
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  disabled={decidingId === request.id}
                  onClick={() => decide(request.id, "reject")}
                  className={rowActionClass}
                >
                  Reject
                </button>
                <button
                  type="button"
                  disabled={decidingId === request.id}
                  onClick={() => decide(request.id, "approve")}
                  className="text-xs font-medium uppercase tracking-wide text-oxblood hover:opacity-80 disabled:opacity-50"
                >
                  Approve
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
