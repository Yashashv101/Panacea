import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import apiClient from "../api/client.js";
import StatusStamp from "../components/StatusStamp.jsx";

const PLACEHOLDER_TABS = [
  "Syllabus",
  "Study Material",
  "Assignment",
  "Discussion Forum",
  "Previous Year Paper",
  "Class Notes",
];

const REAL_TABS = ["Attendance", "Results"];

const dateFormatter = new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short" });

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

  if (error) return <p className="text-sm text-oxblood">{error}</p>;
  if (history === null) return <p className="text-sm text-slate">Loading…</p>;
  if (history.length === 0) return <p className="text-sm text-slate">No attendance recorded yet.</p>;

  return (
    <div className="flex flex-col">
      {history.map((entry, i) => (
        <div
          key={`${entry.date}-${entry.period}-${i}`}
          className="flex items-center justify-between border-b border-brass/20 py-3"
        >
          <span className="font-mono text-sm text-ink">
            {dateFormatter.format(new Date(entry.date))} · Period {entry.period}
          </span>
          <StatusStamp status={entry.present ? "PRESENT" : "ABSENT"} />
        </div>
      ))}
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
        if (!cancelled) setResults(res.data.filter((r) => r.subjectId === Number(subjectId)));
      })
      .catch(() => {
        if (!cancelled) setError("Could not load results.");
      });
    return () => {
      cancelled = true;
    };
  }, [subjectId]);

  if (error) return <p className="text-sm text-oxblood">{error}</p>;
  if (results === null) return <p className="text-sm text-slate">Loading…</p>;
  if (results.length === 0) return <p className="text-sm text-slate">No results published yet.</p>;

  return (
    <div className="flex flex-col gap-6">
      {results.map((result) => (
        <div key={result.id} className="border-b border-brass/20 pb-4">
          <div className="mb-3 flex items-baseline justify-between">
            <span className="text-sm font-medium text-ink">{result.semesterLabel}</span>
            <span className="font-mono text-sm text-ink">
              Total: {result.total != null ? result.total.toFixed(1) : "—"}
            </span>
          </div>
          <div className="grid grid-cols-5 gap-3 text-center">
            {[
              ["Test 1", result.test1],
              ["Test 2", result.test2],
              ["Quiz", result.quiz],
              ["Experiential", result.experiential],
              ["SEE", result.see],
            ].map(([label, value]) => (
              <div key={label}>
                <div className="font-mono text-sm text-ink">{value != null ? value.toFixed(1) : "—"}</div>
                <div className="mt-1 text-[0.65rem] uppercase tracking-wide text-slate">{label}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function SubjectDetail() {
  const { subjectId } = useParams();
  const [subject, setSubject] = useState(null);
  const [accessError, setAccessError] = useState(null);
  const [activeTab, setActiveTab] = useState("Attendance");

  useEffect(() => {
    let cancelled = false;
    setSubject(null);
    setAccessError(null);
    apiClient
      .get(`/students/me/subjects/${subjectId}`)
      .then((res) => {
        if (!cancelled) setSubject(res.data);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err.response?.status === 404) {
          setAccessError("That subject doesn't exist.");
        } else if (err.response?.status === 403) {
          setAccessError("This subject isn't yours to view.");
        } else {
          setAccessError("Could not load this subject.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [subjectId]);

  if (accessError) {
    return (
      <div>
        <div className="mb-6 border-b border-brass/20 pb-4">
          <Link to="/" className="text-xs uppercase tracking-wide text-slate hover:text-oxblood">
            ← Dashboard
          </Link>
        </div>
        <p className="text-sm text-oxblood">{accessError}</p>
      </div>
    );
  }

  if (!subject) {
    return (
      <div>
        <div className="mb-6 border-b border-brass/20 pb-4">
          <h1 className="font-display text-2xl font-semibold text-ink">Loading…</h1>
        </div>
      </div>
    );
  }

  const allTabs = [...REAL_TABS, ...PLACEHOLDER_TABS];

  return (
    <div>
      <div className="mb-6 border-b border-brass/20 pb-4">
        <Link to="/" className="mb-2 block text-xs uppercase tracking-wide text-slate hover:text-oxblood">
          ← Dashboard
        </Link>
        <h1 className="font-display text-2xl font-semibold text-ink">
          {subject.name}
          <span className="ml-3 font-mono text-sm font-normal text-slate">{subject.type}</span>
        </h1>
      </div>

      <div className="flex gap-8">
        <nav className="flex w-48 shrink-0 flex-col border-r border-brass/20 pr-4">
          {allTabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`border-b border-brass/10 py-3 text-left text-sm transition-colors ${
                activeTab === tab ? "font-medium text-oxblood" : "text-slate hover:text-ink"
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>

        <div className="flex-1">
          {activeTab === "Attendance" && <AttendanceTab subjectId={subjectId} />}
          {activeTab === "Results" && <ResultsTab subjectId={subjectId} />}
          {PLACEHOLDER_TABS.includes(activeTab) && (
            <p className="text-sm text-slate">Coming soon.</p>
          )}
        </div>
      </div>
    </div>
  );
}
