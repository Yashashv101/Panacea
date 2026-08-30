import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const STUDENT_NAV_ITEMS = [
  { to: "/", label: "Dashboard" },
  { to: "/quizzes", label: "Quizzes" },
  { to: "/electives", label: "Electives" },
  { to: "/proctor", label: "My Proctor" },
];

const STAFF_NAV_ITEMS = [
  { to: "/staff/attendance", label: "Mark Attendance" },
  { to: "/staff/results", label: "Enter Results" },
  { to: "/staff/mentees", label: "My Mentees" },
  { to: "/staff/electives", label: "Elective Requests" },
];

const STAFF_QUIZ_NAV_ITEMS = [
  { to: "/staff/quizzes", label: "Quizzes" },
  { to: "/staff/quizzes/new", label: "New Quiz" },
];

const HOD_NAV_ITEMS = [
  { to: "/hod", label: "Dashboard" },
  { to: "/hod/leave", label: "Leave Requests" },
  { to: "/hod/feedback", label: "Feedback" },
  { to: "/hod/proctor", label: "Proctor Assignment" },
  { to: "/hod/students", label: "Student Lookup" },
];

const ADMIN_NAV_ITEMS = [
  { to: "/admin/users", label: "Users" },
  { to: "/admin/academic-structure", label: "Academic Structure" },
  { to: "/admin/calendar", label: "Academic Calendar" },
  { to: "/admin/timetable", label: "Generate Timetable" },
  { to: "/admin/leave", label: "Leave Requests" },
  { to: "/admin/fees", label: "Fees Overview" },
  { to: "/admin/feedback", label: "Feedback" },
  { to: "/admin/proctor", label: "Proctor Assignment" },
];

export default function Sidebar() {
  const { role, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  const items =
    role === "ADMIN"
      ? ADMIN_NAV_ITEMS
      : role === "STAFF"
      ? [...STAFF_NAV_ITEMS, ...STAFF_QUIZ_NAV_ITEMS]
      : role === "STUDENT"
      ? STUDENT_NAV_ITEMS
      : role === "HOD"
      ? HOD_NAV_ITEMS
      : [];

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-brass/30 bg-paper">
      <div className="border-b border-brass/30 px-5 py-6">
        <span className="font-display text-lg font-semibold text-ink">Panacea</span>
      </div>
      <nav className="flex flex-1 flex-col py-2">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/" || item.to === "/staff/quizzes" || item.to === "/quizzes" || item.to === "/hod"}
            className={({ isActive }) =>
              `border-b border-brass/10 px-5 py-3 text-sm transition-colors ${
                isActive ? "bg-card font-medium text-oxblood" : "text-slate hover:text-ink"
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
      <button
        type="button"
        onClick={handleLogout}
        className="border-t border-brass/30 px-5 py-3 text-left text-sm text-slate transition-colors hover:text-oxblood"
      >
        Log out
      </button>
    </aside>
  );
}
