import { useState } from "react";
import apiClient from "../../api/client";

const inputClass =
  "border-0 border-b border-brass/40 bg-transparent px-0 py-2 text-sm text-ink outline-none focus:border-oxblood";

export default function StudentLookup() {
  const [email, setEmail] = useState("");
  const [student, setStudent] = useState(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setSearching(true);
    setError(null);
    setStudent(null);
    try {
      const { data } = await apiClient.get("/students/by-email", { params: { email } });
      setStudent(data);
    } catch (err) {
      setError(err.response?.status === 404 ? "No student found with that email." : "Could not run the search.");
    } finally {
      setSearching(false);
    }
  }

  return (
    <div>
      <div className="mb-6 border-b border-brass/20 pb-4">
        <h1 className="font-display text-2xl font-semibold text-ink">Student Lookup</h1>
      </div>

      <form onSubmit={handleSubmit} className="mb-8 flex max-w-md items-end gap-4">
        <label className="flex flex-1 flex-col gap-1.5">
          <span className="text-xs font-medium uppercase tracking-wide text-slate">Student email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="student@example.com"
            className={inputClass}
          />
        </label>
        <button
          type="submit"
          disabled={searching}
          className="w-fit rounded bg-oxblood px-5 py-2.5 text-sm font-medium text-paper transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {searching ? "Searching…" : "Search"}
        </button>
      </form>

      {error && <p className="text-sm text-oxblood">{error}</p>}

      {student && (
        <div className="max-w-xl">
          <div className="border-b border-brass/20 py-3">
            <span className="text-sm text-ink">
              {student.firstName} {student.lastName}
            </span>
            <span className="ml-4 font-mono text-sm text-slate">{student.email}</span>
          </div>
          <div className="flex items-center justify-between border-b border-brass/20 py-3">
            <span className="text-xs font-medium uppercase tracking-wide text-slate">Course</span>
            <span className="text-sm text-ink">{student.courseName}</span>
          </div>
          <div className="flex items-center justify-between border-b border-brass/20 py-3">
            <span className="text-xs font-medium uppercase tracking-wide text-slate">Section</span>
            <span className="text-sm text-ink">{student.sectionName}</span>
          </div>
          <div className="flex items-center justify-between border-b border-brass/20 py-3">
            <span className="text-xs font-medium uppercase tracking-wide text-slate">Semester</span>
            <span className="text-sm text-ink">{student.semesterLabel}</span>
          </div>
        </div>
      )}
    </div>
  );
}
