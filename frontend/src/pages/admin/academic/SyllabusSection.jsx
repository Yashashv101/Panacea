import { Fragment, useRef, useState } from "react";
import apiClient from "../../../api/client";
import PdfViewer from "../../../components/PdfViewer";
import StatusBadge from "../../../components/StatusBadge";
import Card from "../../../components/Card";
import {
  extractErrorMessage,
  rowActionClass,
  tableWrapClass,
  theadRowClass,
  thClass,
  tdClass,
  trClass,
  folioClass,
} from "./formStyles";

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
    <div className="flex flex-col gap-6">
      <p className="text-sm text-ink-secondary">
        Upload or replace a PDF syllabus per subject. Only PDF files, max 10 MB.
      </p>

      {Object.entries(grouped).map(([groupLabel, groupSubjects]) => (
        <Card
          key={groupLabel}
          title={groupLabel}
          action={
            <span className="font-mono text-xs text-ink-muted">
              {groupSubjects.filter((s) => s.syllabusUploaded).length} / {groupSubjects.length} uploaded
            </span>
          }
        >
          <div className={tableWrapClass}>
            <table className="w-full text-left text-sm">
              <thead>
                <tr className={theadRowClass}>
                  <th className={thClass}>#</th>
                  <th className={thClass}>Subject</th>
                  <th className={thClass}>Status</th>
                  <th className={`${thClass} text-right`}>Upload</th>
                </tr>
              </thead>
              <tbody>
                {groupSubjects.map((subject, i) => {
                  const msg = messages[subject.id];
                  const isPreviewing = previewSubjectId === subject.id;

                  return (
                    <Fragment key={subject.id}>
                      <tr className={trClass}>
                        <td className={tdClass}>
                          <span className={folioClass}>{String(i + 1).padStart(2, "0")}</span>
                        </td>
                        <td className={`${tdClass} font-medium`}>
                          <div className="flex items-center gap-3">
                            <span className="truncate">{subject.name}</span>
                            {subject.syllabusUploaded && (
                              <button
                                type="button"
                                onClick={() => togglePreview(subject.id)}
                                className={rowActionClass}
                              >
                                {isPreviewing ? "Hide PDF" : "View PDF"}
                              </button>
                            )}
                          </div>
                        </td>
                        <td className={tdClass}>
                          <StatusBadge
                            status={subject.syllabusUploaded ? "UPLOADED" : "PENDING"}
                            variant={subject.syllabusUploaded ? "positive" : "pending"}
                          />
                        </td>
                        <td className={`${tdClass} text-right`}>
                          <div className="flex items-center justify-end gap-3">
                            <input
                              type="file"
                              accept="application/pdf"
                              ref={(el) => {
                                if (el) fileRefs.current[subject.id] = el;
                              }}
                              className="text-xs text-ink-secondary file:mr-2 file:cursor-pointer file:rounded file:border-0 file:bg-surface-alt file:px-2 file:py-1 file:text-xs file:font-medium file:text-ink-secondary"
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
                        </td>
                      </tr>
                      {(msg || isPreviewing) && (
                        <tr className={trClass}>
                          <td colSpan={4} className="bg-surface-alt/60 px-4 py-3">
                            {msg && (
                              <p className={`text-xs ${msg.tone === "success" ? "text-ink-secondary" : "text-danger"}`}>
                                {msg.text}
                              </p>
                            )}
                            {isPreviewing && (
                              <div className={msg ? "mt-3" : ""}>
                                <PdfViewer
                                  url={`/subjects/${subject.id}/syllabus`}
                                  title={`${subject.name} Syllabus`}
                                  height="500px"
                                />
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      ))}
    </div>
  );
}
