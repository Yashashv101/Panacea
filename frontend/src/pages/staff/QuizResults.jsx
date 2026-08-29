import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import apiClient from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { rowActionClass } from "../admin/academic/formStyles";

const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
  timeStyle: "short",
});

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

  function toggleExpanded(quizId) {
    setExpandedQuizId((prev) => (prev === quizId ? null : quizId));
  }

  if (loading) {
    return (
      <div>
        <div className="mb-6 border-b border-brass/20 pb-4">
          <h1 className="font-display text-2xl font-semibold text-ink">Quizzes</h1>
        </div>
        <p className="text-sm text-slate">Loading…</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div>
        <div className="mb-6 border-b border-brass/20 pb-4">
          <h1 className="font-display text-2xl font-semibold text-ink">Quizzes</h1>
        </div>
        <p className="text-sm text-oxblood">{loadError}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between border-b border-brass/20 pb-4">
        <h1 className="font-display text-2xl font-semibold text-ink">Quizzes</h1>
        <Link to="/staff/quizzes/new" className={rowActionClass}>
          New quiz
        </Link>
      </div>

      {sortedQuizzes.length === 0 ? (
        <p className="border-b border-brass/20 py-3 text-sm text-slate">
          You haven't created any quizzes yet.
        </p>
      ) : (
        <div className="flex flex-col">
          {sortedQuizzes.map((quiz) => {
            const attempts = attemptsByQuizId[quiz.id] ?? [];
            const expanded = expandedQuizId === quiz.id;
            return (
              <div key={quiz.id} className="border-b border-brass/20 py-3">
                <button
                  type="button"
                  onClick={() => toggleExpanded(quiz.id)}
                  className="flex w-full items-center justify-between text-left"
                >
                  <div>
                    <div className="text-sm text-ink">{quiz.title}</div>
                    <div className="mt-0.5 text-xs text-slate">{quiz.subjectName}</div>
                  </div>
                  <span className="font-mono text-sm text-slate">
                    {attempts.length} attempt{attempts.length === 1 ? "" : "s"}
                  </span>
                </button>

                {expanded && (
                  <div className="mt-3 flex flex-col pl-1">
                    {attempts.length === 0 ? (
                      <p className="py-2 text-sm text-slate">No attempts yet.</p>
                    ) : (
                      attempts.map((attempt) => (
                        <div
                          key={attempt.id}
                          className="flex items-center justify-between border-t border-brass/10 py-2"
                        >
                          <span className="text-sm text-ink">{attempt.studentName}</span>
                          <span className="flex items-center gap-4">
                            <span className="text-xs text-slate">
                              {dateFormatter.format(new Date(attempt.submittedAt))}
                            </span>
                            <span className="font-mono text-sm text-ink">
                              {attempt.rescaleToTen
                                ? `${attempt.rescaledScore.toFixed(1)}/10`
                                : `${attempt.rawScore}/${attempt.totalPossibleMarks}`}
                            </span>
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
