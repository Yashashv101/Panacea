import { useEffect, useMemo, useState } from "react";
import apiClient from "../../api/client";
import CoursesSection from "./academic/CoursesSection";
import SessionsSection from "./academic/SessionsSection";
import SemestersSection from "./academic/SemestersSection";
import SectionsSection from "./academic/SectionsSection";
import SubjectsSection from "./academic/SubjectsSection";
import SyllabusSection from "./academic/SyllabusSection";
import MetricCard from "../../components/MetricCard";
import { Building2, CalendarRange, Layers3, Grid3x3, BookOpen, FileCheck } from "lucide-react";

export default function AcademicStructure() {
  const [courses, setCourses] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [sections, setSections] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [activeTab, setActiveTab] = useState("courses");

  useEffect(() => {
    let cancelled = false;

    async function loadAll() {
      try {
        const [coursesRes, sessionsRes, semestersRes, sectionsRes, subjectsRes, staffRes] = await Promise.all([
          apiClient.get("/courses"),
          apiClient.get("/sessions"),
          apiClient.get("/semesters"),
          apiClient.get("/sections"),
          apiClient.get("/subjects"),
          apiClient.get("/users", { params: { role: "STAFF" } }),
        ]);
        if (cancelled) return;
        setCourses(coursesRes.data);
        setSessions(sessionsRes.data);
        setSemesters(semestersRes.data);
        setSections(sectionsRes.data);
        setSubjects(subjectsRes.data);
        setStaff(staffRes.data);
      } catch {
        if (!cancelled) setLoadError("Could not load academic structure data.");
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
      { key: "courses", label: "Courses", count: courses.length, icon: Building2 },
      { key: "sessions", label: "Sessions", count: sessions.length, icon: CalendarRange },
      { key: "semesters", label: "Semesters", count: semesters.length, icon: Layers3 },
      { key: "sections", label: "Sections", count: sections.length, icon: Grid3x3 },
      { key: "subjects", label: "Subjects", count: subjects.length, icon: BookOpen },
      {
        key: "syllabus",
        label: "Syllabus",
        count: subjects.filter((s) => s.syllabusUploaded).length,
        icon: FileCheck,
      },
    ],
    [courses, sessions, semesters, sections, subjects]
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-semibold text-ink">Academic Structure</h1>
        <p className="mt-1 text-sm text-ink-secondary">Courses, calendars, and curriculum for the institution.</p>
      </div>

      {loading ? (
        <p className="text-sm text-ink-secondary">Loading…</p>
      ) : loadError ? (
        <p className="text-sm text-danger">{loadError}</p>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
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

          {activeTab === "courses" && <CoursesSection courses={courses} setCourses={setCourses} />}
          {activeTab === "sessions" && <SessionsSection sessions={sessions} setSessions={setSessions} />}
          {activeTab === "semesters" && (
            <SemestersSection semesters={semesters} setSemesters={setSemesters} sessions={sessions} />
          )}
          {activeTab === "sections" && (
            <SectionsSection sections={sections} setSections={setSections} courses={courses} />
          )}
          {activeTab === "subjects" && (
            <SubjectsSection
              subjects={subjects}
              setSubjects={setSubjects}
              semesters={semesters}
              courses={courses}
              sections={sections}
              staff={staff}
            />
          )}
          {activeTab === "syllabus" && (
            <SyllabusSection subjects={subjects} setSubjects={setSubjects} courses={courses} />
          )}
        </>
      )}
    </div>
  );
}
