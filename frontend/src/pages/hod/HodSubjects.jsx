import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import apiClient from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import MetricCard from "../../components/MetricCard";
import Card from "../../components/Card";
import { tableWrapClass, theadRowClass, thClass, tdClass, trClass } from "../admin/academic/formStyles";
import { BookOpen, BookMarked, ListTree } from "lucide-react";

function SubjectTable({ subjects, emptyMessage }) {
  const navigate = useNavigate();

  if (subjects.length === 0) {
    return <p className="py-3 text-sm text-ink-secondary">{emptyMessage}</p>;
  }

  return (
    <div className={tableWrapClass}>
      <table className="w-full text-left text-sm">
        <thead>
          <tr className={theadRowClass}>
            <th className={thClass}>Subject</th>
            <th className={thClass}>Primary Staff</th>
            <th className={`${thClass} text-right`}>Credits</th>
          </tr>
        </thead>
        <tbody>
          {subjects.map((s) => (
            <tr
              key={s.id}
              onClick={() => navigate(`/hod/subjects/${s.id}`)}
              className={`${trClass} cursor-pointer`}
            >
              <td className={`${tdClass} font-medium`}>{s.name}</td>
              <td className={`${tdClass} text-ink-secondary`}>{s.primaryStaffName ?? "—"}</td>
              <td className={`${tdClass} text-right font-mono`}>{s.credits}</td>
            </tr>
          ))}
        </tbody>
      </table>
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
      <div className="mb-6">
        <h1 className="font-display text-2xl font-semibold text-ink">Subjects</h1>
        <p className="mt-1 text-sm text-ink-secondary">Department subject catalogue</p>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      {!subjects && !error && <p className="text-sm text-ink-secondary">Loading…</p>}

      {subjects && (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <MetricCard label="Total Subjects" value={subjects.length} icon={BookOpen} />
            <MetricCard label="Core" value={core.length} icon={BookMarked} />
            <MetricCard label="Elective" value={elective.length} icon={ListTree} />
          </div>

          <Card title="Core">
            <SubjectTable subjects={core} emptyMessage="No core subjects found for this department." />
          </Card>

          <Card title="Elective">
            <SubjectTable subjects={elective} emptyMessage="No elective subjects found for this department." />
          </Card>
        </div>
      )}
    </div>
  );
}
