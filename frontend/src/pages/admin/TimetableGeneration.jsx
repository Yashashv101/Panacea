import { useEffect, useState } from "react";
import apiClient from "../../api/client";

const DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"];
const PERIODS = [1, 2, 3, 4, 5, 6];

const selectClass =
  "border-0 border-b border-brass/40 bg-transparent px-0 py-2 text-sm text-ink outline-none focus:border-oxblood";
const labelClass = "text-xs font-medium uppercase tracking-wide text-slate";

function dayLabel(day) {
  return day.charAt(0) + day.slice(1).toLowerCase();
}

export default function TimetableGeneration() {
  const [semesters, setSemesters] = useState([]);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [semesterId, setSemesterId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState(null);
  const [message, setMessage] = useState(null);

  const [entries, setEntries] = useState([]);
  const [entriesLoading, setEntriesLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadReferenceData() {
      try {
        const [semestersRes, sectionsRes] = await Promise.all([
          apiClient.get("/semesters"),
          apiClient.get("/sections"),
        ]);
        if (cancelled) return;
        setSemesters(semestersRes.data);
        setSections(sectionsRes.data);
      } catch {
        if (!cancelled) setLoadError("Could not load semesters and sections.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadReferenceData();
    return () => {
      cancelled = true;
    };
  }, []);

  async function loadEntries(id) {
    setEntriesLoading(true);
    try {
      const { data } = await apiClient.get(`/timetable/section/${id}`);
      setEntries(data);
    } catch {
      setMessage({ tone: "error", text: "Could not load the timetable for this section." });
    } finally {
      setEntriesLoading(false);
    }
  }

  function handleSectionChange(value) {
    setSectionId(value);
    setResult(null);
    setMessage(null);
    if (value) {
      loadEntries(value);
    } else {
      setEntries([]);
    }
  }

  async function handleGenerate(e) {
    e.preventDefault();
    setMessage(null);
    setResult(null);
    setGenerating(true);
    try {
      const { data } = await apiClient.post("/timetable/generate", {
        semesterId: Number(semesterId),
        sectionId: Number(sectionId),
      });
      setResult(data);
      await loadEntries(sectionId);
    } catch (err) {
      const status = err.response?.status;
      if (status === 400 && err.response?.data?.errors) {
        setMessage({ tone: "error", text: Object.values(err.response.data.errors)[0] });
      } else if (err.response?.data?.message) {
        setMessage({ tone: "error", text: err.response.data.message });
      } else {
        setMessage({ tone: "error", text: "Could not generate the timetable." });
      }
    } finally {
      setGenerating(false);
    }
  }

  function entryFor(day, period) {
    return entries.find((entry) => entry.day === day && entry.period === period);
  }

  return (
    <div>
      <div className="mb-6 border-b border-brass/20 pb-4">
        <h1 className="font-display text-2xl font-semibold text-ink">Timetable Generation</h1>
      </div>

      {loading ? (
        <p className="text-sm text-slate">Loading…</p>
      ) : loadError ? (
        <p className="text-sm text-oxblood">{loadError}</p>
      ) : (
        <>
          <form onSubmit={handleGenerate} className="mb-6 flex max-w-2xl items-end gap-4">
            <label className="flex flex-1 flex-col gap-1.5">
              <span className={labelClass}>Semester</span>
              <select
                required
                value={semesterId}
                onChange={(e) => setSemesterId(e.target.value)}
                className={selectClass}
              >
                <option value="" disabled>
                  Select a semester
                </option>
                {semesters.map((semester) => (
                  <option key={semester.id} value={semester.id}>
                    Sem {semester.number} — {semester.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-1 flex-col gap-1.5">
              <span className={labelClass}>Section</span>
              <select
                required
                value={sectionId}
                onChange={(e) => handleSectionChange(e.target.value)}
                className={selectClass}
              >
                <option value="" disabled>
                  Select a section
                </option>
                {sections.map((section) => (
                  <option key={section.id} value={section.id}>
                    {section.name} — {section.courseName}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              disabled={generating || !semesterId || !sectionId}
              className="w-fit rounded bg-oxblood px-5 py-2.5 text-sm font-medium text-paper transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {generating ? "Generating…" : "Generate"}
            </button>
          </form>

          {message && <p className="mb-6 text-sm text-oxblood">{message.text}</p>}

          {result && (
            <div className="mb-6 border-b border-brass/20 pb-4">
              <p className="text-sm text-ink">
                <span className="font-mono">{result.created}</span> entries created
                {result.skipped > 0 && (
                  <>
                    , <span className="font-mono">{result.skipped}</span> skipped due to slot conflicts
                  </>
                )}
                .
              </p>
              {result.errors.length > 0 && (
                <ul className="mt-2 flex flex-col gap-1 text-sm text-oxblood">
                  {result.errors.map((err) => (
                    <li key={err}>{err}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {sectionId && (
            <div>
              <h2 className="mb-4 font-display text-lg font-semibold text-ink">Section timetable</h2>
              {entriesLoading ? (
                <p className="text-sm text-slate">Loading…</p>
              ) : entries.length === 0 ? (
                <p className="border-b border-brass/20 py-3 text-sm text-slate">No entries scheduled yet.</p>
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
                            const entry = entryFor(day, period);
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
            </div>
          )}
        </>
      )}
    </div>
  );
}
