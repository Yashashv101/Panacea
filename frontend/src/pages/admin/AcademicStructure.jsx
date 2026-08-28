import { useEffect, useState } from "react";
import apiClient from "../../api/client";
import CoursesSection from "./academic/CoursesSection";
import SemestersSection from "./academic/SemestersSection";
import SectionsSection from "./academic/SectionsSection";
import SubjectsSection from "./academic/SubjectsSection";

export default function AcademicStructure() {
  const [courses, setCourses] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [sections, setSections] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function loadAll() {
      try {
        const [coursesRes, semestersRes, sectionsRes, subjectsRes, staffRes] = await Promise.all([
          apiClient.get("/courses"),
          apiClient.get("/semesters"),
          apiClient.get("/sections"),
          apiClient.get("/subjects"),
          apiClient.get("/users", { params: { role: "STAFF" } }),
        ]);
        if (cancelled) return;
        setCourses(coursesRes.data);
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

  return (
    <div>
      <div className="mb-6 border-b border-brass/20 pb-4">
        <h1 className="font-display text-2xl font-semibold text-ink">Academic Structure</h1>
      </div>

      {loading ? (
        <p className="text-sm text-slate">Loading…</p>
      ) : loadError ? (
        <p className="text-sm text-oxblood">{loadError}</p>
      ) : (
        <>
          <CoursesSection courses={courses} setCourses={setCourses} />
          <SemestersSection semesters={semesters} setSemesters={setSemesters} />
          <SectionsSection sections={sections} setSections={setSections} courses={courses} />
          <SubjectsSection
            subjects={subjects}
            setSubjects={setSubjects}
            semesters={semesters}
            courses={courses}
            sections={sections}
            staff={staff}
          />
        </>
      )}
    </div>
  );
}
