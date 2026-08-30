import { Link, useParams } from "react-router-dom";

/**
 * HOD subject detail — stub. Real content (syllabus, staff info, attendance
 * stats, etc.) is planned for a future session.
 */
export default function HodSubjectDetail() {
  const { subjectId } = useParams();

  return (
    <div>
      <div className="mb-6 border-b border-brass/20 pb-4">
        <Link
          to="/hod/subjects"
          className="mb-2 block text-xs uppercase tracking-wide text-slate hover:text-oxblood"
        >
          ← Subjects
        </Link>
        <h1 className="font-display text-2xl font-semibold text-ink">
          Subject #{subjectId}
        </h1>
      </div>

      <p className="text-sm text-slate">
        Detailed subject view coming in the next session.
      </p>
    </div>
  );
}
