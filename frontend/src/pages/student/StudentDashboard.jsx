import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import apiClient from "../../api/client.js";
import StatusStamp from "../../components/StatusStamp.jsx";
import UpcomingCalendar from "../../components/UpcomingCalendar.jsx";

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"];
const PERIODS = [1, 2, 3, 4, 5, 6];

function dayLabel(day) {
  return day.charAt(0) + day.slice(1).toLowerCase();
}

function Section({ title, children }) {
  return (
    <div className="mb-8">
      <h2 className="mb-2 border-b border-brass/20 pb-2 font-display text-lg font-semibold text-ink">
        {title}
      </h2>
      <div className="flex flex-col">{children}</div>
    </div>
  );
}

function Row({ left, right }) {
  return (
    <div className="flex items-center justify-between border-b border-brass/20 py-3">
      <span className="text-sm text-ink">{left}</span>
      {right}
    </div>
  );
}

function Empty({ children }) {
  return <p className="border-b border-brass/20 py-3 text-sm text-slate">{children}</p>;
}

function AttendanceBarRow({ subject, percentage }) {
  const pct = Math.max(0, Math.min(100, percentage));
  return (
    <Link
      to={`/subjects/${subject.id}`}
      className="group flex items-center gap-4 border-b border-brass/20 py-3 transition-colors hover:bg-card"
    >
      <span className="w-40 shrink-0 truncate text-sm text-ink group-hover:text-oxblood">{subject.name}</span>
      <div className="h-2 flex-1 rounded bg-brass/20">
        <div className="h-2 rounded bg-oxblood" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-16 shrink-0 text-right font-mono text-sm text-ink">{pct.toFixed(1)}%</span>
    </Link>
  );
}

export default function StudentDashboard() {
  const [attendance, setAttendance] = useState([]);
  const [results, setResults] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [payments, setPayments] = useState([]);
  const [timetable, setTimetable] = useState([]);
  const [feeStructure, setFeeStructure] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [payingId, setPayingId] = useState(null);
  const [startingPayment, setStartingPayment] = useState(false);
  const [payError, setPayError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [subjectsRes, resultsRes, semestersRes, paymentsRes, timetableRes, feeStructureRes] =
          await Promise.all([
            apiClient.get("/students/me/subjects"),
            apiClient.get("/results/me"),
            apiClient.get("/semesters"),
            apiClient.get("/fees/payments/me"),
            apiClient.get("/students/me/timetable"),
            // No fee structure set for this course/semester yet is a normal,
            // non-fatal state — swallow it rather than failing the whole dashboard.
            apiClient.get("/fees/structures/me").catch(() => null),
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

  function timetableEntryFor(day, period) {
    return timetable.find((entry) => entry.day === day && entry.period === period);
  }

  if (loading) {
    return (
      <div>
        <div className="mb-6 border-b border-brass/20 pb-4">
          <h1 className="font-display text-2xl font-semibold text-ink">Dashboard</h1>
        </div>
        <p className="text-sm text-slate">Loading…</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div>
        <div className="mb-6 border-b border-brass/20 pb-4">
          <h1 className="font-display text-2xl font-semibold text-ink">Dashboard</h1>
        </div>
        <p className="text-sm text-oxblood">{loadError}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 border-b border-brass/20 pb-4">
        <h1 className="font-display text-2xl font-semibold text-ink">Dashboard</h1>
      </div>

      <UpcomingCalendar />

      <Section title="Timetable">
        {timetable.length === 0 ? (
          <Empty>No timetable published yet.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th className="border-b border-brass/30 py-2 pr-4 text-left text-xs font-medium uppercase tracking-wide text-slate">
                    Day
                  </th>
                  {PERIODS.map((period) => (
                    <th
                      key={period}
                      className="border-b border-brass/30 px-3 py-2 text-left font-mono text-xs font-medium uppercase tracking-wide text-slate"
                    >
                      P{period}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {DAYS.map((day) => (
                  <tr key={day}>
                    <td className="border-b border-brass/20 py-3 pr-4 text-sm text-ink">{dayLabel(day)}</td>
                    {PERIODS.map((period) => {
                      const entry = timetableEntryFor(day, period);
                      return (
                        <td key={period} className="border-b border-brass/20 px-3 py-3 align-top">
                          {entry ? (
                            <div>
                              <div className="text-sm text-ink">{entry.subjectName}</div>
                              <div className="text-xs text-slate">{entry.staffName}</div>
                            </div>
                          ) : (
                            <span className="text-sm text-slate">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section title="Attendance">
        {attendance.length === 0 ? (
          <Empty>No subjects assigned yet.</Empty>
        ) : (
          attendance.map((row) => (
            <AttendanceBarRow key={row.subject.id} subject={row.subject} percentage={row.percentage} />
          ))
        )}
      </Section>

      <Section title="Results">
        {results.length === 0 ? (
          <Empty>No results published yet.</Empty>
        ) : (
          results.map((result) => (
            <Row
              key={result.id}
              left={
                <span className="flex flex-col gap-1">
                  <span>{result.subjectName}</span>
                  <span className="font-mono text-xs text-slate">
                    T1 {result.test1 ?? "—"} · T2 {result.test2 ?? "—"} · Quiz {result.quiz ?? "—"} · Exp{" "}
                    {result.experiential ?? "—"} · SEE {result.see ?? "—"}
                  </span>
                </span>
              }
              right={
                <span className="font-mono text-sm text-ink">
                  {result.total != null ? result.total.toFixed(1) : "—"}
                </span>
              }
            />
          ))
        )}
      </Section>

      <Section title="Fees">
        {payError && <p className="mb-3 text-sm text-oxblood">{payError}</p>}

        {feeStructure && (
          <div className="mb-4 flex items-center justify-between border-b border-brass/20 bg-card px-4 py-3">
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-slate">
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
                className="text-xs font-medium uppercase tracking-wide text-oxblood hover:opacity-80 disabled:opacity-50"
              >
                {startingPayment ? "Redirecting…" : "Pay now"}
              </button>
            )}
          </div>
        )}

        {payments.length === 0 ? (
          <Empty>No fee records yet.</Empty>
        ) : (
          payments.map((payment) => (
            <Row
              key={payment.id}
              left={
                <span className="flex items-center gap-4">
                  <span>{semesterLabelById.get(payment.semesterId) ?? `Semester ${payment.semesterId}`}</span>
                  <StatusStamp status={payment.status} />
                </span>
              }
              right={
                <span className="flex items-center gap-4">
                  {payment.status === "PENDING" && (
                    <button
                      type="button"
                      disabled={payingId === payment.id}
                      onClick={() => handlePayNow(payment)}
                      className="text-xs font-medium uppercase tracking-wide text-oxblood hover:opacity-80 disabled:opacity-50"
                    >
                      {payingId === payment.id ? "Redirecting…" : "Pay now"}
                    </button>
                  )}
                  <span className="font-mono text-sm text-ink">{currencyFormatter.format(payment.amount)}</span>
                </span>
              }
            />
          ))
        )}
      </Section>
    </div>
  );
}
