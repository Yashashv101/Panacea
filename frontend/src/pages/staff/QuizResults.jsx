import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip } from "chart.js";
import { Bar } from "react-chartjs-2";
import apiClient from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { rowActionClass, tableWrapClass, theadRowClass, thClass, tdClass, trClass } from "../admin/academic/formStyles";
import MetricCard from "../../components/MetricCard";
import Card from "../../components/Card";
import { ClipboardList, Users } from "lucide-react";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
  timeStyle: "short",
});

const SCORE_BUCKETS = ["0–20%", "21–40%", "41–60%", "61–80%", "81–100%"];

// Only worth charting once there's a real spread of attempts to show a
// distribution over — a handful of individual scores reads better as a
// plain list than as a five-bucket bar chart.
const MIN_ATTEMPTS_FOR_CHART = 5;

function attemptPercentage(attempt) {
  return attempt.rescaleToTen ? (attempt.rescaledScore / 10) * 100 : (attempt.rawScore / attempt.totalPossibleMarks) * 100;
}

function ScoreDistributionChart({ attempts }) {
  const bucketCounts = [0, 0, 0, 0, 0];
  attempts.forEach((attempt) => {
    const pct = attemptPercentage(attempt);
    const bucketIndex = Math.min(4, Math.max(0, Math.floor(pct / 20)));
    bucketCounts[bucketIndex] += 1;
  });

  const chartData = {
    labels: SCORE_BUCKETS,
    datasets: [
      {
        label: "Students",
        data: bucketCounts,
        backgroundColor: "#2E5CE6",
        borderRadius: 4,
        maxBarThickness: 48,
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
          label: (ctx) => `${ctx.parsed.y} student${ctx.parsed.y === 1 ? "" : "s"}`,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { stepSize: 1, color: "#98A2B3" },
        grid: { color: "#E4E7EC" },
      },
      x: {
        ticks: { color: "#475467" },
        grid: { display: false },
      },
    },
  };

  const ariaLabel = `Score distribution across ${attempts.length} attempts: ${SCORE_BUCKETS.map(
    (label, i) => `${label} — ${bucketCounts[i]} students`
  ).join(", ")}`;

  return (
    <div role="img" aria-label={ariaLabel} className="mb-4 h-56 w-full">
      <Bar data={chartData} options={chartOptions} />
    </div>
  );
}

export default function QuizResults() {
  const { userId } = useAuth();

  const [quizzes, setQuizzes] = useState([]);
  const [attemptsByQuizId, setAttemptsByQuizId] = useState({});
  const [expandedQuizId, setExpandedQuizId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setLoadError(null);
      try {
        const { data } = await apiClient.get("/mcq/quizzes");
        if (cancelled) return;
        const ownQuizzes = data.filter((quiz) => quiz.staffId === userId);
        setQuizzes(ownQuizzes);

        const attemptEntries = await Promise.all(
          ownQuizzes.map((quiz) =>
            apiClient
              .get(`/mcq/quizzes/${quiz.id}/attempts`)
              .then((res) => [quiz.id, res.data])
              .catch(() => [quiz.id, []])
          )
        );
        if (cancelled) return;
        setAttemptsByQuizId(Object.fromEntries(attemptEntries));
      } catch {
        if (!cancelled) setLoadError("Could not load quizzes.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const sortedQuizzes = useMemo(
    () => [...quizzes].sort((a, b) => a.title.localeCompare(b.title)),
    [quizzes]
  );

  const totalAttempts = useMemo(
    () => Object.values(attemptsByQuizId).reduce((sum, list) => sum + list.length, 0),
    [attemptsByQuizId]
  );

  function toggleExpanded(quizId) {
    setExpandedQuizId((prev) => (prev === quizId ? null : quizId));
  }

  if (loading) {
    return (
      <div>
        <div className="mb-6">
          <h1 className="font-display text-2xl font-semibold text-ink">Quizzes</h1>
        </div>
        <p className="text-sm text-ink-secondary">Loading…</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div>
        <div className="mb-6">
          <h1 className="font-display text-2xl font-semibold text-ink">Quizzes</h1>
        </div>
        <p className="text-sm text-danger">{loadError}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold text-ink">Quizzes</h1>
        <Link to="/staff/quizzes/new" className={rowActionClass}>
          New quiz
        </Link>
      </div>

      {sortedQuizzes.length === 0 ? (
        <p className="text-sm text-ink-secondary">You haven't created any quizzes yet.</p>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <MetricCard label="Quizzes" value={sortedQuizzes.length} icon={ClipboardList} />
            <MetricCard label="Total Attempts" value={totalAttempts} icon={Users} />
          </div>

          <Card title="Your quizzes">
            <div className="flex flex-col divide-y divide-border">
              {sortedQuizzes.map((quiz) => {
                const attempts = attemptsByQuizId[quiz.id] ?? [];
                const expanded = expandedQuizId === quiz.id;
                return (
                  <div key={quiz.id} className="py-3 first:pt-0 last:pb-0">
                    <button
                      type="button"
                      onClick={() => toggleExpanded(quiz.id)}
                      className="flex w-full items-center justify-between text-left"
                    >
                      <div>
                        <div className="text-sm font-medium text-ink">{quiz.title}</div>
                        <div className="mt-0.5 text-xs text-ink-muted">{quiz.subjectName}</div>
                      </div>
                      <span className="font-mono text-sm text-ink-secondary">
                        {attempts.length} attempt{attempts.length === 1 ? "" : "s"}
                      </span>
                    </button>

                    {expanded && (
                      <div className="mt-4">
                        {attempts.length === 0 ? (
                          <p className="py-2 text-sm text-ink-secondary">No attempts yet.</p>
                        ) : (
                          <>
                            {attempts.length >= MIN_ATTEMPTS_FOR_CHART && (
                              <ScoreDistributionChart attempts={attempts} />
                            )}
                            <div className={tableWrapClass}>
                              <table className="w-full text-left text-sm">
                                <thead>
                                  <tr className={theadRowClass}>
                                    <th className={thClass}>Student</th>
                                    <th className={thClass}>Submitted</th>
                                    <th className={`${thClass} text-right`}>Score</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {attempts.map((attempt) => (
                                    <tr key={attempt.id} className={trClass}>
                                      <td className={`${tdClass} font-medium`}>{attempt.studentName}</td>
                                      <td className={`${tdClass} font-mono text-xs text-ink-muted`}>
                                        {dateFormatter.format(new Date(attempt.submittedAt))}
                                      </td>
                                      <td className={`${tdClass} text-right font-mono`}>
                                        {attempt.rescaleToTen
                                          ? `${attempt.rescaledScore.toFixed(1)}/10`
                                          : `${attempt.rawScore}/${attempt.totalPossibleMarks}`}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
