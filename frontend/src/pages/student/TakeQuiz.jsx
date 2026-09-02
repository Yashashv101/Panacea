import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import apiClient from "../../api/client";
import Card from "../../components/Card";
import { primaryButtonClass, rowActionClass, extractErrorMessage } from "../admin/academic/formStyles";

function QuizList() {
  const [quizzes, setQuizzes] = useState([]);
  const [attemptByQuizId, setAttemptByQuizId] = useState({});
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
        setQuizzes(data);

        const attemptEntries = await Promise.all(
          data.map((quiz) =>
            apiClient
              .get(`/mcq/quizzes/${quiz.id}/attempts/me`)
              .then((res) => [quiz.id, res.data])
              .catch(() => [quiz.id, null])
          )
        );
        if (cancelled) return;
        setAttemptByQuizId(Object.fromEntries(attemptEntries));
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
  }, []);

  const sortedQuizzes = useMemo(
    () => [...quizzes].sort((a, b) => a.title.localeCompare(b.title)),
    [quizzes]
  );

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
      <div className="mb-6">
        <h1 className="font-display text-2xl font-semibold text-ink">Quizzes</h1>
      </div>

      {sortedQuizzes.length === 0 ? (
        <p className="text-sm text-ink-secondary">No quizzes available yet.</p>
      ) : (
        <Card>
          <div className="flex flex-col divide-y divide-border">
            {sortedQuizzes.map((quiz) => {
              const attempt = attemptByQuizId[quiz.id];
              return (
                <div key={quiz.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                  <div>
                    <div className="text-sm font-medium text-ink">{quiz.title}</div>
                    <div className="mt-0.5 text-xs text-ink-muted">{quiz.subjectName}</div>
                  </div>
                  {attempt ? (
                    <span className="font-mono text-sm text-ink-secondary">
                      Attempted —{" "}
                      {attempt.rescaleToTen
                        ? `${attempt.rescaledScore.toFixed(1)}/10`
                        : `${attempt.rawScore}/${attempt.totalPossibleMarks}`}
                    </span>
                  ) : (
                    <Link to={`/quizzes/${quiz.id}`} className={rowActionClass}>
                      Take quiz
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}

function QuizAttempt({ quizId }) {
  const navigate = useNavigate();

  const [quiz, setQuiz] = useState(null);
  const [existingAttempt, setExistingAttempt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [result, setResult] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setLoadError(null);
      try {
        const [quizRes, attemptRes] = await Promise.all([
          apiClient.get(`/mcq/quizzes/${quizId}`),
          apiClient.get(`/mcq/quizzes/${quizId}/attempts/me`).catch(() => ({ data: null })),
        ]);
        if (cancelled) return;
        setQuiz(quizRes.data);
        setExistingAttempt(attemptRes.data);
      } catch {
        if (!cancelled) setLoadError("Could not load this quiz.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [quizId]);

  function selectAnswer(questionId, optionIndex) {
    setAnswers((prev) => ({ ...prev, [questionId]: optionIndex }));
  }

  const allAnswered = quiz != null && quiz.questions.every((q) => answers[q.id] !== undefined);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitError(null);
    setSubmitting(true);
    try {
      const { data } = await apiClient.post(`/mcq/quizzes/${quizId}/attempts`, { answers });
      setResult(data);
    } catch (err) {
      setSubmitError(extractErrorMessage(err, "Could not submit this attempt."));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div>
        <div className="mb-6">
          <h1 className="font-display text-2xl font-semibold text-ink">Quiz</h1>
        </div>
        <p className="text-sm text-ink-secondary">Loading…</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div>
        <div className="mb-6">
          <h1 className="font-display text-2xl font-semibold text-ink">Quiz</h1>
        </div>
        <p className="text-sm text-danger">{loadError}</p>
      </div>
    );
  }

  const finished = result ?? existingAttempt;

  return (
    <div>
      <div className="mb-6">
        <Link to="/quizzes" className={rowActionClass}>
          ← Back to quizzes
        </Link>
        <h1 className="mt-2 font-display text-2xl font-semibold text-ink">{quiz.title}</h1>
        <p className="mt-1 text-xs text-ink-muted">{quiz.subjectName}</p>
      </div>

      {finished ? (
        <Card>
          <p className="text-sm text-ink">
            You scored{" "}
            <span className="font-mono font-semibold text-accent">
              {finished.rescaleToTen
                ? `${finished.rescaledScore.toFixed(1)}/10`
                : `${finished.rawScore}/${finished.totalPossibleMarks}`}
            </span>
            .
          </p>
        </Card>
      ) : (
        <Card className="max-w-2xl">
          <form onSubmit={handleSubmit} className="flex flex-col gap-0">
            <div className="flex flex-col divide-y divide-border">
              {quiz.questions.map((question, qIndex) => (
                <div key={question.id} className="py-5 first:pt-0 last:pb-0">
                  <p className="mb-3 text-sm text-ink">
                    {qIndex + 1}. {question.text}
                  </p>
                  <div className="flex flex-col gap-2.5 pl-1">
                    {question.options.map((option, oIndex) => (
                      <label key={oIndex} className="flex items-center gap-3 text-sm text-ink">
                        <input
                          type="radio"
                          name={`question-${question.id}`}
                          checked={answers[question.id] === oIndex}
                          onChange={() => selectAnswer(question.id, oIndex)}
                          className="accent-accent"
                        />
                        {option}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {submitError && <p className="mt-4 text-sm text-danger">{submitError}</p>}

            <button
              type="submit"
              disabled={!allAnswered || submitting}
              className={`${primaryButtonClass} mt-6`}
            >
              {submitting ? "Submitting…" : "Submit answers"}
            </button>
          </form>
        </Card>
      )}
    </div>
  );
}

export default function TakeQuiz() {
  const { quizId } = useParams();
  return quizId ? <QuizAttempt quizId={quizId} /> : <QuizList />;
}
