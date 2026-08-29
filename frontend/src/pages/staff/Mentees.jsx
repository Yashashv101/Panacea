import { useEffect, useState } from "react";
import apiClient from "../../api/client";
import StatusStamp from "../../components/StatusStamp.jsx";

export default function Mentees() {
  const [mentees, setMentees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    apiClient
      .get("/proctor/assignments/my-mentees")
      .then((res) => {
        if (!cancelled) setMentees(res.data);
      })
      .catch(() => {
        if (!cancelled) setLoadError("Could not load your mentees.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div>
        <div className="mb-6 border-b border-brass/20 pb-4">
          <h1 className="font-display text-2xl font-semibold text-ink">My Mentees</h1>
        </div>
        <p className="text-sm text-slate">Loading…</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div>
        <div className="mb-6 border-b border-brass/20 pb-4">
          <h1 className="font-display text-2xl font-semibold text-ink">My Mentees</h1>
        </div>
        <p className="text-sm text-oxblood">{loadError}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 border-b border-brass/20 pb-4">
        <h1 className="font-display text-2xl font-semibold text-ink">My Mentees</h1>
      </div>

      {mentees.length === 0 ? (
        <p className="border-b border-brass/20 py-3 text-sm text-slate">
          No students have been assigned to you as a mentor yet.
        </p>
      ) : (
        <div className="flex flex-col">
          {mentees.map((mentee) => (
            <div key={mentee.studentId} className="border-b border-brass/20 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-ink">{mentee.studentName}</div>
                  <div className="mt-0.5 font-mono text-xs text-slate">{mentee.email}</div>
                </div>
                <div className="flex items-center gap-6">
                  <span className="text-sm text-slate">
                    {mentee.courseName} — {mentee.sectionName}
                  </span>
                  <StatusStamp status={mentee.feeStatus ?? "NOT PAID"} />
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2 pl-0.5">
                {mentee.subjects.length === 0 ? (
                  <span className="text-xs text-slate">No subjects on record.</span>
                ) : (
                  mentee.subjects.map((subject) => (
                    <span
                      key={subject.id}
                      className="rounded border border-brass/40 px-2 py-1 text-xs text-ink"
                    >
                      {subject.name}
                    </span>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
