import { useEffect, useState } from "react";
import apiClient from "../../api/client";
import { useAuth } from "../../context/AuthContext";

function StaffRow({ member, subjectsByStaff }) {
  const subjects = subjectsByStaff[member.id] ?? [];
  return (
    <div className="border-b border-brass/10 py-4">
      <div className="flex items-start justify-between">
        <div>
          <span className="text-sm font-medium text-ink">
            {member.firstName} {member.lastName}
          </span>
          <span className="ml-3 text-xs text-slate">{member.email}</span>
        </div>
        <span className="font-mono text-xs text-slate">
          {subjects.length === 0
            ? "—"
            : subjects.length === 1
            ? "1 subject"
            : `${subjects.length} subjects`}
        </span>
      </div>
      {subjects.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {subjects.map((s) => (
            <span
              key={s.id}
              className="border border-brass/30 px-2 py-0.5 text-xs text-slate"
              style={{ borderRadius: "3px" }}
            >
              {s.name}
              {s.type === "ELECTIVE" && (
                <span className="ml-1 font-mono text-brass">E</span>
              )}
            </span>
          ))}
        </div>
      )}
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

  return (
    <div>
      <div className="mb-6 border-b border-brass/20 pb-4">
        <h1 className="font-display text-2xl font-semibold text-ink">
          Faculty
        </h1>
        <p className="mt-1 text-xs uppercase tracking-wide text-slate">
          Department staff and their subject assignments
        </p>
      </div>

      {error && <p className="text-sm text-oxblood">{error}</p>}

      {!staff && !error && (
        <p className="text-sm text-slate">Loading…</p>
      )}

      {staff && staff.length === 0 && (
        <p className="text-sm text-slate">No staff found in your department.</p>
      )}

      {staff && staff.length > 0 && (
        <div className="max-w-2xl flex flex-col">
          {staff.map((member) => (
            <StaffRow
              key={member.id}
              member={member}
              subjectsByStaff={subjectsByStaff}
            />
          ))}
        </div>
      )}
    </div>
  );
}
