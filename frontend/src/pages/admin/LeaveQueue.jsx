import { useEffect, useMemo, useState } from "react";
import apiClient from "../../api/client";
import StatusBadge from "../../components/StatusBadge";
import MetricCard from "../../components/MetricCard";
import Card from "../../components/Card";
import { tableWrapClass, theadRowClass, thClass, tdClass, trClass, rowActionClass } from "./academic/formStyles";
import { useAuth } from "../../context/AuthContext";
import { Clock, CheckCircle2, XCircle, ListChecks } from "lucide-react";

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

  const counts = useMemo(
    () => ({
      pending: requests.filter((r) => r.status === "PENDING").length,
      approved: requests.filter((r) => r.status === "APPROVED").length,
      rejected: requests.filter((r) => r.status === "REJECTED").length,
    }),
    [requests]
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-semibold text-ink">Leave Requests</h1>
      </div>

      {statusFilter === "ALL" && (
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <MetricCard label="Pending" value={counts.pending} icon={Clock} tone={counts.pending > 0 ? "warning" : "default"} />
          <MetricCard label="Approved" value={counts.approved} icon={CheckCircle2} tone="success" />
          <MetricCard label="Rejected" value={counts.rejected} icon={XCircle} tone="danger" />
        </div>
      )}

      <Card
        title="Requests"
        action={
          <div className="flex items-center gap-1">
            {STATUS_FILTERS.map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setStatusFilter(filter)}
                className={`rounded px-3 py-1.5 text-xs font-medium transition-colors duration-150 ease-out ${
                  statusFilter === filter ? "bg-accent-soft text-accent" : "text-ink-secondary hover:text-ink"
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        }
      >
        {message && (
          <p className={`mb-4 text-sm ${message.tone === "success" ? "text-ink-secondary" : "text-danger"}`}>
            {message.text}
          </p>
        )}

        {loading ? (
          <p className="text-sm text-ink-secondary">Loading…</p>
        ) : loadError ? (
          <p className="text-sm text-danger">{loadError}</p>
        ) : requests.length === 0 ? (
          <p className="flex items-center gap-2 py-4 text-sm text-ink-secondary">
            <ListChecks className="h-4 w-4" aria-hidden="true" />
            No leave requests.
          </p>
        ) : (
          <div className={`${tableWrapClass} max-h-[32rem] overflow-y-auto`}>
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 z-10">
                <tr className={theadRowClass}>
                  <th className={thClass}>Requester</th>
                  <th className={thClass}>Dates</th>
                  <th className={thClass}>Reason</th>
                  <th className={thClass}>Status</th>
                  {canDecide && <th className={`${thClass} text-right`}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {requests.map((request) => (
                  <tr key={request.id} className={trClass}>
                    <td className={`${tdClass} font-medium`}>{request.requesterName}</td>
                    <td className={`${tdClass} font-mono text-xs`}>
                      {request.startDate} → {request.endDate}
                    </td>
                    <td className={`${tdClass} max-w-sm text-ink-secondary`}>{request.reason}</td>
                    <td className={tdClass}>
                      <StatusBadge status={request.status} />
                    </td>
                    {canDecide && (
                      <td className={`${tdClass} text-right`}>
                        {request.status === "PENDING" && (
                          <div className="flex items-center justify-end gap-4">
                            <button
                              type="button"
                              disabled={decidingId === request.id}
                              onClick={() => handleDecision(request.id, "approve")}
                              className={`${rowActionClass} disabled:opacity-50`}
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              disabled={decidingId === request.id}
                              onClick={() => handleDecision(request.id, "reject")}
                              className="text-xs font-medium text-danger transition-colors duration-150 ease-out hover:underline disabled:opacity-50"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </td>
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
