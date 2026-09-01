import { useEffect, useMemo, useState } from "react";
import apiClient from "../../api/client";
import {
  inputClass,
  labelClass,
  primaryButtonClass,
  rowActionClass,
  tableWrapClass,
  theadRowClass,
  thClass,
  tdClass,
  trClass,
  extractErrorMessage,
} from "./academic/formStyles";
import StatusBadge from "../../components/StatusBadge";
import MetricCard from "../../components/MetricCard";
import Card from "../../components/Card";
import { Users as UsersIcon, ShieldCheck, Building2, Lock } from "lucide-react";

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

function UserRow({
  user,
  courses,
  sections,
  semesters,
  editingId,
  editForm,
  editLoading,
  editSubmitting,
  editMessage,
  confirmingLockId,
  resetPasswordId,
  newPassword,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onEditFieldChange,
  onEditCourseChange,
  onStartResetPassword,
  onCancelResetPassword,
  onNewPasswordChange,
  onSaveResetPassword,
  onToggleEnabled,
}) {
  function sectionsForCourse(courseId) {
    return sections.filter((section) => String(section.courseId) === String(courseId));
  }

  const isEditing = editingId === user.id;
  const isResetting = resetPasswordId === user.id;

  return (
    <>
      <tr className={trClass}>
        <td className={tdClass}>
          <span className="font-medium text-ink">
            {user.firstName} {user.lastName}
          </span>
        </td>
        <td className={`${tdClass} font-mono text-xs text-ink-secondary`}>{user.email}</td>
        <td className={`${tdClass} text-ink-secondary`}>{user.role}</td>
        <td className={tdClass}>
          <StatusBadge status={user.enabled ? "ACTIVE" : "LOCKED"} variant={user.enabled ? "positive" : "negative"} />
        </td>
        <td className={`${tdClass} text-right`}>
          <div className="flex items-center justify-end gap-4">
            <button type="button" onClick={() => onStartEdit(user)} className={rowActionClass}>
              Edit
            </button>
            <button type="button" onClick={() => onStartResetPassword(user)} className={rowActionClass}>
              Reset password
            </button>
            <button type="button" onClick={() => onToggleEnabled(user)} className={rowActionClass}>
              {confirmingLockId === user.id
                ? `Confirm ${user.enabled ? "lock" : "unlock"}?`
                : user.enabled
                ? "Lock account"
                : "Unlock account"}
            </button>
          </div>
        </td>
      </tr>

      {isEditing && (
        <tr className={trClass}>
          <td colSpan={5} className="bg-surface-alt/60 px-4 py-4">
            {editLoading ? (
              <p className="text-sm text-ink-secondary">Loading current placement…</p>
            ) : (
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-5">
                  <label className="flex flex-col gap-1.5">
                    <span className={labelClass}>First name</span>
                    <input
                      type="text"
                      required
                      value={editForm.firstName}
                      onChange={(e) => onEditFieldChange("firstName", e.target.value)}
                      className={inputClass}
                    />
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className={labelClass}>Last name</span>
                    <input
                      type="text"
                      required
                      value={editForm.lastName}
                      onChange={(e) => onEditFieldChange("lastName", e.target.value)}
                      className={inputClass}
                    />
                  </label>
                </div>

                {user.role === "STAFF" && (
                  <label className="flex max-w-xs flex-col gap-1.5">
                    <span className={labelClass}>Course (department)</span>
                    <select
                      required
                      value={editForm.courseId}
                      onChange={(e) => onEditFieldChange("courseId", e.target.value)}
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

                {user.role === "STUDENT" && (
                  <div className="grid grid-cols-3 gap-5">
                    <label className="flex flex-col gap-1.5">
                      <span className={labelClass}>Course</span>
                      <select
                        required
                        value={editForm.courseId}
                        onChange={(e) => onEditCourseChange(e.target.value)}
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
                    <label className="flex flex-col gap-1.5">
                      <span className={labelClass}>Section</span>
                      <select
                        required
                        disabled={!editForm.courseId}
                        value={editForm.sectionId}
                        onChange={(e) => onEditFieldChange("sectionId", e.target.value)}
                        className={inputClass}
                      >
                        <option value="" disabled>
                          {editForm.courseId ? "Select a section" : "Select a course first"}
                        </option>
                        {sectionsForCourse(editForm.courseId).map((section) => (
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
                        value={editForm.semesterId}
                        onChange={(e) => onEditFieldChange("semesterId", e.target.value)}
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

                {editMessage && (
                  <p className={`text-sm ${editMessage.tone === "success" ? "text-ink-secondary" : "text-danger"}`}>
                    {editMessage.text}
                  </p>
                )}

                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => onSaveEdit(user)}
                    disabled={editSubmitting}
                    className={primaryButtonClass}
                  >
                    {editSubmitting ? "Saving…" : "Save"}
                  </button>
                  <button type="button" onClick={onCancelEdit} className={rowActionClass}>
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </td>
        </tr>
      )}

      {isResetting && (
        <tr className={trClass}>
          <td colSpan={5} className="bg-surface-alt/60 px-4 py-4">
            <div className="flex items-end gap-4">
              <label className="flex max-w-xs flex-1 flex-col gap-1.5">
                <span className={labelClass}>New password for {user.email}</span>
                <input
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => onNewPasswordChange(e.target.value)}
                  className={inputClass}
                />
              </label>
              <button
                type="button"
                onClick={() => onSaveResetPassword(user.id)}
                disabled={newPassword.length < 8}
                className={primaryButtonClass}
              >
                Save
              </button>
              <button type="button" onClick={onCancelResetPassword} className={rowActionClass}>
                Cancel
              </button>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function UserTable({ users, emptyLabel, ...rowProps }) {
  if (users.length === 0) {
    return <p className="px-1 py-4 text-sm text-ink-secondary">{emptyLabel}</p>;
  }
  return (
    <div className={`${tableWrapClass} max-h-[28rem] overflow-y-auto`}>
      <table className="w-full text-left text-sm">
        <thead className="sticky top-0 z-10">
          <tr className={theadRowClass}>
            <th className={thClass}>Name</th>
            <th className={thClass}>Email</th>
            <th className={thClass}>Role</th>
            <th className={thClass}>Status</th>
            <th className={`${thClass} text-right`}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <UserRow key={user.id} user={user} {...rowProps} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

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
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editMessage, setEditMessage] = useState(null);

  const [selectedCourseId, setSelectedCourseId] = useState(null);
  const [departmentStudents, setDepartmentStudents] = useState({});
  const [studentsLoadingCourseId, setStudentsLoadingCourseId] = useState(null);
  const [studentsError, setStudentsError] = useState(null);

  useEffect(() => {
    apiClient.get("/courses").then(({ data }) => setCourses(data));
    apiClient.get("/sections").then(({ data }) => setSections(data));
    apiClient.get("/semesters").then(({ data }) => setSemesters(data));
    apiClient.get("/users").then(({ data }) => setUsers(data));
  }, []);

  function sectionsForCourse(courseId) {
    return sections.filter((section) => String(section.courseId) === String(courseId));
  }

  const sectionsForSelectedCourse = sectionsForCourse(form.courseId);

  const administrators = useMemo(() => users.filter((u) => u.role === "ADMIN"), [users]);
  const lockedCount = useMemo(() => users.filter((u) => !u.enabled).length, [users]);

  const departmentSummaries = useMemo(() => {
    return courses.map((course) => {
      const hod = users.find((u) => u.role === "HOD" && String(u.hodCourseId) === String(course.id));
      const staff = users.filter((u) => u.role === "STAFF" && String(u.staffCourseId) === String(course.id));
      const studentCount = (departmentStudents[course.id] ?? []).length;
      return { course, hod, staff, studentCount };
    });
  }, [courses, users, departmentStudents]);

  const selectedDepartment = departmentSummaries.find((d) => String(d.course.id) === String(selectedCourseId));
  const selectedDepartmentStudents = departmentStudents[selectedCourseId] ?? [];

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
      if (data.role === "STUDENT" && payload.courseId != null && departmentStudents[payload.courseId]) {
        setDepartmentStudents((prev) => ({
          ...prev,
          [payload.courseId]: [data, ...prev[payload.courseId]],
        }));
      }
      setForm(EMPTY_FORM);
      setMessage({ tone: "success", text: "User created." });
    } catch (err) {
      setMessage({ tone: "error", text: extractErrorMessage(err, "Something went wrong creating the user.") });
    } finally {
      setSubmitting(false);
    }
  }

  function applyUserUpdate(updatedUser) {
    setUsers((prev) => prev.map((u) => (u.id === updatedUser.id ? updatedUser : u)));
    if (updatedUser.role === "STUDENT") {
      setDepartmentStudents((prev) => {
        const next = { ...prev };
        for (const courseId of Object.keys(next)) {
          if (next[courseId].some((u) => u.id === updatedUser.id)) {
            next[courseId] = next[courseId].map((u) => (u.id === updatedUser.id ? updatedUser : u));
          }
        }
        return next;
      });
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
      applyUserUpdate(data);
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

  async function startEdit(targetUser) {
    setListMessage(null);
    setConfirmingLockId(null);
    cancelResetPassword();
    setEditingId(targetUser.id);
    setEditMessage(null);
    setEditForm({
      firstName: targetUser.firstName,
      lastName: targetUser.lastName,
      courseId: targetUser.staffCourseId ? String(targetUser.staffCourseId) : "",
      sectionId: "",
      semesterId: "",
    });

    // STUDENT placement (course/section/semester) isn't on UserResponse at
    // all — it lives on StudentProfile, so it has to be fetched separately
    // via the same admin lookup StudentLookup.jsx uses, keyed by email since
    // there's no "get profile by user id" endpoint.
    if (targetUser.role === "STUDENT") {
      setEditLoading(true);
      try {
        const { data } = await apiClient.get("/students/by-email", { params: { email: targetUser.email } });
        setEditForm((prev) => ({
          ...prev,
          courseId: String(data.courseId),
          sectionId: String(data.sectionId),
          semesterId: String(data.semesterId),
        }));
      } catch {
        setEditMessage({ tone: "error", text: "Could not load this student's current placement." });
      } finally {
        setEditLoading(false);
      }
    }
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm(null);
  }

  function updateEditField(field, value) {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  }

  function updateEditCourse(value) {
    setEditForm((prev) => ({ ...prev, courseId: value, sectionId: "" }));
  }

  async function handleSaveEdit(targetUser) {
    setEditMessage(null);
    setEditSubmitting(true);
    try {
      const isStudent = targetUser.role === "STUDENT";
      const isStaff = targetUser.role === "STAFF";
      const payload = {
        firstName: editForm.firstName,
        lastName: editForm.lastName,
        enabled: targetUser.enabled,
        courseId: isStudent || isStaff ? Number(editForm.courseId) : null,
        sectionId: isStudent ? Number(editForm.sectionId) : null,
        semesterId: isStudent ? Number(editForm.semesterId) : null,
      };
      const { data } = await apiClient.put(`/users/${targetUser.id}`, payload);
      applyUserUpdate(data);
      // A student's department (course) may have changed — the cached
      // per-department roster can't be trusted to still be accurate, so
      // drop it and let it refetch next time that department is opened.
      if (isStudent) {
        setDepartmentStudents({});
      }
      cancelEdit();
    } catch (err) {
      setEditMessage({ tone: "error", text: extractErrorMessage(err, "Could not update this user.") });
    } finally {
      setEditSubmitting(false);
    }
  }

  async function openDepartment(courseId) {
    setListMessage(null);
    setConfirmingLockId(null);
    cancelResetPassword();
    cancelEdit();
    setSelectedCourseId(courseId);
    if (departmentStudents[courseId]) return;

    setStudentsError(null);
    setStudentsLoadingCourseId(courseId);
    try {
      const courseSections = sectionsForCourse(courseId);
      const results = await Promise.all(
        courseSections.map((section) => apiClient.get("/students", { params: { sectionId: section.id } }))
      );
      const merged = results.flatMap(({ data }) => data);
      setDepartmentStudents((prev) => ({ ...prev, [courseId]: merged }));
    } catch (err) {
      setStudentsError(extractErrorMessage(err, "Could not load students for this department."));
    } finally {
      setStudentsLoadingCourseId(null);
    }
  }

  function closeDepartment() {
    setSelectedCourseId(null);
    setListMessage(null);
    setConfirmingLockId(null);
    cancelResetPassword();
    cancelEdit();
  }

  const rowProps = {
    courses,
    sections,
    semesters,
    editingId,
    editForm,
    editLoading,
    editSubmitting,
    editMessage,
    confirmingLockId,
    resetPasswordId,
    newPassword,
    onStartEdit: startEdit,
    onCancelEdit: cancelEdit,
    onSaveEdit: handleSaveEdit,
    onEditFieldChange: updateEditField,
    onEditCourseChange: updateEditCourse,
    onStartResetPassword: startResetPassword,
    onCancelResetPassword: cancelResetPassword,
    onNewPasswordChange: setNewPassword,
    onSaveResetPassword: handleResetPassword,
    onToggleEnabled: handleToggleEnabled,
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-semibold text-ink">User Management</h1>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Total Users" value={users.length} icon={UsersIcon} />
        <MetricCard label="Administrators" value={administrators.length} icon={ShieldCheck} />
        <MetricCard label="Departments" value={courses.length} icon={Building2} />
        <MetricCard
          label="Locked Accounts"
          value={lockedCount}
          icon={Lock}
          tone={lockedCount > 0 ? "warning" : "default"}
        />
      </div>

      <Card title="Create user" className="mb-6">
        <form onSubmit={handleSubmit} className="flex max-w-xl flex-col gap-5">
          <div className="grid grid-cols-2 gap-5">
            <label className="flex flex-col gap-1.5">
              <span className={labelClass}>First name</span>
              <input
                type="text"
                required
                value={form.firstName}
                onChange={(e) => updateField("firstName", e.target.value)}
                className={inputClass}
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className={labelClass}>Last name</span>
              <input
                type="text"
                required
                value={form.lastName}
                onChange={(e) => updateField("lastName", e.target.value)}
                className={inputClass}
              />
            </label>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>Email</span>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => updateField("email", e.target.value)}
              className={inputClass}
              autoComplete="off"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>Password</span>
            <input
              type="password"
              required
              minLength={8}
              value={form.password}
              onChange={(e) => updateField("password", e.target.value)}
              className={inputClass}
              autoComplete="new-password"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>Role</span>
            <select value={form.role} onChange={(e) => updateField("role", e.target.value)} className={inputClass}>
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
            <p className={`text-sm ${message.tone === "success" ? "text-ink-secondary" : "text-danger"}`}>
              {message.text}
            </p>
          )}

          <button type="submit" disabled={submitting} className={`${primaryButtonClass} mt-1`}>
            {submitting ? "Creating…" : "Create user"}
          </button>
        </form>
      </Card>

      {listMessage && (
        <p className={`mb-4 text-sm ${listMessage.tone === "success" ? "text-ink-secondary" : "text-danger"}`}>
          {listMessage.text}
        </p>
      )}

      <Card title="Administrators" className="mb-6">
        <UserTable users={administrators} emptyLabel="No administrator accounts yet." {...rowProps} />
      </Card>

      <Card title="Departments">
        {!selectedDepartment ? (
          courses.length === 0 ? (
            <p className="py-4 text-sm text-ink-secondary">No departments yet.</p>
          ) : (
            <div className={tableWrapClass}>
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className={theadRowClass}>
                    <th className={thClass}>Department</th>
                    <th className={thClass}>Head of department</th>
                    <th className={`${thClass} text-right`}>Staff</th>
                  </tr>
                </thead>
                <tbody>
                  {departmentSummaries.map(({ course, hod, staff }) => (
                    <tr
                      key={course.id}
                      onClick={() => openDepartment(course.id)}
                      className={`${trClass} cursor-pointer`}
                    >
                      <td className={`${tdClass} font-medium text-ink`}>{course.name}</td>
                      <td className={`${tdClass} text-ink-secondary`}>
                        {hod ? `${hod.firstName} ${hod.lastName}` : "Unassigned"}
                      </td>
                      <td className={`${tdClass} text-right font-mono`}>{staff.length}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          <div>
            <button type="button" onClick={closeDepartment} className={`${rowActionClass} mb-4`}>
              ← Back to departments
            </button>
            <h3 className="mb-6 font-display text-xl font-semibold text-ink">{selectedDepartment.course.name}</h3>

            <div className="mb-8">
              <h4 className="mb-3 text-xs font-medium uppercase tracking-wide text-ink-muted">Head of department</h4>
              <UserTable
                users={selectedDepartment.hod ? [selectedDepartment.hod] : []}
                emptyLabel="No HOD assigned to this department."
                {...rowProps}
              />
            </div>

            <div className="mb-8">
              <h4 className="mb-3 text-xs font-medium uppercase tracking-wide text-ink-muted">Staff</h4>
              <UserTable users={selectedDepartment.staff} emptyLabel="No staff in this department." {...rowProps} />
            </div>

            <div>
              <h4 className="mb-3 text-xs font-medium uppercase tracking-wide text-ink-muted">Students</h4>
              {studentsLoadingCourseId === selectedDepartment.course.id ? (
                <p className="py-4 text-sm text-ink-secondary">Loading students…</p>
              ) : studentsError ? (
                <p className="py-4 text-sm text-danger">{studentsError}</p>
              ) : (
                <UserTable
                  users={selectedDepartmentStudents}
                  emptyLabel="No students in this department."
                  {...rowProps}
                />
              )}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
