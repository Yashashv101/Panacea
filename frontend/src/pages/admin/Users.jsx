import { useEffect, useState } from "react";
import apiClient from "../../api/client";
import { inputClass, labelClass, extractErrorMessage } from "./academic/formStyles";

const ROLES = ["ADMIN", "HOD", "STAFF", "STUDENT"];

const EMPTY_FORM = { email: "", firstName: "", lastName: "", password: "", role: "STUDENT", courseId: "" };

export default function Users() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [users, setUsers] = useState([]);
  const [courses, setCourses] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    apiClient.get("/courses").then(({ data }) => setCourses(data));
  }, []);

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage(null);
    setSubmitting(true);
    try {
      const payload = { ...form, courseId: form.role === "HOD" ? Number(form.courseId) : null };
      const { data } = await apiClient.post("/users", payload);
      setUsers((prev) => [data, ...prev]);
      setForm(EMPTY_FORM);
      setMessage({ tone: "success", text: "User created." });
    } catch (err) {
      setMessage({ tone: "error", text: extractErrorMessage(err, "Something went wrong creating the user.") });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div className="mb-6 border-b border-brass/20 pb-4">
        <h1 className="font-display text-2xl font-semibold text-ink">User Management</h1>
      </div>

      <section className="mb-8 border-b border-brass/20 pb-8">
        <h2 className="mb-4 font-display text-lg font-semibold text-ink">Create user</h2>

        <form onSubmit={handleSubmit} className="flex max-w-xl flex-col gap-5">
          <div className="grid grid-cols-2 gap-5">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium uppercase tracking-wide text-slate">First name</span>
              <input
                type="text"
                required
                value={form.firstName}
                onChange={(e) => updateField("firstName", e.target.value)}
                className="border-0 border-b border-brass/40 bg-transparent px-0 py-2 text-sm text-ink outline-none focus:border-oxblood"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium uppercase tracking-wide text-slate">Last name</span>
              <input
                type="text"
                required
                value={form.lastName}
                onChange={(e) => updateField("lastName", e.target.value)}
                className="border-0 border-b border-brass/40 bg-transparent px-0 py-2 text-sm text-ink outline-none focus:border-oxblood"
              />
            </label>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-slate">Email</span>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => updateField("email", e.target.value)}
              className="border-0 border-b border-brass/40 bg-transparent px-0 py-2 text-sm text-ink outline-none focus:border-oxblood"
              autoComplete="off"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-slate">Password</span>
            <input
              type="password"
              required
              minLength={8}
              value={form.password}
              onChange={(e) => updateField("password", e.target.value)}
              className="border-0 border-b border-brass/40 bg-transparent px-0 py-2 text-sm text-ink outline-none focus:border-oxblood"
              autoComplete="new-password"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-slate">Role</span>
            <select
              value={form.role}
              onChange={(e) => updateField("role", e.target.value)}
              className="border-0 border-b border-brass/40 bg-transparent px-0 py-2 text-sm text-ink outline-none focus:border-oxblood"
            >
              {ROLES.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </label>

          {form.role === "HOD" && (
            <label className="flex flex-col gap-1.5">
              <span className={labelClass}>Course (department)</span>
              <select
                required
                value={form.courseId}
                onChange={(e) => updateField("courseId", e.target.value)}
                className={inputClass}
              >
                <option value="" disabled>
                  Select a course
                </option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          {message && (
            <p className={`text-sm ${message.tone === "success" ? "text-slate" : "text-oxblood"}`}>
              {message.text}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="mt-1 w-fit rounded bg-oxblood px-5 py-2.5 text-sm font-medium text-paper transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? "Creating…" : "Create user"}
          </button>
        </form>
      </section>

      <section>
        <h2 className="mb-1 font-display text-lg font-semibold text-ink">Users</h2>
        <p className="mb-4 text-xs text-slate">
          Showing users created this session — no listing endpoint is available yet to load existing users.
        </p>

        {users.length === 0 ? (
          <p className="border-b border-brass/20 py-4 text-sm text-slate">No users yet.</p>
        ) : (
          <div className="flex flex-col">
            {users.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between border-b border-brass/20 py-3"
              >
                <div className="flex items-center gap-4">
                  <span className="text-sm text-ink">
                    {user.firstName} {user.lastName}
                  </span>
                  <span className="font-mono text-sm text-slate">{user.email}</span>
                </div>
                <span className="text-sm text-slate">{user.role}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
