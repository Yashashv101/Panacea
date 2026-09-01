import { useEffect, useRef, useState } from "react";
import apiClient from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import PdfViewer from "../../components/PdfViewer";
import Card from "../../components/Card";
import StatusBadge from "../../components/StatusBadge";
import { inputClass, labelClass, primaryButtonClass, rowActionClass, dangerActionClass } from "../admin/academic/formStyles";

const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const TABS = [
  { id: "syllabus", label: "Syllabus" },
  { id: "study-materials", label: "Study Materials" },
  { id: "previous-year-papers", label: "Previous Year Papers" },
  { id: "class-notes", label: "Class Notes" },
];

function ResourceUploadSection({ subject, title, endpoint }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState(null);
  const [activePdfId, setActivePdfId] = useState(null);

  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const fileInputRef = useRef(null);

  async function loadItems() {
    try {
      const { data } = await apiClient.get(`/subjects/${subject.id}/${endpoint}`);
      setItems(data);
    } catch {
      setMessage({ tone: "error", text: `Could not load ${title.toLowerCase()}.` });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subject.id, endpoint]);

  async function handleUpload(e) {
    e.preventDefault();
    const file = fileInputRef.current?.files?.[0];
    if (!formTitle.trim()) {
      setMessage({ tone: "error", text: "Title is required." });
      return;
    }
    if (!file) {
      setMessage({ tone: "error", text: "Please select a PDF file." });
      return;
    }
    if (file.type !== "application/pdf") {
      setMessage({ tone: "error", text: "Only PDF files are accepted." });
      return;
    }

    setUploading(true);
    setMessage(null);

    const formData = new FormData();
    formData.append("title", formTitle.trim());
    if (formDesc.trim()) formData.append("description", formDesc.trim());
    formData.append("file", file);

    try {
      await apiClient.post(`/subjects/${subject.id}/${endpoint}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setMessage({ tone: "success", text: `${title} uploaded successfully.` });
      setFormTitle("");
      setFormDesc("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      loadItems();
    } catch (err) {
      setMessage({
        tone: "error",
        text: err.response?.data?.message || `Failed to upload ${title.toLowerCase()}.`,
      });
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Are you sure you want to delete this document?")) return;
    try {
      await apiClient.delete(`/${endpoint}/${id}`);
      setItems((prev) => prev.filter((item) => item.id !== id));
      if (activePdfId === id) setActivePdfId(null);
    } catch {
      alert("Failed to delete document.");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Card title={`Upload new ${title.toLowerCase()}`}>
        <form onSubmit={handleUpload} className="flex max-w-xl flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>Document Title *</span>
            <input
              type="text"
              required
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="e.g. Unit 1 Lecture Notes / 2025 Midterm Paper"
              className={inputClass}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>Description (Optional)</span>
            <textarea
              rows={2}
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
              placeholder="Brief summary or context..."
              className={inputClass}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>PDF Document *</span>
            <input
              type="file"
              accept="application/pdf"
              ref={fileInputRef}
              required
              className="rounded border border-border bg-surface p-1.5 text-xs text-ink-secondary file:mr-3 file:cursor-pointer file:rounded file:border-0 file:bg-surface-alt file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-ink-secondary"
            />
          </label>

          <button type="submit" disabled={uploading} className={`${primaryButtonClass} mt-1`}>
            {uploading ? "Uploading…" : `Upload ${title}`}
          </button>

          {message && (
            <p className={`text-xs ${message.tone === "success" ? "text-ink-secondary" : "text-danger"}`}>
              {message.text}
            </p>
          )}
        </form>
      </Card>

      <Card
        title={`Uploaded ${title}`}
        action={<span className="font-mono text-xs text-ink-muted">{items.length}</span>}
      >
        {loading ? (
          <p className="py-3 text-sm text-ink-secondary">Loading…</p>
        ) : items.length === 0 ? (
          <p className="py-3 text-sm text-ink-secondary">No documents uploaded yet for this subject.</p>
        ) : (
          <div className="flex flex-col divide-y divide-border">
            {items.map((item) => {
              const isViewing = activePdfId === item.id;
              return (
                <div key={item.id} className="py-3.5 first:pt-0 last:pb-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 flex-col gap-1">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-ink">{item.title}</span>
                        <span className="font-mono text-xs text-ink-muted">
                          {dateFormatter.format(new Date(item.createdAt))}
                        </span>
                      </div>
                      {item.description && (
                        <p className="whitespace-pre-wrap text-xs text-ink-secondary">{item.description}</p>
                      )}
                      <span className="text-[11px] text-ink-muted">Uploaded by {item.uploadedByName}</span>
                    </div>

                    <div className="flex shrink-0 items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setActivePdfId((prev) => (prev === item.id ? null : item.id))}
                        className={rowActionClass}
                      >
                        {isViewing ? "Hide" : "View"}
                      </button>
                      <button type="button" onClick={() => handleDelete(item.id)} className={dangerActionClass}>
                        Delete
                      </button>
                    </div>
                  </div>

                  {isViewing && (
                    <div className="mt-3 border-t border-border pt-3">
                      <PdfViewer
                        url={`/${endpoint}/${item.id}/file`}
                        title={`${item.title} - ${subject.name}`}
                        height="calc(100vh - 220px)"
                        minHeight="750px"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

function StaffSyllabusSection({ subject, onSyllabusUpdated }) {
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const fileInputRef = useRef(null);

  async function handleUpload(e) {
    e.preventDefault();
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setMessage({ tone: "error", text: "Select a PDF file first." });
      return;
    }
    if (file.type !== "application/pdf") {
      setMessage({ tone: "error", text: "Only PDF files are accepted." });
      return;
    }

    setUploading(true);
    setMessage(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      await apiClient.post(`/subjects/${subject.id}/syllabus`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setMessage({ tone: "success", text: "Syllabus uploaded successfully." });
      if (fileInputRef.current) fileInputRef.current.value = "";
      onSyllabusUpdated();
    } catch (err) {
      setMessage({
        tone: "error",
        text: err.response?.data?.message || "Failed to upload syllabus.",
      });
    } finally {
      setUploading(false);
    }
  }

  return (
    <Card title="Official course syllabus" className="max-w-2xl">
      <form onSubmit={handleUpload} className="flex flex-col gap-4">
        <div className="flex items-center justify-between rounded-md bg-surface-alt px-3 py-2.5">
          <span className="text-sm text-ink">Status</span>
          <StatusBadge
            status={subject.syllabusUploaded ? "UPLOADED" : "PENDING"}
            variant={subject.syllabusUploaded ? "positive" : "pending"}
          />
        </div>

        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>
            {subject.syllabusUploaded ? "Replace Syllabus (PDF)" : "Upload Syllabus (PDF)"}
          </span>
          <input
            type="file"
            accept="application/pdf"
            ref={fileInputRef}
            required
            className="rounded border border-border bg-surface p-1.5 text-xs text-ink-secondary file:mr-3 file:cursor-pointer file:rounded file:border-0 file:bg-surface-alt file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-ink-secondary"
          />
        </label>

        <div className="flex items-center gap-4">
          <button type="submit" disabled={uploading} className={primaryButtonClass}>
            {uploading ? "Uploading…" : subject.syllabusUploaded ? "Replace Syllabus" : "Upload Syllabus"}
          </button>
          {subject.syllabusUploaded && (
            <button type="button" onClick={() => setShowPreview((prev) => !prev)} className={rowActionClass}>
              {showPreview ? "Hide Preview" : "View Current Syllabus"}
            </button>
          )}
        </div>

        {message && (
          <p className={`text-xs ${message.tone === "success" ? "text-ink-secondary" : "text-danger"}`}>
            {message.text}
          </p>
        )}
      </form>

      {showPreview && subject.syllabusUploaded && (
        <div className="mt-4 border-t border-border pt-4">
          <PdfViewer
            url={`/subjects/${subject.id}/syllabus`}
            title={`${subject.name} Syllabus`}
            height="calc(100vh - 220px)"
            minHeight="750px"
          />
        </div>
      )}
    </Card>
  );
}

export default function CourseMaterials() {
  const { user } = useAuth();
  const [subjects, setSubjects] = useState([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState(null);
  const [activeTab, setActiveTab] = useState("syllabus");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    apiClient
      .get("/subjects")
      .then((res) => {
        if (!cancelled) {
          // If staff, highlight/filter subjects where they are primary staff
          const list = res.data;
          const taught = list.filter((s) => s.primaryStaffId === user?.id);
          const available = taught.length > 0 ? taught : list;
          setSubjects(available);
          if (available.length > 0) {
            setSelectedSubjectId(available[0].id);
          }
        }
      })
      .catch(() => {
        if (!cancelled) setError("Could not load subjects.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const selectedSubject = subjects.find((s) => s.id === selectedSubjectId);

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-semibold text-ink">Course Materials</h1>
        <p className="mt-1 text-sm text-ink-secondary">
          Upload and manage syllabus, study materials, previous year papers, and class notes.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-ink-secondary">Loading subjects…</p>
      ) : error ? (
        <p className="text-sm text-danger">{error}</p>
      ) : subjects.length === 0 ? (
        <p className="text-sm text-ink-secondary">No assigned subjects found.</p>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="flex max-w-md flex-col gap-1.5">
            <span className={labelClass}>Select Subject</span>
            <select
              value={selectedSubjectId || ""}
              onChange={(e) => setSelectedSubjectId(Number(e.target.value))}
              className={inputClass}
            >
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.type})
                </option>
              ))}
            </select>
          </div>

          {selectedSubject && (
            <div>
              <nav className="mb-6 flex flex-wrap items-center gap-x-8 gap-y-2 border-b border-border">
                {TABS.map((t) => {
                  const isActive = activeTab === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setActiveTab(t.id)}
                      className={`relative pb-3 text-sm font-medium transition-colors duration-150 ease-out ${
                        isActive ? "text-accent" : "text-ink-secondary hover:text-ink"
                      }`}
                    >
                      {t.label}
                      {isActive && <span className="absolute inset-x-0 -bottom-px h-0.5 bg-accent" />}
                    </button>
                  );
                })}
              </nav>

              {activeTab === "syllabus" && (
                <StaffSyllabusSection
                  subject={selectedSubject}
                  onSyllabusUpdated={() => {
                    setSubjects((prev) =>
                      prev.map((s) => (s.id === selectedSubject.id ? { ...s, syllabusUploaded: true } : s))
                    );
                  }}
                />
              )}

              {activeTab === "study-materials" && (
                <ResourceUploadSection subject={selectedSubject} title="Study Material" endpoint="study-materials" />
              )}

              {activeTab === "previous-year-papers" && (
                <ResourceUploadSection
                  subject={selectedSubject}
                  title="Previous Year Paper"
                  endpoint="previous-year-papers"
                />
              )}

              {activeTab === "class-notes" && (
                <ResourceUploadSection subject={selectedSubject} title="Class Notes" endpoint="class-notes" />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
