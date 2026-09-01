import { useEffect, useMemo, useState } from "react";
import apiClient from "../../api/client";
import HolidaysSection from "./calendar/HolidaysSection";
import ExamSchedulesSection from "./calendar/ExamSchedulesSection";
import CollegeEventsSection from "./calendar/CollegeEventsSection";
import MetricCard from "../../components/MetricCard";
import { CalendarOff, GraduationCap, PartyPopper } from "lucide-react";

export default function CalendarManagement() {
  const [holidays, setHolidays] = useState([]);
  const [exams, setExams] = useState([]);
  const [events, setEvents] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [activeTab, setActiveTab] = useState("holidays");

  useEffect(() => {
    let cancelled = false;

    async function loadAll() {
      try {
        const [holidaysRes, examsRes, eventsRes, semestersRes, coursesRes] = await Promise.all([
          apiClient.get("/calendar/holidays"),
          apiClient.get("/calendar/exams"),
          apiClient.get("/calendar/events"),
          apiClient.get("/semesters"),
          apiClient.get("/courses"),
        ]);
        if (cancelled) return;
        setHolidays(holidaysRes.data);
        setExams(examsRes.data);
        setEvents(eventsRes.data);
        setSemesters(semestersRes.data);
        setCourses(coursesRes.data);
      } catch {
        if (!cancelled) setLoadError("Could not load calendar data.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadAll();
    return () => {
      cancelled = true;
    };
  }, []);

  const tabs = useMemo(
    () => [
      { key: "holidays", label: "Holidays", count: holidays.length, icon: CalendarOff },
      { key: "exams", label: "Exam Schedules", count: exams.length, icon: GraduationCap },
      { key: "events", label: "College Events", count: events.length, icon: PartyPopper },
    ],
    [holidays, exams, events]
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-semibold text-ink">Academic Calendar</h1>
        <p className="mt-1 text-sm text-ink-secondary">Holidays, examination windows, and college-wide events.</p>
      </div>

      {loading ? (
        <p className="text-sm text-ink-secondary">Loading…</p>
      ) : loadError ? (
        <p className="text-sm text-danger">{loadError}</p>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {tabs.map((tab) => (
              <MetricCard key={tab.key} label={tab.label} value={tab.count} icon={tab.icon} />
            ))}
          </div>

          <nav className="mb-6 flex flex-wrap items-center gap-x-8 gap-y-2 border-b border-border">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`relative pb-3 text-sm font-medium transition-colors duration-150 ease-out ${
                    isActive ? "text-accent" : "text-ink-secondary hover:text-ink"
                  }`}
                >
                  {tab.label}
                  {isActive && <span className="absolute inset-x-0 -bottom-px h-0.5 bg-accent" />}
                </button>
              );
            })}
          </nav>

          {activeTab === "holidays" && <HolidaysSection holidays={holidays} setHolidays={setHolidays} />}
          {activeTab === "exams" && (
            <ExamSchedulesSection exams={exams} setExams={setExams} semesters={semesters} courses={courses} />
          )}
          {activeTab === "events" && <CollegeEventsSection events={events} setEvents={setEvents} />}
        </>
      )}
    </div>
  );
}
