import { useRef, useState } from "react";
import apiClient from "../../../api/client";
import PdfViewer from "../../../components/PdfViewer";
import { extractErrorMessage, rowActionClass } from "./formStyles";

/**
 * Admin syllabus upload panel — lists all subjects with their upload status
 * (✓ / not yet), and lets admin upload/replace a PDF per subject, as well as preview directly.
 * Grouped by course for usability when many subjects exist institution-wide.
 */
export default function SyllabusSection({ subjects, courses, setSubjects }) {
  const [uploading, setUploading] = useState({}); // subjectId → bool
  const [messages, setMessages] = useState({}); // subjectId → {tone, text}
  const [previewSubjectId, setPreviewSubjectId] = useState(null); // subjectId | null
  const fileRefs = useRef({});

  function courseNameFor(courseIds) {
    if (!courseIds || courseIds.length === 0) return "No course";
    return courses
      .filter((c) => courseIds.includes(c.id))
      .map((c) => c.name)
      .join(", ");
  }

  // Group subjects by first course (or "Unassigned") for display
  const grouped = {};
  for (const subject of subjects) {
    const label =
      subject.courseIds && subject.courseIds.length > 0
        ? courseNameFor(subject.courseIds)
        : "Unassigned";
    if (!grouped[label]) grouped[label] = [];
    grouped[label].push(subject);
  }

  async function handleUpload(subjectId) {
    const input = fileRefs.current[subjectId];
    if (!input || !input.files[0]) {
      setMessages((prev) => ({
        ...prev,
        [subjectId]: { tone: "error", text: "Select a PDF file first." },
      }));
      return;
    }
    const file = input.files[0];
    if (file.type !== "application/pdf") {
      setMessages((prev) => ({
        ...prev,
        [subjectId]: { tone: "error", text: "Only PDF files are accepted." },
      }));
      return;
    }

    setUploading((prev) => ({ ...prev, [subjectId]: true }));
    setMessages((prev) => ({ ...prev, [subjectId]: null }));

    const formData = new FormData();
    formData.append("file", file);

    try {
      await apiClient.post(`/subjects/${subjectId}/syllabus`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      // Mark syllabusUploaded on the local subject list without a full reload
      setSubjects((prev) =>
        prev.map((s) =>
          s.id === subjectId ? { ...s, syllabusUploaded: true } : s
        )
      );
      setMessages((prev) => ({
        ...prev,
        [subjectId]: { tone: "success", text: "Syllabus uploaded." },
      }));
      input.value = "";
    } catch (err) {
      setMessages((prev) => ({
        ...prev,
        [subjectId]: {
          tone: "error",
          text: extractErrorMessage(err, "Failed to upload syllabus."),
        },
      }));
    } finally {
      setUploading((prev) => ({ ...prev, [subjectId]: false }));
    }
  }

  function togglePreview(subjectId) {
    setPreviewSubjectId((prev) => (prev === subjectId ? null : subjectId));
  }

  return (
    <section>
      <div className="mb-4 border-b border-brass/40 pb-1">
        <h3 className="font-display text-sm uppercase tracking-widest text-brass">
          Syllabus Management
        </h3>
      </div>
      <p className="mb-6 text-xs text-slate">
        Upload or replace a PDF syllabus per subject. Only PDF files, max 10 MB.
      </p>

      {Object.entries(grouped).map(([groupLabel, groupSubjects]) => (
        <div key={groupLabel} className="mb-6">
          <div className="mb-2 border-b border-brass/20 pb-1">
            <span className="font-display text-xs font-semibold text-ink">
              {groupLabel}
            </span>
          </div>
          <div className="flex flex-col">
            {groupSubjects.map((subject) => {
              const msg = messages[subject.id];
              const isPreviewing = previewSubjectId === subject.id;

              return (
                <div
                  key={subject.id}
                  className="border-b border-brass/10 py-3"
                >
                  <div className="flex items-center justify-between gap-4">
                    {/* Subject name + upload status */}
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-sm text-ink truncate">
                        {subject.name}
                      </span>
                      <span
                        className={`shrink-0 font-mono text-xs ${
                          subject.syllabusUploaded
                            ? "text-slate"
                            : "text-brass/70"
                        }`}
                      >
                        {subject.syllabusUploaded ? "uploaded" : "not yet"}
                      </span>
                      {subject.syllabusUploaded && (
                        <button
                          type="button"
                          onClick={() => togglePreview(subject.id)}
                          className="text-xs text-oxblood hover:underline uppercase font-medium tracking-wide"
                        >
                          {isPreviewing ? "Hide PDF" : "View PDF"}
                        </button>
                      )}
                    </div>

                    {/* File picker + upload button */}
                    <div className="flex items-center gap-3 shrink-0">
                      <input
                        type="file"
                        accept="application/pdf"
                        ref={(el) => {
                          if (el) fileRefs.current[subject.id] = el;
                        }}
                        className="text-xs text-slate file:mr-2 file:border-0 file:bg-transparent file:text-xs file:font-medium file:text-slate file:uppercase file:tracking-wide file:cursor-pointer"
                      />
                      <button
                        type="button"
                        disabled={uploading[subject.id]}
                        onClick={() => handleUpload(subject.id)}
                        className={rowActionClass}
                      >
                        {uploading[subject.id]
                          ? "Uploading…"
                          : subject.syllabusUploaded
                          ? "Replace"
                          : "Upload"}
                      </button>
                    </div>
                  </div>

                  {msg && (
                    <p
                      className={`mt-1 text-xs ${
                        msg.tone === "success" ? "text-slate" : "text-oxblood"
                      }`}
                    >
                      {msg.text}
                    </p>
                  )}

                  {/* In-page PDF preview */}
                  {isPreviewing && (
                    <div className="mt-3 pt-3 border-t border-brass/10">
                      <PdfViewer
                        url={`/subjects/${subject.id}/syllabus`}
                        title={`${subject.name} Syllabus`}
                        height="500px"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </section>
  );
}
