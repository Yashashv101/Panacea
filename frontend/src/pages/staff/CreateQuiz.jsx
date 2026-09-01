import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import apiClient from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import {
  inputClass,
  labelClass,
  primaryButtonClass,
  rowActionClass,
  dangerActionClass,
  extractErrorMessage,
} from "../admin/academic/formStyles";
import Card from "../../components/Card";

let nextQuestionKey = 0;
function emptyQuestion() {
  return { key: nextQuestionKey++, text: "", options: ["", ""], correctOptionIndex: 0, marks: "1" };
}

export default function CreateQuiz() {
  const { userId } = useAuth();
  const navigate = useNavigate();

  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [subjectId, setSubjectId] = useState("");
  const [title, setTitle] = useState("");
  const [rescaleToTen, setRescaleToTen] = useState(false);
  const [questions, setQuestions] = useState([emptyQuestion()]);

  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    let cancelled = false;

    apiClient
      .get("/subjects")
      .then((res) => {
        if (!cancelled) setSubjects(res.data);
      })
      .catch(() => {
        if (!cancelled) setLoadError("Could not load subjects.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const ownedSubjects = useMemo(
    () => subjects.filter((subject) => subject.primaryStaffId === userId),
    [subjects, userId]
  );

  function updateQuestion(key, patch) {
    setQuestions((prev) => prev.map((q) => (q.key === key ? { ...q, ...patch } : q)));
  }

  function updateOption(key, index, value) {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.key !== key) return q;
        const options = [...q.options];
        options[index] = value;
        return { ...q, options };
      })
    );
  }

  function addOption(key) {
    setQuestions((prev) =>
      prev.map((q) => (q.key === key ? { ...q, options: [...q.options, ""] } : q))
    );
  }

  function removeOption(key, index) {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.key !== key || q.options.length <= 2) return q;
        const options = q.options.filter((_, i) => i !== index);
        const correctOptionIndex =
          q.correctOptionIndex === index
            ? 0
            : q.correctOptionIndex > index
            ? q.correctOptionIndex - 1
            : q.correctOptionIndex;
        return { ...q, options, correctOptionIndex };
      })
    );
  }

  function addQuestion() {
    setQuestions((prev) => [...prev, emptyQuestion()]);
  }

  function removeQuestion(key) {
    setQuestions((prev) => (prev.length <= 1 ? prev : prev.filter((q) => q.key !== key)));
  }

  const canSubmit =
    subjectId &&
    title.trim() &&
    questions.length > 0 &&
    questions.every((q) => q.text.trim() && q.options.every((o) => o.trim()) && Number(q.marks) >= 1);

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage(null);
    setSubmitting(true);
    try {
      await apiClient.post("/mcq/quizzes", {
        title,
        subjectId: Number(subjectId),
        rescaleToTen,
        questions: questions.map((q) => ({
          text: q.text,
          options: q.options,
          correctOptionIndex: q.correctOptionIndex,
          marks: Number(q.marks) || 1,
        })),
      });
      navigate("/staff/quizzes");
    } catch (err) {
      if (err.response?.status === 403) {
        setMessage({ tone: "error", text: "You are not the primary staff for this subject." });
      } else {
        setMessage({ tone: "error", text: extractErrorMessage(err, "Could not create the quiz.") });
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div>
        <div className="mb-6">
          <h1 className="font-display text-2xl font-semibold text-ink">New Quiz</h1>
        </div>
        <p className="text-sm text-ink-secondary">Loading…</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div>
        <div className="mb-6">
          <h1 className="font-display text-2xl font-semibold text-ink">New Quiz</h1>
        </div>
        <p className="text-sm text-danger">{loadError}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-semibold text-ink">New Quiz</h1>
      </div>

      {ownedSubjects.length === 0 ? (
        <p className="text-sm text-ink-secondary">
          You are not the primary staff for any subject, so there is nothing to create a quiz for.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="flex max-w-2xl flex-col gap-6">
          <Card title="Quiz details">
            <div className="grid grid-cols-2 gap-5">
              <label className="flex flex-col gap-1.5">
                <span className={labelClass}>Subject</span>
                <select
                  required
                  value={subjectId}
                  onChange={(e) => setSubjectId(e.target.value)}
                  className={inputClass}
                >
                  <option value="" disabled>
                    Select a subject
                  </option>
                  {ownedSubjects.map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1.5">
                <span className={labelClass}>Title</span>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className={inputClass}
                />
              </label>
            </div>

            <label className="mt-5 flex items-center gap-2.5">
              <input
                type="checkbox"
                checked={rescaleToTen}
                onChange={(e) => setRescaleToTen(e.target.checked)}
                className="accent-accent"
              />
              <span className={labelClass}>Rescale final score to /10</span>
            </label>
          </Card>

          <Card
            title="Questions"
            action={
              <button type="button" onClick={addQuestion} className={rowActionClass}>
                Add question
              </button>
            }
          >
            <div className="flex flex-col divide-y divide-border">
              {questions.map((question, qIndex) => (
                <div key={question.key} className="py-5 first:pt-0 last:pb-0">
                  <div className="mb-3 flex items-start justify-between gap-4">
                    <label className="flex flex-1 flex-col gap-1.5">
                      <span className={labelClass}>Question {qIndex + 1}</span>
                      <input
                        type="text"
                        required
                        value={question.text}
                        onChange={(e) => updateQuestion(question.key, { text: e.target.value })}
                        className={inputClass}
                      />
                    </label>
                    <label className="flex w-24 flex-col gap-1.5">
                      <span className={labelClass}>Marks</span>
                      <input
                        type="number"
                        min={1}
                        step={1}
                        required
                        value={question.marks}
                        onChange={(e) => updateQuestion(question.key, { marks: e.target.value })}
                        className={inputClass}
                      />
                    </label>
                    {questions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeQuestion(question.key)}
                        className={`${dangerActionClass} mt-6`}
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <div className="flex flex-col gap-2.5 pl-1">
                    {question.options.map((option, oIndex) => (
                      <div key={oIndex} className="flex items-center gap-3">
                        <label className="flex items-center gap-2">
                          <input
                            type="radio"
                            name={`correct-${question.key}`}
                            checked={question.correctOptionIndex === oIndex}
                            onChange={() => updateQuestion(question.key, { correctOptionIndex: oIndex })}
                            className="accent-accent"
                          />
                        </label>
                        <input
                          type="text"
                          required
                          placeholder={`Option ${oIndex + 1}`}
                          value={option}
                          onChange={(e) => updateOption(question.key, oIndex, e.target.value)}
                          className={`${inputClass} flex-1`}
                        />
                        {question.options.length > 2 && (
                          <button
                            type="button"
                            onClick={() => removeOption(question.key, oIndex)}
                            className={dangerActionClass}
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    ))}
                    <button type="button" onClick={() => addOption(question.key)} className={`${rowActionClass} w-fit`}>
                      Add option
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {message && (
            <p className={`text-sm ${message.tone === "success" ? "text-ink-secondary" : "text-danger"}`}>
              {message.text}
            </p>
          )}

          <button type="submit" disabled={submitting || !canSubmit} className={`${primaryButtonClass} w-fit`}>
            {submitting ? "Creating…" : "Create quiz"}
          </button>
        </form>
      )}
    </div>
  );
}
