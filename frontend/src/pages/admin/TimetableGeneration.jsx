import { useEffect, useMemo, useState } from "react";
import apiClient from "../../api/client";
import { inputClass, labelClass, primaryButtonClass, extractErrorMessage } from "./academic/formStyles";
import StatusStamp from "../../components/StatusStamp";

const DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"];
const PERIODS = [1, 2, 3, 4, 5, 6];

function dayLabel(day) {
  return day.charAt(0) + day.slice(1).toLowerCase();
}

export default function TimetableGeneration() {
  const [sessions, setSessions] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [courses, setCourses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [sessionId, setSessionId] = useState("");
  const [semesterId, setSemesterId] = useState("");
  const [courseId, setCourseId] = useState("");
  const [selectedElectiveIds, setSelectedElectiveIds] = useState([]);

  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState(null);
  const [message, setMessage] = useState(null);

  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState(false);
  const [publishMessage, setPublishMessage] = useState(null);

  const [expandedSectionId, setExpandedSectionId] = useState(null);
  const [sectionEntries, setSectionEntries] = useState([]);
  const [sectionEntriesLoading, setSectionEntriesLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadReferenceData() {
      try {
        const [sessionsRes, semestersRes, coursesRes, subjectsRes] = await Promise.all([
          apiClient.get("/sessions"),
          apiClient.get("/semesters"),
          apiClient.get("/courses"),
          apiClient.get("/subjects"),
        ]);
        if (cancelled) return;
        setSessions(sessionsRes.data);
        setSemesters(semestersRes.data);
        setCourses(coursesRes.data.filter((course) => course.active));
        setSubjects(subjectsRes.data);
      } catch {
        if (!cancelled) setLoadError("Could not load timetable reference data.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadReferenceData();
    return () => {
      cancelled = true;
    };
  }, []);

  const semestersForSelectedSession = useMemo(
    () => semesters.filter((semester) => String(semester.sessionId) === String(sessionId)),
    [semesters, sessionId]
  );

  const subjectsForSelection = useMemo(() => {
    if (!semesterId || !courseId) return { core: [], electives: [] };
    const inScope = subjects.filter(
      (subject) =>
        String(subject.semesterId) === String(semesterId) &&
        subject.courseIds?.some((id) => String(id) === String(courseId))
    );
    return {
      core: inScope.filter((subject) => subject.type === "CORE"),
      electives: inScope.filter((subject) => subject.type === "ELECTIVE"),
    };
  }, [subjects, semesterId, courseId]);

  function handleSessionChange(value) {
    setSessionId(value);
    setSemesterId("");
    setResult(null);
    setMessage(null);
  }

  function handleSemesterChange(value) {
    setSemesterId(value);
    setSelectedElectiveIds([]);
    setResult(null);
    setMessage(null);
  }

  function handleCourseChange(value) {
    setCourseId(value);
    setSelectedElectiveIds([]);
    setResult(null);
    setMessage(null);
  }

  function toggleElective(id) {
    setSelectedElectiveIds((prev) =>
      prev.includes(id) ? prev.filter((existing) => existing !== id) : [...prev, id]
    );
  }

  async function handleGenerate(e) {
    e.preventDefault();
    setMessage(null);
    setResult(null);
    setGenerating(true);
    try {
      const { data } = await apiClient.post("/timetable/generate-for-course", {
        semesterId: Number(semesterId),
        courseId: Number(courseId),
        electiveSubjectIds: selectedElectiveIds.map(Number),
      });
      setResult(data);
      setExpandedSectionId(null);
      setSectionEntries([]);
      setPublished(false);
      setPublishMessage(null);
    } catch (err) {
      setMessage({
        tone: "error",
        text: extractErrorMessage(err, "Could not generate the timetable for this department."),
      });
    } finally {
      setGenerating(false);
    }
  }

  async function handleSave() {
    setPublishMessage(null);
    setPublishing(true);
    try {
      const { data } = await apiClient.post("/timetable/publish", {
        semesterId: Number(semesterId),
        courseId: Number(courseId),
      });
      setPublished(true);
      setPublishMessage({
        tone: "success",
        text: `Saved — ${data.entriesPublished} entries across ${data.sectionsAffected} sections are now visible on students' dashboards.`,
      });
    } catch (err) {
      setPublishMessage({
        tone: "error",
        text: extractErrorMessage(err, "Could not save this timetable."),
      });
    } finally {
      setPublishing(false);
    }
  }

  async function toggleSectionDetail(sectionId) {
    if (expandedSectionId === sectionId) {
      setExpandedSectionId(null);
      setSectionEntries([]);
      return;
    }
    setExpandedSectionId(sectionId);
    setSectionEntriesLoading(true);
    try {
      const { data } = await apiClient.get(`/timetable/section/${sectionId}`);
      setSectionEntries(data);
    } catch {
      setMessage({ tone: "error", text: "Could not load this section's timetable." });
    } finally {
      setSectionEntriesLoading(false);
    }
  }

  function entryFor(day, period) {
    return sectionEntries.find((entry) => entry.day === day && entry.period === period);
  }

  const canGenerate = Boolean(sessionId && semesterId && courseId) && !generating;

  return (
    <div>
      <div className="mb-6 border-b border-brass/20 pb-4">
        <h1 className="font-display text-2xl font-semibold text-ink">Timetable Generation</h1>
        <p className="mt-1 text-sm text-slate">
          Generates timetables for every section in a department at once, avoiding staff conflicts across all of
          them.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-slate">Loading…</p>
      ) : loadError ? (
        <p className="text-sm text-oxblood">{loadError}</p>
      ) : (
        <>
          <form onSubmit={handleGenerate} className="mb-8 flex max-w-3xl flex-col gap-5">
            <div className="grid grid-cols-3 gap-5">
              <label className="flex flex-col gap-1.5">
                <span className={labelClass}>Session</span>
                <select
                  required
                  value={sessionId}
                  onChange={(e) => handleSessionChange(e.target.value)}
                  className={inputClass}
                >
                  <option value="" disabled>
                    Select a session
                  </option>
                  {sessions.map((session) => (
                    <option key={session.id} value={session.id}>
                      {session.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1.5">
                <span className={labelClass}>Semester</span>
                <select
                  required
                  disabled={!sessionId}
                  value={semesterId}
                  onChange={(e) => handleSemesterChange(e.target.value)}
                  className={inputClass}
                >
                  <option value="" disabled>
                    {sessionId ? "Select a semester" : "Select a session first"}
                  </option>
                  {semestersForSelectedSession.map((semester) => (
                    <option key={semester.id} value={semester.id}>
                      Sem {semester.number} — {semester.label} ({semester.parity})
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1.5">
                <span className={labelClass}>Department</span>
                <select
                  required
                  value={courseId}
                  onChange={(e) => handleCourseChange(e.target.value)}
                  className={inputClass}
                >
                  <option value="" disabled>
                    Select a department
                  </option>
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {semesterId && courseId && (
              <div className="border-t border-brass/20 pt-5">
                <h2 className="mb-3 font-display text-base font-semibold text-ink">Subjects to schedule</h2>

                <div className="mb-4">
                  <p className={`mb-2 ${labelClass}`}>Core (always included)</p>
                  {subjectsForSelection.core.length === 0 ? (
                    <p className="text-sm text-slate">No core subjects found for this department and semester.</p>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      {subjectsForSelection.core.map((subject) => (
                        <div key={subject.id} className="flex items-center gap-3 text-sm text-ink">
                          <span aria-hidden className="text-oxblood">
                            ✓
                          </span>
                          <span>{subject.name}</span>
                          <span className="font-mono text-xs text-slate">{subject.credits} cr</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <p className={`mb-2 ${labelClass}`}>Electives (pick which to include)</p>
                  {subjectsForSelection.electives.length === 0 ? (
                    <p className="text-sm text-slate">No electives available for this department and semester.</p>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      {subjectsForSelection.electives.map((subject) => (
                        <label key={subject.id} className="flex items-center gap-3 text-sm text-ink">
                          <input
                            type="checkbox"
                            checked={selectedElectiveIds.includes(subject.id)}
                            onChange={() => toggleElective(subject.id)}
                            className="accent-oxblood"
                          />
                          <span>{subject.name}</span>
                          <span className="font-mono text-xs text-slate">{subject.credits} cr</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            <button type="submit" disabled={!canGenerate} className={primaryButtonClass}>
              {generating ? "Generating…" : "Generate"}
            </button>
          </form>

          {message && <p className="mb-6 text-sm text-oxblood">{message.text}</p>}

          {result && (
            <div>
              <div className="mb-4 border-b border-brass/20 pb-4">
                <p className="text-sm text-ink">
                  <span className="font-mono">{result.created}</span> entries created across{" "}
                  <span className="font-mono">{result.sections.length}</span> sections
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

                <div className="mt-4 flex items-center gap-4">
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={publishing || published}
                    className={primaryButtonClass}
                  >
                    {publishing ? "Saving…" : published ? "Saved" : "Save"}
                  </button>
                  <p className="text-xs text-slate">
                    Not visible to students until saved. Regenerating above reverts to draft.
                  </p>
                </div>
                {publishMessage && (
                  <p className={`mt-2 text-sm ${publishMessage.tone === "success" ? "text-slate" : "text-oxblood"}`}>
                    {publishMessage.text}
                  </p>
                )}
              </div>

              <h2 className="mb-3 font-display text-lg font-semibold text-ink">Per-section breakdown</h2>
              <div className="flex flex-col">
                {result.sections.map((section) => (
                  <div key={section.sectionId} className="border-b border-brass/20 py-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-ink">{section.sectionName}</span>
                        <span className="font-mono text-sm text-slate">{section.created} entries</span>
                        {section.skipped > 0 && (
                          <StatusStamp status={`${section.skipped} SKIPPED`} variant="negative" />
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleSectionDetail(section.sectionId)}
                        className="text-xs font-medium uppercase tracking-wide text-slate hover:text-oxblood"
                      >
                        {expandedSectionId === section.sectionId ? "Hide" : "View"} timetable
                      </button>
                    </div>

                    {expandedSectionId === section.sectionId && (
                      <div className="mt-3 overflow-x-auto">
                        {sectionEntriesLoading ? (
                          <p className="text-sm text-slate">Loading…</p>
                        ) : (
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
                                  <td className="border-b border-brass/20 py-3 pr-4 text-sm text-ink">
                                    {dayLabel(day)}
                                  </td>
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
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
