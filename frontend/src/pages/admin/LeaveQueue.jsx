import { useEffect, useState } from "react";
import apiClient from "../../api/client";
import StatusStamp from "../../components/StatusStamp";
import { useAuth } from "../../context/AuthContext";

const STATUS_FILTERS = ["PENDING", "APPROVED", "REJECTED", "ALL"];

export default function LeaveQueue() {
  const { role } = useAuth();
  // ADMIN and HOD can both approve/reject server-side now (LeaveController).
  // No per-item department check is needed here: GET /leave/requests is
  // already HOD-scoped (LeaveService#findAll), so every row an HOD sees in
  // this list already belongs to their own department — there's no row an
  // HOD could see but be rejected for acting on.
  const canDecide = role === "ADMIN" || role === "HOD";
  const [statusFilter, setStatusFilter] = useState("PENDING");
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [decidingId, setDecidingId] = useState(null);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setLoadError(null);
      try {
        const { data } = await apiClient.get("/leave/requests", {
          params: statusFilter === "ALL" ? {} : { status: statusFilter },
        });
        if (!cancelled) setRequests(data);
      } catch {
        if (!cancelled) setLoadError("Could not load leave requests.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [statusFilter]);

  async function handleDecision(id, decision) {
    setMessage(null);
    setDecidingId(id);
    try {
      const { data } = await apiClient.post(`/leave/requests/${id}/${decision}`);
      if (statusFilter === "ALL") {
        setRequests((prev) => prev.map((r) => (r.id === id ? data : r)));
      } else {
        setRequests((prev) => prev.filter((r) => r.id !== id));
      }
      setMessage({
        tone: "success",
        text: decision === "approve" ? "Leave request approved." : "Leave request rejected.",
      });
    } catch (err) {
      const backendMessage = err.response?.data?.message;
      setMessage({
        tone: "error",
        text: backendMessage ?? "Could not update the leave request.",
      });
    } finally {
      setDecidingId(null);
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between border-b border-brass/20 pb-4">
        <h1 className="font-display text-2xl font-semibold text-ink">Leave Requests</h1>
        <div className="flex items-center gap-1">
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setStatusFilter(filter)}
              className={`rounded px-3 py-1.5 text-xs font-medium uppercase tracking-wide transition-colors ${
                statusFilter === filter ? "bg-card text-oxblood" : "text-slate hover:text-ink"
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {message && (
        <p className={`mb-4 text-sm ${message.tone === "success" ? "text-slate" : "text-oxblood"}`}>{message.text}</p>
      )}

      {loading ? (
        <p className="text-sm text-slate">Loading…</p>
      ) : loadError ? (
        <p className="text-sm text-oxblood">{loadError}</p>
      ) : requests.length === 0 ? (
        <p className="border-b border-brass/20 py-3 text-sm text-slate">No leave requests.</p>
      ) : (
        <div className="flex flex-col">
          {requests.map((request) => (
            <div key={request.id} className="flex items-center justify-between border-b border-brass/20 py-3">
              <div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-ink">{request.requesterName}</span>
                  <span className="font-mono text-sm text-slate">
                    {request.startDate} → {request.endDate}
                  </span>
                  <StatusStamp status={request.status} />
                </div>
                <p className="mt-1 max-w-2xl text-sm text-slate">{request.reason}</p>
              </div>

              {canDecide && request.status === "PENDING" && (
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    disabled={decidingId === request.id}
                    onClick={() => handleDecision(request.id, "approve")}
                    className="text-xs font-medium uppercase tracking-wide text-slate hover:text-oxblood disabled:opacity-50"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    disabled={decidingId === request.id}
                    onClick={() => handleDecision(request.id, "reject")}
                    className="text-xs font-medium uppercase tracking-wide text-slate hover:text-oxblood disabled:opacity-50"
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
