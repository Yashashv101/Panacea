import { useEffect, useState } from "react";
import apiClient from "../../api/client";

function Row({ left, right }) {
  return (
    <div className="flex items-center justify-between border-b border-brass/20 py-3">
      <span className="text-sm text-ink">{left}</span>
      {right}
    </div>
  );
}

export default function MyProctor() {
  const [mentor, setMentor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    apiClient
      .get("/proctor/assignments/my-mentor")
      .then((res) => {
        if (!cancelled) setMentor(res.status === 204 ? null : res.data);
      })
      .catch(() => {
        if (!cancelled) setLoadError("Could not load your proctor.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      <div className="mb-6 border-b border-brass/20 pb-4">
        <h1 className="font-display text-2xl font-semibold text-ink">My Proctor</h1>
      </div>

      {loading ? (
        <p className="text-sm text-slate">Loading…</p>
      ) : loadError ? (
        <p className="text-sm text-oxblood">{loadError}</p>
      ) : !mentor ? (
        <p className="border-b border-brass/20 py-3 text-sm text-slate">
          No proctor has been assigned to you yet — an administrator assigns mentors.
        </p>
      ) : (
        <div className="flex flex-col">
          <Row left="Mentor" right={<span className="text-sm text-ink">{mentor.staffName}</span>} />
          {mentor.assignedAt && (
            <Row
              left="Assigned since"
              right={
                <span className="font-mono text-sm text-slate">
                  {new Date(mentor.assignedAt).toLocaleDateString()}
                </span>
              }
            />
          )}
        </div>
      )}
    </div>
  );
}
