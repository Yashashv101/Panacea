import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import apiClient from "../../api/client";
import { useAuth } from "../../context/AuthContext";

function SectionHeader({ title }) {
  return (
    <div className="mb-1 mt-6 border-b border-brass/40 pb-1 first:mt-0">
      <span className="font-display text-xs uppercase tracking-widest text-brass">
        {title}
      </span>
    </div>
  );
}

function SubjectRow({ subject }) {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => navigate(`/hod/subjects/${subject.id}`)}
      className="flex w-full items-center justify-between border-b border-brass/10 py-3 text-left transition-colors hover:bg-card"
    >
      <span className="text-sm text-ink">{subject.name}</span>
      <div className="flex items-center gap-6">
        {subject.primaryStaffName && (
          <span className="text-xs text-slate">{subject.primaryStaffName}</span>
        )}
        <span className="font-mono text-sm text-slate">
          {subject.credits} cr
        </span>
      </div>
    </button>
  );
}

function SubjectTable({ subjects, emptyMessage }) {
  if (subjects.length === 0) {
    return <p className="py-4 text-sm text-slate">{emptyMessage}</p>;
  }
  return (
    <div className="flex flex-col">
      {subjects.map((s) => (
        <SubjectRow key={s.id} subject={s} />
      ))}
    </div>
  );
}

export default function HodSubjects() {
  const { userId } = useAuth();
  const [subjects, setSubjects] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    async function load() {
      try {
        // Fetch the HOD's own profile to get hodCourseId
        const meRes = await apiClient.get("/users/me");
        if (cancelled) return;
        const hodCourseId = meRes.data.hodCourseId;
        if (!hodCourseId) {
          setError("No department assigned to your account.");
          return;
        }
        const subjectsRes = await apiClient.get("/subjects", {
          params: { courseId: hodCourseId },
        });
        if (!cancelled) setSubjects(subjectsRes.data);
      } catch {
        if (!cancelled) setError("Could not load subjects.");
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const core = subjects?.filter((s) => s.type === "CORE") ?? [];
  const elective = subjects?.filter((s) => s.type === "ELECTIVE") ?? [];

  return (
    <div>
      <div className="mb-6 border-b border-brass/20 pb-4">
        <h1 className="font-display text-2xl font-semibold text-ink">
          Subjects
        </h1>
        <p className="mt-1 text-xs uppercase tracking-wide text-slate">
          Department subject catalogue
        </p>
      </div>

      {error && <p className="text-sm text-oxblood">{error}</p>}

      {!subjects && !error && (
        <p className="text-sm text-slate">Loading…</p>
      )}

      {subjects && (
        <div className="max-w-2xl">
          <SectionHeader title="Core" />
          <SubjectTable
            subjects={core}
            emptyMessage="No core subjects found for this department."
          />

          <SectionHeader title="Elective" />
          <SubjectTable
            subjects={elective}
            emptyMessage="No elective subjects found for this department."
          />
        </div>
      )}
    </div>
  );
}
