import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import apiClient from "../../api/client";
import PdfViewer from "../../components/PdfViewer";

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
      <div className="mb-6 border-b border-brass/20 pb-4">
        <Link
          to="/hod/subjects"
          className="mb-2 block text-xs uppercase tracking-wide text-slate hover:text-oxblood"
        >
          ← Subjects
        </Link>
        <h1 className="font-display text-2xl font-semibold text-ink">
          {subject ? subject.name : "Loading…"}
        </h1>
      </div>

      {error && <p className="text-sm text-oxblood">{error}</p>}

      {subject && (
        <div className="flex flex-col gap-8 max-w-4xl">
          {/* Metadata Section */}
          <div className="max-w-xl flex flex-col">
            <div className="flex items-center justify-between border-b border-brass/20 py-3">
              <span className="text-sm text-ink">Credits</span>
              <span className="font-mono text-sm text-ink">{subject.credits}</span>
            </div>
            <div className="flex items-center justify-between border-b border-brass/20 py-3">
              <span className="text-sm text-ink">Type</span>
              <span className="font-mono text-sm text-slate">{subject.type}</span>
            </div>
            <div className="flex items-center justify-between border-b border-brass/20 py-3">
              <span className="text-sm text-ink">Primary Staff</span>
              <span className="text-sm text-slate">
                {subject.primaryStaffName ?? "—"}
              </span>
            </div>
            <div className="flex items-center justify-between border-b border-brass/20 py-3">
              <span className="text-sm text-ink">Syllabus Status</span>
              <span className="font-mono text-xs text-slate">
                {subject.syllabusUploaded ? "Uploaded" : "Not yet uploaded"}
              </span>
            </div>
          </div>

          {/* Embedded Syllabus PDF Viewer */}
          <div className="flex flex-col gap-3">
            <div className="border-b border-brass/40 pb-1">
              <span className="font-display text-xs uppercase tracking-widest text-brass">
                Course Syllabus
              </span>
            </div>

            {subject.syllabusUploaded ? (
              <PdfViewer
                url={`/subjects/${subjectId}/syllabus`}
                title={`${subject.name} Syllabus`}
                height="calc(100vh - 220px)"
                minHeight="800px"
              />
            ) : (
              <p className="py-4 text-sm text-slate">
                No syllabus PDF has been uploaded for this subject yet.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
