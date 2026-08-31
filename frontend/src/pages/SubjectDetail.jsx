import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import apiClient from "../api/client.js";
import StatusStamp from "../components/StatusStamp.jsx";
import PdfViewer from "../components/PdfViewer.jsx";

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

  if (error) return <p className="text-sm text-oxblood">{error}</p>;
  if (history === null) return <p className="text-sm text-slate">Loading…</p>;
  if (history.length === 0) return <p className="text-sm text-slate">No attendance records found.</p>;

  return (
    <div className="flex flex-col">
      <div className="mb-2 border-b border-brass/40 pb-1">
        <span className="font-display text-xs uppercase tracking-widest text-brass">Session History</span>
      </div>
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-brass/20 text-xs uppercase tracking-wide text-slate">
            <th className="py-2 pr-4 font-normal">Date</th>
            <th className="py-2 pr-4 font-normal">Period</th>
            <th className="py-2 pr-4 font-normal">Status</th>
          </tr>
        </thead>
        <tbody>
          {history.map((row) => (
            <tr key={row.attendanceId} className="border-b border-brass/10">
              <td className="py-2.5 pr-4 font-mono text-xs text-ink">{row.date}</td>
              <td className="py-2.5 pr-4 font-mono text-xs text-slate">P{row.period}</td>
              <td className="py-2.5 pr-4">
                <StatusStamp status={row.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ResultsTab({ subjectId }) {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    apiClient
      .get(`/results/subject/${subjectId}`)
      .then((res) => {
        if (!cancelled) setResult(res.data);
      })
      .catch((err) => {
        if (!cancelled && err.response?.status !== 404) {
          setError("Could not load results.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [subjectId]);

  if (loading) return <p className="text-sm text-slate">Loading results…</p>;
  if (error) return <p className="text-sm text-oxblood">{error}</p>;
  if (!result) return <p className="text-sm text-slate">No results published for this subject yet.</p>;

  const cieTotal =
    result.cieTotal ??
    (result.test1 != null && result.test2 != null && result.experiential != null
      ? (result.test1 + result.test2 + result.experiential).toFixed(1)
      : "—");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="mb-2 border-b border-brass/40 pb-1">
          <span className="font-display text-xs uppercase tracking-widest text-brass">
            Continuous Internal Evaluation (CIE)
          </span>
        </div>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-brass/20 text-xs uppercase tracking-wide text-slate">
              <th className="py-2 pr-4 font-normal">Component</th>
              <th className="py-2 pr-4 font-normal text-right">Max</th>
              <th className="py-2 pr-4 font-normal text-right">Scored</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-brass/10">
              <td className="py-2.5 pr-4 text-ink">Test 1</td>
              <td className="py-2.5 pr-4 font-mono text-xs text-slate text-right">25.0</td>
              <td className="py-2.5 pr-4 font-mono text-sm text-ink text-right">
                {result.test1 != null ? result.test1.toFixed(1) : "—"}
              </td>
            </tr>
            <tr className="border-b border-brass/10">
              <td className="py-2.5 pr-4 text-ink">Test 2</td>
              <td className="py-2.5 pr-4 font-mono text-xs text-slate text-right">25.0</td>
              <td className="py-2.5 pr-4 font-mono text-sm text-ink text-right">
                {result.test2 != null ? result.test2.toFixed(1) : "—"}
              </td>
            </tr>
            <tr className="border-b border-brass/10">
              <td className="py-2.5 pr-4 text-ink">Experiential Learning</td>
              <td className="py-2.5 pr-4 font-mono text-xs text-slate text-right">50.0</td>
              <td className="py-2.5 pr-4 font-mono text-sm text-ink text-right">
                {result.experiential != null ? result.experiential.toFixed(1) : "—"}
              </td>
            </tr>
            <tr className="border-b border-brass/20 font-medium">
              <td className="py-2.5 pr-4 text-ink">CIE Total</td>
              <td className="py-2.5 pr-4 font-mono text-xs text-slate text-right">100.0</td>
              <td className="py-2.5 pr-4 font-mono text-sm text-ink text-right">{cieTotal}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div>
        <div className="mb-2 border-b border-brass/40 pb-1">
          <span className="font-display text-xs uppercase tracking-widest text-brass">
            Semester End Examination (SEE)
          </span>
        </div>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-brass/20 text-xs uppercase tracking-wide text-slate">
              <th className="py-2 pr-4 font-normal">Component</th>
              <th className="py-2 pr-4 font-normal text-right">Max</th>
              <th className="py-2 pr-4 font-normal text-right">Scored</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-brass/10">
              <td className="py-2.5 pr-4 text-ink">SEE Theory</td>
              <td className="py-2.5 pr-4 font-mono text-xs text-slate text-right">100.0</td>
              <td className="py-2.5 pr-4 font-mono text-sm text-ink text-right">
                {result.see != null ? result.see.toFixed(1) : "—"}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="border-t border-brass/20 pt-3 flex items-center justify-between">
        <span className="text-xs uppercase tracking-wide text-slate">Grade Awarded</span>
        <span className="font-mono text-lg font-semibold text-oxblood">
          {result.grade ?? "Pending"}
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

  if (loading) return <p className="text-sm text-slate">Loading {title.toLowerCase()}…</p>;
  if (error) return <p className="text-sm text-oxblood">{error}</p>;
  if (items.length === 0) return <p className="text-sm text-slate">{emptyMessage}</p>;

  return (
    <div className="flex flex-col gap-4">
      <div className="border-b border-brass/40 pb-1 flex items-center justify-between">
        <span className="font-display text-xs uppercase tracking-widest text-brass">
          {title} ({items.length})
        </span>
      </div>

      <div className="flex flex-col">
        {items.map((item) => {
          const isViewing = activePdfId === item.id;
          return (
            <div key={item.id} className="border-b border-brass/10 py-3.5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex flex-col gap-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-ink">{item.title}</span>
                    <span className="font-mono text-xs text-slate">
                      {dateFormatter.format(new Date(item.createdAt))}
                    </span>
                  </div>
                  {item.description && (
                    <p className="text-xs text-slate whitespace-pre-wrap">{item.description}</p>
                  )}
                  <span className="text-[11px] text-slate">Uploaded by {item.uploadedByName}</span>
                </div>

                <button
                  type="button"
                  onClick={() => setActivePdfId((prev) => (prev === item.id ? null : item.id))}
                  className="shrink-0 text-xs uppercase font-medium tracking-wide text-oxblood hover:underline"
                >
                  {isViewing ? "Hide Document" : "View Document"}
                </button>
              </div>

              {isViewing && (
                <div className="mt-3 pt-3 border-t border-brass/10">
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
    </div>
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

  if (loading) return <p className="text-sm text-slate">Loading subject…</p>;
  if (error) return <p className="text-sm text-oxblood">{error}</p>;
  if (!subject) return null;

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
          {activeTab === "Syllabus" && (
            subject.syllabusUploaded ? (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium uppercase tracking-wide text-slate">
                    Official Course Syllabus
                  </span>
                </div>
                <PdfViewer
                  url={`/subjects/${subjectId}/syllabus`}
                  title={`${subject.name} Syllabus`}
                  height="calc(100vh - 200px)"
                  minHeight="800px"
                />
              </div>
            ) : (
              <p className="text-sm text-slate">
                No syllabus has been uploaded for this subject yet.
              </p>
            )
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
            <p className="text-sm text-slate">Coming soon.</p>
          )}
        </div>
      </div>
    </div>
  );
}
