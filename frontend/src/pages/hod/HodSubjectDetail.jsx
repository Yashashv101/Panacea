import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import apiClient from "../../api/client";
import PdfViewer from "../../components/PdfViewer";
import Card from "../../components/Card";
import StatusBadge from "../../components/StatusBadge";

/**
 * HOD subject detail page.
 *
 * Shows the syllabus in an embedded PDF viewer directly in the page
 * (if uploaded) along with subject metadata.
 */
export default function HodSubjectDetail() {
  const { subjectId } = useParams();
  const [subject, setSubject] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    apiClient
      .get(`/subjects/${subjectId}`)
      .then((res) => {
        if (!cancelled) setSubject(res.data);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load subject.");
      });
    return () => {
      cancelled = true;
    };
  }, [subjectId]);

  return (
    <div>
      <div className="mb-6">
        <Link to="/hod/subjects" className="mb-2 block text-xs font-medium text-accent hover:underline">
          ← Subjects
        </Link>
        <h1 className="font-display text-2xl font-semibold text-ink">{subject ? subject.name : "Loading…"}</h1>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      {subject && (
        <div className="flex max-w-4xl flex-col gap-6">
          <Card title="Details">
            <div className="flex flex-col divide-y divide-border">
              <div className="flex items-center justify-between py-2.5 first:pt-0">
                <span className="text-sm text-ink-secondary">Credits</span>
                <span className="font-mono text-sm text-ink">{subject.credits}</span>
              </div>
              <div className="flex items-center justify-between py-2.5">
                <span className="text-sm text-ink-secondary">Type</span>
                <span className="font-mono text-sm text-ink">{subject.type}</span>
              </div>
              <div className="flex items-center justify-between py-2.5">
                <span className="text-sm text-ink-secondary">Primary Staff</span>
                <span className="text-sm text-ink">{subject.primaryStaffName ?? "—"}</span>
              </div>
              <div className="flex items-center justify-between py-2.5 last:pb-0">
                <span className="text-sm text-ink-secondary">Syllabus Status</span>
                <StatusBadge
                  status={subject.syllabusUploaded ? "UPLOADED" : "PENDING"}
                  variant={subject.syllabusUploaded ? "positive" : "pending"}
                />
              </div>
            </div>
          </Card>

          <Card title="Course Syllabus">
            {subject.syllabusUploaded ? (
              <PdfViewer
                url={`/subjects/${subjectId}/syllabus`}
                title={`${subject.name} Syllabus`}
                height="calc(100vh - 220px)"
                minHeight="800px"
              />
            ) : (
              <p className="text-sm text-ink-secondary">No syllabus PDF has been uploaded for this subject yet.</p>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
