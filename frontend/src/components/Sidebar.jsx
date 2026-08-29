import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const STUDENT_NAV_ITEMS = [
  { to: "/", label: "Dashboard" },
  { to: "/quizzes", label: "Quizzes" },
];

const STAFF_NAV_ITEMS = [
  { to: "/staff/attendance", label: "Mark Attendance" },
  { to: "/staff/results", label: "Enter Results" },
];

const STAFF_QUIZ_NAV_ITEMS = [
  { to: "/staff/quizzes", label: "Quizzes" },
  { to: "/staff/quizzes/new", label: "New Quiz" },
];

const ADMIN_NAV_ITEMS = [
  { to: "/admin/users", label: "Users" },
  { to: "/admin/academic-structure", label: "Academic Structure" },
  { to: "/admin/timetable", label: "Generate Timetable" },
  { to: "/admin/leave", label: "Leave Requests" },
  { to: "/admin/fees", label: "Fees Overview" },
  { to: "/admin/feedback", label: "Feedback" },
  { to: "/admin/proctor", label: "Proctor Assignment" },
];

export default function Sidebar() {
  const { role } = useAuth();
  const items =
    role === "ADMIN"
      ? ADMIN_NAV_ITEMS
      : role === "STAFF"
      ? [...STAFF_NAV_ITEMS, ...STAFF_QUIZ_NAV_ITEMS]
      : role === "STUDENT"
      ? STUDENT_NAV_ITEMS
      : [];

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-brass/30 bg-paper">
      <div className="border-b border-brass/30 px-5 py-6">
        <span className="font-display text-lg font-semibold text-ink">Panacea</span>
      </div>
      <nav className="flex flex-col py-2">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/" || item.to === "/staff/quizzes" || item.to === "/quizzes"}
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
    </aside>
  );
}
