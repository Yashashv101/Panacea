import { useEffect, useMemo, useState } from "react";
import apiClient from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import MetricCard from "../../components/MetricCard";
import Card from "../../components/Card";
import { tableWrapClass, theadRowClass, thClass, tdClass, trClass } from "../admin/academic/formStyles";
import { Users, BookOpen } from "lucide-react";

function FacultyTable({ staff, subjectsByStaff }) {
  return (
    <div className={tableWrapClass}>
      <table className="w-full text-left text-sm">
        <thead>
          <tr className={theadRowClass}>
            <th className={thClass}>Name</th>
            <th className={thClass}>Email</th>
            <th className={thClass}>Subjects</th>
          </tr>
        </thead>
        <tbody>
          {staff.map((member) => {
            const subjects = subjectsByStaff[member.id] ?? [];
            return (
              <tr key={member.id} className={trClass}>
                <td className={`${tdClass} font-medium`}>
                  {member.firstName} {member.lastName}
                </td>
                <td className={`${tdClass} font-mono text-xs text-ink-secondary`}>{member.email}</td>
                <td className={tdClass}>
                  {subjects.length === 0 ? (
                    <span className="text-ink-muted">—</span>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {subjects.map((s) => (
                        <span
                          key={s.id}
                          className="rounded-md border border-border bg-surface-alt px-2 py-0.5 text-xs text-ink-secondary"
                        >
                          {s.name}
                          {s.type === "ELECTIVE" && <span className="ml-1 font-mono text-accent">E</span>}
                        </span>
                      ))}
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function HodFaculty() {
  const { userId } = useAuth();
  const [staff, setStaff] = useState(null);
  const [subjectsByStaff, setSubjectsByStaff] = useState({});
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    async function load() {
      try {
        // Fetch HOD's own profile to get hodCourseId
        const meRes = await apiClient.get("/users/me");
        if (cancelled) return;
        const hodCourseId = meRes.data.hodCourseId;
        if (!hodCourseId) {
          setError("No department assigned to your account.");
          return;
        }

        // Fetch dept staff (already HOD-scoped by backend) and dept subjects in parallel
        const [staffRes, subjectsRes] = await Promise.all([
          apiClient.get("/users", { params: { role: "STAFF" } }),
          apiClient.get("/subjects", { params: { courseId: hodCourseId } }),
        ]);
        if (cancelled) return;

        // Group subjects by primaryStaffId for O(1) lookup per staff row
        const grouped = {};
        for (const subject of subjectsRes.data) {
          if (subject.primaryStaffId != null) {
            if (!grouped[subject.primaryStaffId]) {
              grouped[subject.primaryStaffId] = [];
            }
            grouped[subject.primaryStaffId].push(subject);
          }
        }

        setStaff(staffRes.data);
        setSubjectsByStaff(grouped);
      } catch {
        if (!cancelled) setError("Could not load faculty.");
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const staffWithSubjects = useMemo(
    () => (staff ?? []).filter((member) => (subjectsByStaff[member.id] ?? []).length > 0).length,
    [staff, subjectsByStaff]
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-semibold text-ink">Faculty</h1>
        <p className="mt-1 text-sm text-ink-secondary">Department staff and their subject assignments</p>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      {!staff && !error && <p className="text-sm text-ink-secondary">Loading…</p>}

      {staff && staff.length === 0 && <p className="text-sm text-ink-secondary">No staff found in your department.</p>}

      {staff && staff.length > 0 && (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <MetricCard label="Faculty" value={staff.length} icon={Users} />
            <MetricCard label="Teaching a Subject" value={staffWithSubjects} icon={BookOpen} />
          </div>

          <Card title="Faculty">
            <FacultyTable staff={staff} subjectsByStaff={subjectsByStaff} />
          </Card>
        </div>
      )}
    </div>
  );
}
