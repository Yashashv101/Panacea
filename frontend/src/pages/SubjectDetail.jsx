import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip } from "chart.js";
import { Bar } from "react-chartjs-2";
import apiClient from "../api/client.js";
import StatusBadge from "../components/StatusBadge.jsx";
import Card from "../components/Card.jsx";
import PdfViewer from "../components/PdfViewer.jsx";
import { tableWrapClass, theadRowClass, thClass, tdClass, trClass, rowActionClass } from "./admin/academic/formStyles";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

const PLACEHOLDER_TABS = [
  "Assignment",
  "Discussion Forum",
];

const REAL_TABS = [
  "Attendance",
  "Results",
  "Syllabus",
  "Study Material",
  "Previous Year Paper",
  "Class Notes",
];

const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

function AttendanceTab({ subjectId }) {
  const [history, setHistory] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    apiClient
      .get("/attendance/history/me", { params: { subjectId } })
      .then((res) => {
        if (!cancelled) setHistory(res.data);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load attendance history.");
      });
    return () => {
      cancelled = true;
    };
  }, [subjectId]);

  if (error) return <p className="text-sm text-danger">{error}</p>;
  if (history === null) return <p className="text-sm text-ink-secondary">Loading…</p>;
  if (history.length === 0) return <p className="text-sm text-ink-secondary">No attendance records found.</p>;

  return (
    <Card title="Session History">
      <div className={tableWrapClass}>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className={theadRowClass}>
              <th className={thClass}>Date</th>
              <th className={thClass}>Period</th>
              <th className={thClass}>Status</th>
            </tr>
          </thead>
          <tbody>
            {history.map((row) => (
              <tr key={`${row.date}-${row.period}`} className={trClass}>
                <td className={`${tdClass} font-mono text-xs`}>{row.date}</td>
                <td className={`${tdClass} font-mono text-xs text-ink-secondary`}>P{row.period}</td>
                <td className={tdClass}>
                  <StatusBadge status={row.present ? "PRESENT" : "ABSENT"} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function CieComponentChart({ result }) {
  const components = [
    { label: "Test 1", max: 25, value: result.test1 },
    { label: "Test 2", max: 25, value: result.test2 },
    { label: "Quiz", max: result.quizMaxScore, value: result.quiz },
    { label: "Experiential", max: 30, value: result.experiential },
  ].filter((c) => c.value != null && c.max != null);

  if (components.length === 0) return null;

  const chartData = {
    labels: components.map((c) => c.label),
    datasets: [
      {
        label: "Scored",
        data: components.map((c) => c.value),
        backgroundColor: "#2E5CE6",
        borderRadius: 4,
        maxBarThickness: 48,
      },
      {
        label: "Max",
        data: components.map((c) => c.max),
        backgroundColor: "#E4E7EC",
        borderRadius: 4,
        maxBarThickness: 48,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: "top",
        labels: { color: "#475467", boxWidth: 12, font: { size: 11 } },
      },
      tooltip: {
        callbacks: {
          label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y}`,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { color: "#98A2B3" },
        grid: { color: "#E4E7EC" },
      },
      x: {
        ticks: { color: "#475467" },
        grid: { display: false },
      },
    },
  };

  const ariaLabel = `CIE component breakdown: ${components
    .map((c) => `${c.label} — ${c.value} of ${c.max}`)
    .join(", ")}`;

  return (
    <div role="img" aria-label={ariaLabel} className="mb-5 h-56 w-full">
      <Bar data={chartData} options={chartOptions} />
    </div>
  );
}

function ResultsTab({ subjectId }) {
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    apiClient
      .get("/results/me")
      .then((res) => {
        if (!cancelled) setResults(res.data);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load results.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) return <p className="text-sm text-danger">{error}</p>;
  if (results === null) return <p className="text-sm text-ink-secondary">Loading results…</p>;

  const result = results.find((r) => String(r.subjectId) === subjectId);
  if (!result) return <p className="text-sm text-ink-secondary">No results published for this subject yet.</p>;

  // Backend's `total` (StudentResultResponse) folds in SEE alongside the CIE
  // components, so it can't be reused as a CIE-only subtotal — recompute
  // that separately from test1/test2/quiz/experiential.
  const cieTotal =
    result.test1 != null && result.test2 != null && result.quiz != null && result.experiential != null
      ? (result.test1 + result.test2 + result.quiz + result.experiential).toFixed(1)
      : "—";

  return (
    <div className="flex flex-col gap-6">
      <Card title="Continuous Internal Evaluation (CIE)">
        <CieComponentChart result={result} />
        <div className={tableWrapClass}>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className={theadRowClass}>
                <th className={thClass}>Component</th>
                <th className={`${thClass} text-right`}>Max</th>
                <th className={`${thClass} text-right`}>Scored</th>
              </tr>
            </thead>
            <tbody>
              <tr className={trClass}>
                <td className={`${tdClass} font-medium`}>Test 1</td>
                <td className={`${tdClass} font-mono text-xs text-ink-secondary text-right`}>25.0</td>
                <td className={`${tdClass} font-mono text-right`}>
                  {result.test1 != null ? result.test1.toFixed(1) : "—"}
                </td>
              </tr>
              <tr className={trClass}>
                <td className={`${tdClass} font-medium`}>Test 2</td>
                <td className={`${tdClass} font-mono text-xs text-ink-secondary text-right`}>25.0</td>
                <td className={`${tdClass} font-mono text-right`}>
                  {result.test2 != null ? result.test2.toFixed(1) : "—"}
                </td>
              </tr>
              <tr className={trClass}>
                <td className={`${tdClass} font-medium`}>Quiz</td>
                <td className={`${tdClass} font-mono text-xs text-ink-secondary text-right`}>
                  {result.quizMaxScore != null ? result.quizMaxScore.toFixed(1) : "—"}
                </td>
                <td className={`${tdClass} font-mono text-right`}>
                  {result.quiz != null ? result.quiz.toFixed(1) : "—"}
                </td>
              </tr>
              <tr className={trClass}>
                <td className={`${tdClass} font-medium`}>Experiential Learning</td>
                <td className={`${tdClass} font-mono text-xs text-ink-secondary text-right`}>30.0</td>
                <td className={`${tdClass} font-mono text-right`}>
                  {result.experiential != null ? result.experiential.toFixed(1) : "—"}
                </td>
              </tr>
              <tr className={trClass}>
                <td className={`${tdClass} font-semibold`}>CIE Total</td>
                <td className={`${tdClass} font-mono text-xs text-ink-secondary text-right`}>—</td>
                <td className={`${tdClass} font-mono font-semibold text-right`}>{cieTotal}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Semester End Examination (SEE)">
        <div className={tableWrapClass}>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className={theadRowClass}>
                <th className={thClass}>Component</th>
                <th className={`${thClass} text-right`}>Scored</th>
              </tr>
            </thead>
            <tbody>
              <tr className={trClass}>
                <td className={`${tdClass} font-medium`}>SEE Theory</td>
                <td className={`${tdClass} font-mono text-right`}>
                  {result.see != null ? result.see.toFixed(1) : "—"}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      <div className="flex items-center justify-between rounded-lg border border-border bg-surface px-5 py-4 shadow-sm">
        <span className="text-xs font-medium uppercase tracking-wide text-ink-muted">Total (CIE + SEE)</span>
        <span className="font-mono text-lg font-semibold text-accent">
          {result.total != null ? result.total.toFixed(1) : "Pending"}
        </span>
      </div>
    </div>
  );
}

function SubjectResourceTab({ endpoint, downloadEndpointPrefix, title, emptyMessage, subjectName }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activePdfId, setActivePdfId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    apiClient
      .get(endpoint)
      .then((res) => {
        if (!cancelled) setItems(res.data);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load items.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [endpoint]);

  if (loading) return <p className="text-sm text-ink-secondary">Loading {title.toLowerCase()}…</p>;
  if (error) return <p className="text-sm text-danger">{error}</p>;
  if (items.length === 0) return <p className="text-sm text-ink-secondary">{emptyMessage}</p>;

  return (
    <Card title={`${title} (${items.length})`}>
      <div className="flex flex-col divide-y divide-border">
        {items.map((item) => {
          const isViewing = activePdfId === item.id;
          return (
            <div key={item.id} className="py-3.5 first:pt-0 last:pb-0">
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 flex-col gap-1">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-ink">{item.title}</span>
                    <span className="font-mono text-xs text-ink-muted">
                      {dateFormatter.format(new Date(item.createdAt))}
                    </span>
                  </div>
                  {item.description && (
                    <p className="whitespace-pre-wrap text-xs text-ink-secondary">{item.description}</p>
                  )}
                  <span className="text-[11px] text-ink-muted">Uploaded by {item.uploadedByName}</span>
                </div>

                <button
                  type="button"
                  onClick={() => setActivePdfId((prev) => (prev === item.id ? null : item.id))}
                  className={`${rowActionClass} shrink-0`}
                >
                  {isViewing ? "Hide Document" : "View Document"}
                </button>
              </div>

              {isViewing && (
                <div className="mt-3 border-t border-border pt-3">
                  <PdfViewer
                    url={`${downloadEndpointPrefix}/${item.id}/file`}
                    title={`${item.title} - ${subjectName}`}
                    height="calc(100vh - 200px)"
                    minHeight="800px"
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

export default function SubjectDetail() {
  const { subjectId } = useParams();
  const [subject, setSubject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("Attendance");

  useEffect(() => {
    let cancelled = false;
    apiClient
      .get(`/subjects/${subjectId}`)
      .then((res) => {
        if (!cancelled) setSubject(res.data);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load subject details.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [subjectId]);

  if (loading) return <p className="text-sm text-ink-secondary">Loading subject…</p>;
  if (error) return <p className="text-sm text-danger">{error}</p>;
  if (!subject) return null;

  const allTabs = [...REAL_TABS, ...PLACEHOLDER_TABS];

  return (
    <div>
      <div className="mb-6">
        <Link to="/" className={`${rowActionClass} mb-2 block`}>
          ← Dashboard
        </Link>
        <h1 className="font-display text-2xl font-semibold text-ink">
          {subject.name}
          <span className="ml-3 font-mono text-sm font-normal text-ink-muted">{subject.type}</span>
        </h1>
      </div>

      <div className="flex gap-8">
        <nav className="flex w-48 shrink-0 flex-col gap-1">
          {allTabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`rounded px-3 py-2 text-left text-sm font-medium transition-colors duration-150 ease-out ${
                activeTab === tab ? "bg-accent-soft text-accent" : "text-ink-secondary hover:text-ink"
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>

        <div className="flex-1">
          {activeTab === "Attendance" && <AttendanceTab subjectId={subjectId} />}
          {activeTab === "Results" && <ResultsTab subjectId={subjectId} />}
          {activeTab === "Syllabus" && (
            <Card title="Official Course Syllabus">
              {subject.syllabusUploaded ? (
                <PdfViewer
                  url={`/subjects/${subjectId}/syllabus`}
                  title={`${subject.name} Syllabus`}
                  height="calc(100vh - 200px)"
                  minHeight="800px"
                />
              ) : (
                <p className="text-sm text-ink-secondary">
                  No syllabus has been uploaded for this subject yet.
                </p>
              )}
            </Card>
          )}
          {activeTab === "Study Material" && (
            <SubjectResourceTab
              endpoint={`/subjects/${subjectId}/study-materials`}
              downloadEndpointPrefix="/study-materials"
              title="Study Materials"
              emptyMessage="No study materials have been uploaded for this subject yet."
              subjectName={subject.name}
            />
          )}
          {activeTab === "Previous Year Paper" && (
            <SubjectResourceTab
              endpoint={`/subjects/${subjectId}/previous-year-papers`}
              downloadEndpointPrefix="/previous-year-papers"
              title="Previous Year Papers"
              emptyMessage="No previous year question papers have been uploaded for this subject yet."
              subjectName={subject.name}
            />
          )}
          {activeTab === "Class Notes" && (
            <SubjectResourceTab
              endpoint={`/subjects/${subjectId}/class-notes`}
              downloadEndpointPrefix="/class-notes"
              title="Class Notes"
              emptyMessage="No class notes have been uploaded for this subject yet."
              subjectName={subject.name}
            />
          )}
          {PLACEHOLDER_TABS.includes(activeTab) && (
            <Card title={activeTab}>
              <p className="text-sm text-ink-secondary">Coming soon.</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
