import { useEffect, useState } from "react";
import apiClient from "../../api/client";
import { inputClass, labelClass, rowActionClass, extractErrorMessage } from "./academic/formStyles";
import StatusStamp from "../../components/StatusStamp";

const ROLES = ["ADMIN", "HOD", "STAFF", "STUDENT"];

const EMPTY_FORM = {
  email: "",
  firstName: "",
  lastName: "",
  password: "",
  role: "STUDENT",
  courseId: "",
  sectionId: "",
  semesterId: "",
};

export default function Users() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [users, setUsers] = useState([]);
  const [courses, setCourses] = useState([]);
  const [sections, setSections] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const [listMessage, setListMessage] = useState(null);
  const [confirmingLockId, setConfirmingLockId] = useState(null);
  const [resetPasswordId, setResetPasswordId] = useState(null);
  const [newPassword, setNewPassword] = useState("");

  useEffect(() => {
    apiClient.get("/courses").then(({ data }) => setCourses(data));
    apiClient.get("/sections").then(({ data }) => setSections(data));
    apiClient.get("/semesters").then(({ data }) => setSemesters(data));
    apiClient.get("/users").then(({ data }) => setUsers(data));
  }, []);

  const sectionsForSelectedCourse = sections.filter(
    (section) => String(section.courseId) === String(form.courseId)
  );

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function updateCourse(value) {
    // Changing course invalidates any previously chosen section (sections are
    // scoped to a course), same as SectionsSection.jsx's course/section coupling.
    setForm((prev) => ({ ...prev, courseId: value, sectionId: "" }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage(null);
    setSubmitting(true);
    try {
      const needsCourse = form.role === "HOD" || form.role === "STUDENT" || form.role === "STAFF";
      const needsSectionAndSemester = form.role === "STUDENT";
      const payload = {
        ...form,
        courseId: needsCourse ? Number(form.courseId) : null,
        sectionId: needsSectionAndSemester ? Number(form.sectionId) : null,
        semesterId: needsSectionAndSemester ? Number(form.semesterId) : null,
      };
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

  async function handleToggleEnabled(targetUser) {
    if (confirmingLockId !== targetUser.id) {
      setConfirmingLockId(targetUser.id);
      return;
    }
    setListMessage(null);
    setConfirmingLockId(null);
    try {
      const { data } = await apiClient.patch(`/users/${targetUser.id}/enabled`, {
        enabled: !targetUser.enabled,
      });
      setUsers((prev) => prev.map((u) => (u.id === data.id ? data : u)));
    } catch (err) {
      setListMessage({ tone: "error", text: extractErrorMessage(err, "Could not update the account's lock state.") });
    }
  }

  function startResetPassword(targetUser) {
    setResetPasswordId(targetUser.id);
    setNewPassword("");
    setConfirmingLockId(null);
  }

  function cancelResetPassword() {
    setResetPasswordId(null);
    setNewPassword("");
  }

  async function handleResetPassword(targetUserId) {
    setListMessage(null);
    try {
      await apiClient.patch(`/users/${targetUserId}/password`, { newPassword });
      setListMessage({ tone: "success", text: "Password reset." });
      cancelResetPassword();
    } catch (err) {
      setListMessage({ tone: "error", text: extractErrorMessage(err, "Could not reset the password.") });
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

          {(form.role === "HOD" || form.role === "STUDENT" || form.role === "STAFF") && (
            <label className="flex flex-col gap-1.5">
              <span className={labelClass}>
                {form.role === "HOD" || form.role === "STAFF" ? "Course (department)" : "Course"}
              </span>
              <select
                required
                value={form.courseId}
                onChange={(e) => updateCourse(e.target.value)}
                className={inputClass}
              >
                <option value="" disabled>
                  Select a course
                </option>
                {courses.filter((course) => course.active).map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          {form.role === "STUDENT" && (
            <div className="grid grid-cols-2 gap-5">
              <label className="flex flex-col gap-1.5">
                <span className={labelClass}>Section</span>
                <select
                  required
                  disabled={!form.courseId}
                  value={form.sectionId}
                  onChange={(e) => updateField("sectionId", e.target.value)}
                  className={inputClass}
                >
                  <option value="" disabled>
                    {form.courseId ? "Select a section" : "Select a course first"}
                  </option>
                  {sectionsForSelectedCourse.map((section) => (
                    <option key={section.id} value={section.id}>
                      {section.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1.5">
                <span className={labelClass}>Semester</span>
                <select
                  required
                  value={form.semesterId}
                  onChange={(e) => updateField("semesterId", e.target.value)}
                  className={inputClass}
                >
                  <option value="" disabled>
                    Select a semester
                  </option>
                  {semesters.map((semester) => (
                    <option key={semester.id} value={semester.id}>
                      {semester.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
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
        <h2 className="mb-4 font-display text-lg font-semibold text-ink">Users</h2>

        {listMessage && (
          <p className={`mb-4 text-sm ${listMessage.tone === "success" ? "text-slate" : "text-oxblood"}`}>
            {listMessage.text}
          </p>
        )}

        {users.length === 0 ? (
          <p className="border-b border-brass/20 py-4 text-sm text-slate">No users yet.</p>
        ) : (
          <div className="flex flex-col">
            {users.map((user) => (
              <div key={user.id} className="border-b border-brass/20 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-ink">
                      {user.firstName} {user.lastName}
                    </span>
                    <span className="font-mono text-sm text-slate">{user.email}</span>
                    <span className="text-sm text-slate">{user.role}</span>
                    <StatusStamp status={user.enabled ? "ACTIVE" : "LOCKED"} />
                  </div>
                  <div className="flex items-center gap-4">
                    <button type="button" onClick={() => startResetPassword(user)} className={rowActionClass}>
                      Reset password
                    </button>
                    <button type="button" onClick={() => handleToggleEnabled(user)} className={rowActionClass}>
                      {confirmingLockId === user.id
                        ? `Confirm ${user.enabled ? "lock" : "unlock"}?`
                        : user.enabled
                        ? "Lock account"
                        : "Unlock account"}
                    </button>
                  </div>
                </div>

                {resetPasswordId === user.id && (
                  <div className="mt-3 flex items-end gap-4">
                    <label className="flex flex-1 max-w-xs flex-col gap-1.5">
                      <span className={labelClass}>New password for {user.email}</span>
                      <input
                        type="password"
                        required
                        minLength={8}
                        autoComplete="new-password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className={inputClass}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => handleResetPassword(user.id)}
                      disabled={newPassword.length < 8}
                      className={rowActionClass}
                    >
                      Save
                    </button>
                    <button type="button" onClick={cancelResetPassword} className={rowActionClass}>
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
