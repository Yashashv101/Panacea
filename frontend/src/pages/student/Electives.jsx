import { useEffect, useState } from "react";
import apiClient from "../../api/client";
import StatusStamp from "../../components/StatusStamp.jsx";
import { primaryButtonClass, extractErrorMessage } from "../admin/academic/formStyles";

export default function Electives() {
  const [electives, setElectives] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [requestingId, setRequestingId] = useState(null);
  const [requestError, setRequestError] = useState(null);

  async function load() {
    try {
      const [electivesRes, requestsRes] = await Promise.all([
        apiClient.get("/enrollment/electives"),
        apiClient.get("/enrollment/requests/me"),
      ]);
      setElectives(electivesRes.data);
      setRequests(requestsRes.data);
      setLoadError(null);
    } catch {
      setLoadError("Could not load electives.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function requestForSubject(subjectId) {
    return requests.find((r) => r.subjectId === subjectId && r.status !== "REJECTED");
  }

  async function handleRequest(subjectId) {
    setRequestError(null);
    setRequestingId(subjectId);
    try {
      await apiClient.post("/enrollment/requests", { subjectId });
      await load();
    } catch (err) {
      setRequestError(extractErrorMessage(err, "Could not submit this request."));
    } finally {
      setRequestingId(null);
    }
  }

  if (loading) {
    return (
      <div>
        <div className="mb-6 border-b border-brass/20 pb-4">
          <h1 className="font-display text-2xl font-semibold text-ink">Electives</h1>
        </div>
        <p className="text-sm text-slate">Loading…</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div>
        <div className="mb-6 border-b border-brass/20 pb-4">
          <h1 className="font-display text-2xl font-semibold text-ink">Electives</h1>
        </div>
        <p className="text-sm text-oxblood">{loadError}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 border-b border-brass/20 pb-4">
        <h1 className="font-display text-2xl font-semibold text-ink">Electives</h1>
      </div>

      {requestError && <p className="mb-4 text-sm text-oxblood">{requestError}</p>}

      {electives.length === 0 ? (
        <p className="border-b border-brass/20 py-3 text-sm text-slate">
          No electives are available for your semester yet.
        </p>
      ) : (
        <div className="flex flex-col">
          {electives.map((subject) => {
            const existing = requestForSubject(subject.id);
            return (
              <div key={subject.id} className="flex items-center justify-between border-b border-brass/20 py-3">
                <div>
                  <div className="text-sm text-ink">{subject.name}</div>
                  <div className="mt-0.5 font-mono text-xs text-slate">{subject.credits} credits</div>
                </div>
                {existing ? (
                  <StatusStamp status={existing.status} />
                ) : (
                  <button
                    type="button"
                    disabled={requestingId === subject.id}
                    onClick={() => handleRequest(subject.id)}
                    className={primaryButtonClass}
                  >
                    {requestingId === subject.id ? "Requesting…" : "Request"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
