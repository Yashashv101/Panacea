import { useEffect, useMemo, useState } from "react";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { Doughnut } from "react-chartjs-2";
import apiClient from "../../api/client";
import StatusBadge from "../../components/StatusBadge";
import MetricCard from "../../components/MetricCard";
import Card from "../../components/Card";
import { tableWrapClass, theadRowClass, thClass, tdClass, trClass } from "./academic/formStyles";
import FeeStructuresSection from "./FeeStructuresSection";
import { Wallet, Clock, XCircle, Receipt } from "lucide-react";

ChartJS.register(ArcElement, Tooltip, Legend);

const STATUS_FILTERS = ["PENDING", "PAID", "FAILED", "ALL"];

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

function formatDate(isoString) {
  return new Date(isoString).toISOString().slice(0, 10);
}

function FeeBreakdownChart({ collected, pending, failed }) {
  const total = collected + pending + failed;
  if (total === 0) return null;

  const data = {
    labels: ["Collected", "Pending", "Failed"],
    datasets: [
      {
        data: [collected, pending, failed],
        backgroundColor: ["#16A34A", "#D97706", "#DC2626"],
        borderColor: "#FFFFFF",
        borderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "65%",
    plugins: {
      legend: {
        position: "right",
        labels: { color: "#475467", boxWidth: 12, padding: 16, font: { size: 12 } },
      },
      tooltip: {
        callbacks: {
          label: (ctx) => `${ctx.label}: ${currencyFormatter.format(ctx.parsed)}`,
        },
      },
    },
  };

  const ariaLabel = `Fee breakdown: Collected ${currencyFormatter.format(collected)}, Pending ${currencyFormatter.format(
    pending
  )}, Failed ${currencyFormatter.format(failed)}`;

  return (
    <div role="img" aria-label={ariaLabel} className="h-64 w-full">
      <Doughnut data={data} options={options} />
    </div>
  );
}

export default function FeesOverview() {
  const [statusFilter, setStatusFilter] = useState("PENDING");
  const [payments, setPayments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [feeStructures, setFeeStructures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [paymentsRes, coursesRes, semestersRes, feeStructuresRes] = await Promise.all([
          apiClient.get("/fees/payments"),
          apiClient.get("/courses"),
          apiClient.get("/semesters"),
          apiClient.get("/fees/structures"),
        ]);
        if (cancelled) return;
        setPayments(paymentsRes.data);
        setCourses(coursesRes.data);
        setSemesters(semestersRes.data);
        setFeeStructures(feeStructuresRes.data);
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
    const collected = payments.filter((p) => p.status === "PAID").reduce((sum, p) => sum + p.amount, 0);
    const pending = payments.filter((p) => p.status === "PENDING").reduce((sum, p) => sum + p.amount, 0);
    const failed = payments.filter((p) => p.status === "FAILED").reduce((sum, p) => sum + p.amount, 0);
    return { collected, pending, failed };
  }, [payments]);

  const visiblePayments = statusFilter === "ALL" ? payments : payments.filter((p) => p.status === statusFilter);

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-semibold text-ink">Fees Overview</h1>
      </div>

      {loading ? (
        <p className="text-sm text-ink-secondary">Loading…</p>
      ) : loadError ? (
        <p className="text-sm text-danger">{loadError}</p>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              label="Collected"
              value={totals.collected}
              formatValue={(v) => currencyFormatter.format(v)}
              icon={Wallet}
              tone="success"
            />
            <MetricCard
              label="Pending"
              value={totals.pending}
              formatValue={(v) => currencyFormatter.format(v)}
              icon={Clock}
              tone={totals.pending > 0 ? "warning" : "default"}
            />
            <MetricCard
              label="Failed"
              value={totals.failed}
              formatValue={(v) => currencyFormatter.format(v)}
              icon={XCircle}
              tone={totals.failed > 0 ? "danger" : "default"}
            />
            <MetricCard label="Total Payments" value={payments.length} icon={Receipt} />
          </div>

          {(totals.collected > 0 || totals.pending > 0 || totals.failed > 0) && (
            <Card title="Collection breakdown" className="mb-6">
              <FeeBreakdownChart collected={totals.collected} pending={totals.pending} failed={totals.failed} />
            </Card>
          )}

          <div className="mb-6">
            <FeeStructuresSection
              feeStructures={feeStructures}
              setFeeStructures={setFeeStructures}
              courses={courses}
              semesters={semesters}
            />
          </div>

          <Card
            title="Payments"
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
            {visiblePayments.length === 0 ? (
              <p className="py-3 text-sm text-ink-secondary">No fee payments.</p>
            ) : (
              <div className={`${tableWrapClass} max-h-[32rem] overflow-y-auto`}>
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 z-10">
                    <tr className={theadRowClass}>
                      <th className={thClass}>Student</th>
                      <th className={thClass}>Course / Semester</th>
                      <th className={thClass}>Status</th>
                      <th className={thClass}>Date</th>
                      <th className={`${thClass} text-right`}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visiblePayments.map((payment) => (
                      <tr key={payment.id} className={trClass}>
                        <td className={`${tdClass} font-medium`}>{payment.studentName}</td>
                        <td className={`${tdClass} text-ink-secondary`}>
                          {courseNameById.get(payment.courseId) ?? `Course ${payment.courseId}`}
                          {" · "}
                          {semesterLabelById.get(payment.semesterId) ?? `Semester ${payment.semesterId}`}
                        </td>
                        <td className={tdClass}>
                          <StatusBadge status={payment.status} />
                        </td>
                        <td className={`${tdClass} font-mono text-xs`}>{formatDate(payment.createdAt)}</td>
                        <td className={`${tdClass} text-right font-mono`}>{currencyFormatter.format(payment.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
