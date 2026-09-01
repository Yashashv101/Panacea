import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import { Activity, Award, Wallet, CalendarClock } from "lucide-react";
import apiClient from "../../api/client.js";
import DashboardCalendarSidebar from "../../components/DashboardCalendarSidebar.jsx";
import TimetableGrid from "../../components/TimetableGrid.jsx";
import MetricCard from "../../components/MetricCard.jsx";
import Card from "../../components/Card.jsx";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const PAYMENT_STATUS_CLASS = {
  PENDING: "bg-warning/10 text-warning",
  PAID: "bg-success/10 text-success",
  FAILED: "bg-danger/10 text-danger",
};

function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${
        PAYMENT_STATUS_CLASS[status] ?? "bg-surface-alt text-ink-secondary"
      }`}
    >
      {status}
    </span>
  );
}

function AttendanceChart({ attendance }) {
  const labels = attendance.map((row) => row.subject.name);
  const values = attendance.map((row) => Math.max(0, Math.min(100, row.percentage)));

  const chartData = {
    labels,
    datasets: [
      {
        label: "Attendance %",
        data: values,
        backgroundColor: "#2E5CE6",
        borderRadius: 4,
        maxBarThickness: 40,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => `${ctx.parsed.y.toFixed(1)}%`,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        ticks: { callback: (v) => `${v}%`, color: "#98A2B3" },
        grid: { color: "#E4E7EC" },
      },
      x: {
        ticks: { color: "#475467" },
        grid: { display: false },
      },
    },
  };

  const ariaLabel = `Bar chart of attendance percentage per subject: ${attendance
    .map((row) => `${row.subject.name} ${row.percentage.toFixed(0)} percent`)
    .join(", ")}`;

  return (
    <div role="img" aria-label={ariaLabel} className="h-72 w-full">
      <Bar data={chartData} options={chartOptions} />
    </div>
  );
}

export default function StudentDashboard() {
  const [attendance, setAttendance] = useState([]);
  const [results, setResults] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [payments, setPayments] = useState([]);
  const [timetable, setTimetable] = useState([]);
  const [feeStructure, setFeeStructure] = useState(null);
  const [upcomingCalendar, setUpcomingCalendar] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [payingId, setPayingId] = useState(null);
  const [startingPayment, setStartingPayment] = useState(false);
  const [payError, setPayError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [subjectsRes, resultsRes, semestersRes, paymentsRes, timetableRes, feeStructureRes, upcomingRes] =
          await Promise.all([
            apiClient.get("/students/me/subjects"),
            apiClient.get("/results/me"),
            apiClient.get("/semesters"),
            apiClient.get("/fees/payments/me"),
            apiClient.get("/students/me/timetable"),
            // No fee structure set for this course/semester yet is a normal,
            // non-fatal state — swallow it rather than failing the whole dashboard.
            apiClient.get("/fees/structures/me").catch(() => null),
            apiClient.get("/calendar/upcoming").catch(() => ({ data: [] })),
          ]);
        if (cancelled) return;

        const percentages = await Promise.all(
          subjectsRes.data.map((subject) =>
            apiClient
              .get("/attendance/percentage/me", { params: { subjectId: subject.id } })
              .then((res) => ({ subject, ...res.data }))
          )
        );

        if (cancelled) return;
        setAttendance(percentages);
        setResults(resultsRes.data);
        setSemesters(semestersRes.data);
        setPayments(paymentsRes.data);
        setTimetable(timetableRes.data);
        setFeeStructure(feeStructureRes?.data ?? null);
        setUpcomingCalendar(upcomingRes.data);
      } catch {
        if (!cancelled) setLoadError("Could not load your dashboard.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    function refetchPayments() {
      apiClient
        .get("/fees/payments/me")
        .then((res) => {
          if (!cancelled) setPayments(res.data);
        })
        .catch(() => {});
    }

    window.addEventListener("focus", refetchPayments);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", refetchPayments);
    };
  }, []);

  async function handlePayNow(payment) {
    setPayError(null);
    setPayingId(payment.id);
    try {
      const { data } = await apiClient.post("/fees/payments/initiate");
      window.location.href = data.checkoutUrl;
    } catch {
      setPayError("Could not start the payment. Please try again.");
      setPayingId(null);
    }
  }

  // For a student who has never initiated a payment for the current fee
  // structure yet — no FeePayment row exists at all, so there's nothing in
  // `payments` to attach a per-row "Pay now" button to (see handlePayNow above).
  async function handleStartPayment() {
    setPayError(null);
    setStartingPayment(true);
    try {
      const { data } = await apiClient.post("/fees/payments/initiate");
      window.location.href = data.checkoutUrl;
    } catch {
      setPayError("Could not start the payment. Please try again.");
      setStartingPayment(false);
    }
  }

  const semesterLabelById = useMemo(
    () => new Map(semesters.map((s) => [s.id, `Sem ${s.number} — ${s.label}`])),
    [semesters]
  );

  const avgAttendance = attendance.length
    ? attendance.reduce((sum, row) => sum + row.percentage, 0) / attendance.length
    : null;

  const lowestAttendance = useMemo(() => {
    if (attendance.length === 0) return null;
    return attendance.reduce((min, row) => (row.percentage < min.percentage ? row : min), attendance[0]);
  }, [attendance]);

  const resultsWithTotal = results.filter((r) => r.total != null);
  const avgResult = resultsWithTotal.length
    ? resultsWithTotal.reduce((sum, r) => sum + r.total, 0) / resultsWithTotal.length
    : null;

  const pendingFromPayments = payments.filter((p) => p.status === "PENDING").reduce((sum, p) => sum + p.amount, 0);
  const hasFeeStructurePayment =
    feeStructure && payments.some((p) => p.courseId === feeStructure.courseId && p.semesterId === feeStructure.semesterId);
  const pendingFeesAmount =
    pendingFromPayments > 0 ? pendingFromPayments : feeStructure && !hasFeeStructurePayment ? feeStructure.totalAmount : 0;

  const upcomingExamsCount = upcomingCalendar.filter((entry) => entry.type === "EXAM").length;

  if (loading) {
    return (
      <div>
        <p className="text-sm text-ink-secondary">Loading…</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div>
        <p className="text-sm text-danger">{loadError}</p>
      </div>
    );
  }

  return (
    <div className="animate-page-in">
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Average Attendance"
          value={avgAttendance}
          formatValue={(v) => v.toFixed(1)}
          suffix="%"
          icon={Activity}
          tone={avgAttendance != null && avgAttendance < 75 ? "danger" : "default"}
          caption={lowestAttendance ? `Lowest: ${lowestAttendance.subject.name} (${lowestAttendance.percentage.toFixed(0)}%)` : null}
        />
        <MetricCard
          label="Results Average"
          value={avgResult}
          formatValue={(v) => v.toFixed(1)}
          icon={Award}
          caption={resultsWithTotal.length ? `Across ${resultsWithTotal.length} subject${resultsWithTotal.length === 1 ? "" : "s"}` : null}
        />
        <MetricCard
          label="Pending Fees"
          value={pendingFeesAmount}
          formatValue={(v) => currencyFormatter.format(v)}
          icon={Wallet}
          tone={pendingFeesAmount > 0 ? "warning" : "success"}
        />
        <MetricCard
          label="Upcoming Exams"
          value={upcomingExamsCount}
          formatValue={(v) => Math.round(v)}
          icon={CalendarClock}
          caption="Next 30 days"
        />
      </div>

      <div className="flex flex-col items-start gap-6 lg:flex-row">
        <div className="flex w-full min-w-0 flex-1 flex-col gap-6">
          <Card title="Attendance by Subject">
            {attendance.length === 0 ? (
              <p className="text-sm text-ink-secondary">No subjects assigned yet.</p>
            ) : (
              <AttendanceChart attendance={attendance} />
            )}
          </Card>

          <Card title="Timetable">
            {timetable.length === 0 ? (
              <p className="text-sm text-ink-secondary">No timetable published yet.</p>
            ) : (
              <TimetableGrid entries={timetable} />
            )}
          </Card>

          <Card title="Subjects">
            {attendance.length === 0 ? (
              <p className="text-sm text-ink-secondary">No subjects assigned yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border text-xs font-medium uppercase tracking-wide text-ink-muted">
                      <th className="py-2 pr-4">Subject</th>
                      <th className="py-2 pr-4">Attendance</th>
                      <th className="py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {attendance.map((row) => (
                      <tr key={row.subject.id} className="border-b border-border last:border-0">
                        <td className="py-3 pr-4 font-medium text-ink">{row.subject.name}</td>
                        <td className="py-3 pr-4 font-mono text-ink-secondary">{row.percentage.toFixed(1)}%</td>
                        <td className="py-3 text-right">
                          <Link to={`/subjects/${row.subject.id}`} className="text-xs font-medium text-accent hover:underline">
                            View
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card title="Results">
            {results.length === 0 ? (
              <p className="text-sm text-ink-secondary">No results published yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border text-xs font-medium uppercase tracking-wide text-ink-muted">
                      <th className="py-2 pr-4">Subject</th>
                      <th className="py-2 pr-4">Breakdown</th>
                      <th className="py-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((result) => (
                      <tr key={result.id} className="border-b border-border last:border-0">
                        <td className="py-3 pr-4 font-medium text-ink">{result.subjectName}</td>
                        <td className="py-3 pr-4 font-mono text-xs text-ink-muted">
                          T1 {result.test1 ?? "—"} · T2 {result.test2 ?? "—"} · Quiz {result.quiz ?? "—"} · Exp{" "}
                          {result.experiential ?? "—"} · SEE {result.see ?? "—"}
                        </td>
                        <td className="py-3 text-right font-mono font-semibold text-ink">
                          {result.total != null ? result.total.toFixed(1) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card title="Fees">
            {payError && <p className="mb-3 text-sm text-danger">{payError}</p>}

            {feeStructure && (
              <div className="mb-4 flex items-center justify-between rounded-md bg-surface-alt px-4 py-3">
                <div>
                  <div className="text-xs font-medium uppercase tracking-wide text-ink-muted">
                    {semesterLabelById.get(feeStructure.semesterId) ?? `Semester ${feeStructure.semesterId}`} — what you owe
                  </div>
                  <div className="mt-1 font-mono text-sm text-ink">
                    Tuition {currencyFormatter.format(feeStructure.tuitionAmount)} + Exam fee{" "}
                    {currencyFormatter.format(feeStructure.examFeeAmount)} = {currencyFormatter.format(feeStructure.totalAmount)}
                  </div>
                </div>
                {!payments.some(
                  (p) => p.courseId === feeStructure.courseId && p.semesterId === feeStructure.semesterId
                ) && (
                  <button
                    type="button"
                    disabled={startingPayment}
                    onClick={handleStartPayment}
                    className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white transition-colors duration-150 ease-out hover:bg-accent/90 disabled:opacity-50"
                  >
                    {startingPayment ? "Redirecting…" : "Pay now"}
                  </button>
                )}
              </div>
            )}

            {payments.length === 0 ? (
              <p className="text-sm text-ink-secondary">No fee records yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border text-xs font-medium uppercase tracking-wide text-ink-muted">
                      <th className="py-2 pr-4">Semester</th>
                      <th className="py-2 pr-4">Status</th>
                      <th className="py-2 text-right">Amount</th>
                      <th className="py-2 text-right" />
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((payment) => (
                      <tr key={payment.id} className="border-b border-border last:border-0">
                        <td className="py-3 pr-4 text-ink">
                          {semesterLabelById.get(payment.semesterId) ?? `Semester ${payment.semesterId}`}
                        </td>
                        <td className="py-3 pr-4">
                          <StatusBadge status={payment.status} />
                        </td>
                        <td className="py-3 text-right font-mono text-ink">{currencyFormatter.format(payment.amount)}</td>
                        <td className="py-3 pl-4 text-right">
                          {payment.status === "PENDING" && (
                            <button
                              type="button"
                              disabled={payingId === payment.id}
                              onClick={() => handlePayNow(payment)}
                              className="text-xs font-medium text-accent hover:underline disabled:opacity-50"
                            >
                              {payingId === payment.id ? "Redirecting…" : "Pay now"}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        <DashboardCalendarSidebar />
      </div>
    </div>
  );
}
