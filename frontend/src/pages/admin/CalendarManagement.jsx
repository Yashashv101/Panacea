import { useEffect, useState } from "react";
import apiClient from "../../api/client";
import HolidaysSection from "./calendar/HolidaysSection";
import ExamSchedulesSection from "./calendar/ExamSchedulesSection";
import CollegeEventsSection from "./calendar/CollegeEventsSection";

export default function CalendarManagement() {
  const [holidays, setHolidays] = useState([]);
  const [exams, setExams] = useState([]);
  const [events, setEvents] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

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

  return (
    <div>
      <div className="mb-6 border-b border-brass/20 pb-4">
        <h1 className="font-display text-2xl font-semibold text-ink">Academic Calendar</h1>
      </div>

      {loading ? (
        <p className="text-sm text-slate">Loading…</p>
      ) : loadError ? (
        <p className="text-sm text-oxblood">{loadError}</p>
      ) : (
        <>
          <HolidaysSection holidays={holidays} setHolidays={setHolidays} />
          <ExamSchedulesSection exams={exams} setExams={setExams} semesters={semesters} courses={courses} />
          <CollegeEventsSection events={events} setEvents={setEvents} />
        </>
      )}
    </div>
  );
}
