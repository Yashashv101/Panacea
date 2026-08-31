import { useEffect, useRef, useState } from "react";
import apiClient from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import PdfViewer from "../../components/PdfViewer";

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

function ResourceUploadSection({ subject, type, title, endpoint, downloadPrefix }) {
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
    <div className="flex flex-col gap-8">
      {/* Upload Form */}
      <div className="max-w-xl">
        <div className="mb-3 border-b border-brass/40 pb-1">
          <span className="font-display text-xs uppercase tracking-widest text-brass">
            Upload New {title}
          </span>
        </div>

        <form onSubmit={handleUpload} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium uppercase tracking-wide text-slate">
              Document Title *
            </span>
            <input
              type="text"
              required
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="e.g. Unit 1 Lecture Notes / 2025 Midterm Paper"
              className="border border-brass/30 bg-transparent p-2.5 text-sm text-ink outline-none focus:border-oxblood rounded-[3px]"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium uppercase tracking-wide text-slate">
              Description (Optional)
            </span>
            <textarea
              rows={2}
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
              placeholder="Brief summary or context..."
              className="border border-brass/30 bg-transparent p-2.5 text-sm text-ink outline-none focus:border-oxblood rounded-[3px]"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium uppercase tracking-wide text-slate">
              PDF Document *
            </span>
            <input
              type="file"
              accept="application/pdf"
              ref={fileInputRef}
              required
              className="text-xs text-slate file:mr-3 file:border-0 file:bg-card file:py-1.5 file:px-3 file:text-xs file:font-medium file:text-ink file:uppercase file:tracking-wide file:cursor-pointer rounded-[3px] border border-brass/20 p-1.5"
            />
          </label>

          <button
            type="submit"
            disabled={uploading}
            className="w-fit rounded bg-oxblood px-4 py-2 text-xs font-medium uppercase tracking-wide text-paper transition-opacity hover:opacity-90 disabled:opacity-50 mt-1"
          >
            {uploading ? "Uploading…" : `Upload ${title}`}
          </button>

          {message && (
            <p className={`text-xs ${message.tone === "success" ? "text-slate" : "text-oxblood"}`}>
              {message.text}
            </p>
          )}
        </form>
      </div>

      {/* Uploaded Items List */}
      <div className="max-w-3xl">
        <div className="mb-2 border-b border-brass/40 pb-1 flex items-center justify-between">
          <span className="font-display text-xs uppercase tracking-widest text-brass">
            Uploaded {title} ({items.length})
          </span>
        </div>

        {loading ? (
          <p className="py-3 text-sm text-slate">Loading…</p>
        ) : items.length === 0 ? (
          <p className="py-3 text-sm text-slate">No documents uploaded yet for this subject.</p>
        ) : (
          <div className="flex flex-col">
            {items.map((item) => {
              const isViewing = activePdfId === item.id;
              return (
                <div key={item.id} className="border-b border-brass/10 py-3.5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex flex-col gap-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-ink">{item.title}</span>
                        <span className="font-mono text-xs text-slate">
                          {dateFormatter.format(new Date(item.createdAt))}
                        </span>
                      </div>
                      {item.description && (
                        <p className="text-xs text-slate whitespace-pre-wrap">{item.description}</p>
                      )}
                      <span className="text-[11px] text-slate">Uploaded by {item.uploadedByName}</span>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <button
                        type="button"
                        onClick={() => setActivePdfId((prev) => (prev === item.id ? null : item.id))}
                        className="text-xs uppercase font-medium tracking-wide text-oxblood hover:underline"
                      >
                        {isViewing ? "Hide" : "View"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(item.id)}
                        className="text-xs uppercase font-medium tracking-wide text-slate hover:text-oxblood"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {isViewing && (
                    <div className="mt-3 pt-3 border-t border-brass/10">
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
      </div>
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
    <div className="flex flex-col gap-6 max-w-4xl">
      <div className="max-w-xl">
        <div className="mb-3 border-b border-brass/40 pb-1">
          <span className="font-display text-xs uppercase tracking-widest text-brass">
            Official Course Syllabus
          </span>
        </div>

        <form onSubmit={handleUpload} className="flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-brass/20 py-2">
            <span className="text-sm text-ink">Status</span>
            <span className="font-mono text-xs text-slate">
              {subject.syllabusUploaded ? "Uploaded" : "Not yet uploaded"}
            </span>
          </div>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium uppercase tracking-wide text-slate">
              {subject.syllabusUploaded ? "Replace Syllabus (PDF)" : "Upload Syllabus (PDF)"}
            </span>
            <input
              type="file"
              accept="application/pdf"
              ref={fileInputRef}
              required
              className="text-xs text-slate file:mr-3 file:border-0 file:bg-card file:py-1.5 file:px-3 file:text-xs file:font-medium file:text-ink file:uppercase file:tracking-wide file:cursor-pointer rounded-[3px] border border-brass/20 p-1.5"
            />
          </label>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={uploading}
              className="rounded bg-oxblood px-4 py-2 text-xs font-medium uppercase tracking-wide text-paper transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {uploading ? "Uploading…" : subject.syllabusUploaded ? "Replace Syllabus" : "Upload Syllabus"}
            </button>
            {subject.syllabusUploaded && (
              <button
                type="button"
                onClick={() => setShowPreview((prev) => !prev)}
                className="text-xs font-medium uppercase tracking-wide text-oxblood hover:underline"
              >
                {showPreview ? "Hide Preview" : "View Current Syllabus"}
              </button>
            )}
          </div>

          {message && (
            <p className={`text-xs ${message.tone === "success" ? "text-slate" : "text-oxblood"}`}>
              {message.text}
            </p>
          )}
        </form>
      </div>

      {showPreview && subject.syllabusUploaded && (
        <div className="mt-4 pt-4 border-t border-brass/20">
          <PdfViewer
            url={`/subjects/${subject.id}/syllabus`}
            title={`${subject.name} Syllabus`}
            height="calc(100vh - 220px)"
            minHeight="750px"
          />
        </div>
      )}
    </div>
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
      <div className="mb-6 border-b border-brass/20 pb-4">
        <h1 className="font-display text-2xl font-semibold text-ink">Course Materials</h1>
        <p className="mt-1 text-xs uppercase tracking-wide text-slate">
          Upload and manage syllabus, study materials, previous year papers, and class notes
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-slate">Loading subjects…</p>
      ) : error ? (
        <p className="text-sm text-oxblood">{error}</p>
      ) : subjects.length === 0 ? (
        <p className="text-sm text-slate">No assigned subjects found.</p>
      ) : (
        <div className="flex flex-col gap-6">
          {/* Subject Selector */}
          <div className="max-w-md flex flex-col gap-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-slate">
              Select Subject
            </span>
            <select
              value={selectedSubjectId || ""}
              onChange={(e) => setSelectedSubjectId(Number(e.target.value))}
              className="border border-brass/30 bg-card p-2 text-sm text-ink outline-none focus:border-oxblood rounded-[3px]"
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
              {/* Tabs */}
              <div className="mb-6 flex border-b border-brass/20">
                {TABS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setActiveTab(t.id)}
                    className={`border-b-2 px-4 py-2.5 text-xs font-medium uppercase tracking-wide transition-colors ${
                      activeTab === t.id
                        ? "border-oxblood font-semibold text-oxblood"
                        : "border-transparent text-slate hover:text-ink"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Tab Contents */}
              {activeTab === "syllabus" && (
                <StaffSyllabusSection
                  subject={selectedSubject}
                  onSyllabusUpdated={() => {
                    setSubjects((prev) =>
                      prev.map((s) =>
                        s.id === selectedSubject.id ? { ...s, syllabusUploaded: true } : s
                      )
                    );
                  }}
                />
              )}

              {activeTab === "study-materials" && (
                <ResourceUploadSection
                  subject={selectedSubject}
                  type="study-material"
                  title="Study Material"
                  endpoint="study-materials"
                  downloadPrefix="/study-materials"
                />
              )}

              {activeTab === "previous-year-papers" && (
                <ResourceUploadSection
                  subject={selectedSubject}
                  type="pyq"
                  title="Previous Year Paper"
                  endpoint="previous-year-papers"
                  downloadPrefix="/previous-year-papers"
                />
              )}

              {activeTab === "class-notes" && (
                <ResourceUploadSection
                  subject={selectedSubject}
                  type="class-notes"
                  title="Class Notes"
                  endpoint="class-notes"
                  downloadPrefix="/class-notes"
                />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
