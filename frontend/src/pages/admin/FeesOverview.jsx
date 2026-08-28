import { useEffect, useMemo, useState } from "react";
import apiClient from "../../api/client";
import StatusStamp from "../../components/StatusStamp";

const STATUS_FILTERS = ["PENDING", "PAID", "FAILED", "ALL"];

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

function formatDate(isoString) {
  return new Date(isoString).toISOString().slice(0, 10);
}

export default function FeesOverview() {
  const [statusFilter, setStatusFilter] = useState("PENDING");
  const [payments, setPayments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [paymentsRes, coursesRes, semestersRes] = await Promise.all([
          apiClient.get("/fees/payments"),
          apiClient.get("/courses"),
          apiClient.get("/semesters"),
        ]);
        if (cancelled) return;
        setPayments(paymentsRes.data);
        setCourses(coursesRes.data);
        setSemesters(semestersRes.data);
      } catch {
        if (!cancelled) setLoadError("Could not load fee payments.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const courseNameById = useMemo(() => new Map(courses.map((c) => [c.id, c.name])), [courses]);
  const semesterLabelById = useMemo(
    () => new Map(semesters.map((s) => [s.id, `Sem ${s.number} — ${s.label}`])),
    [semesters]
  );

  const totals = useMemo(() => {
    const collected = payments
      .filter((p) => p.status === "PAID")
      .reduce((sum, p) => sum + p.amount, 0);
    const pending = payments
      .filter((p) => p.status === "PENDING")
      .reduce((sum, p) => sum + p.amount, 0);
    return { collected, pending };
  }, [payments]);

  const visiblePayments = statusFilter === "ALL" ? payments : payments.filter((p) => p.status === statusFilter);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between border-b border-brass/20 pb-4">
        <h1 className="font-display text-2xl font-semibold text-ink">Fees Overview</h1>
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

      {loading ? (
        <p className="text-sm text-slate">Loading…</p>
      ) : loadError ? (
        <p className="text-sm text-oxblood">{loadError}</p>
      ) : (
        <>
          <div className="mb-6 flex items-center gap-8 border-b border-brass/20 pb-4">
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-slate">Collected</div>
              <div className="font-mono text-lg text-ink">{currencyFormatter.format(totals.collected)}</div>
            </div>
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-slate">Pending</div>
              <div className="font-mono text-lg text-ink">{currencyFormatter.format(totals.pending)}</div>
            </div>
          </div>

          {visiblePayments.length === 0 ? (
            <p className="border-b border-brass/20 py-3 text-sm text-slate">No fee payments.</p>
          ) : (
            <div className="flex flex-col">
              {visiblePayments.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between border-b border-brass/20 py-3">
                  <div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-ink">{payment.studentName}</span>
                      <StatusStamp status={payment.status} />
                    </div>
                    <p className="mt-1 text-xs text-slate">
                      {courseNameById.get(payment.courseId) ?? `Course ${payment.courseId}`}
                      {" · "}
                      {semesterLabelById.get(payment.semesterId) ?? `Semester ${payment.semesterId}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-6">
                    <span className="font-mono text-sm text-slate">{formatDate(payment.createdAt)}</span>
                    <span className="w-28 text-right font-mono text-sm text-ink">
                      {currencyFormatter.format(payment.amount)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
