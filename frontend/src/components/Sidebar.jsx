import { NavLink, useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import {
  STUDENT_NAV_ITEMS,
  STAFF_NAV_ITEMS,
  STAFF_QUIZ_NAV_ITEMS,
  HOD_NAV_ITEMS,
  ADMIN_NAV_ITEMS,
  NOTIFICATIONS_NAV_ITEM,
} from "./navItems";

export default function Sidebar() {
  const { role, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  const roleItems =
    role === "ADMIN"
      ? ADMIN_NAV_ITEMS
      : role === "STAFF"
      ? [...STAFF_NAV_ITEMS, ...STAFF_QUIZ_NAV_ITEMS]
      : role === "STUDENT"
      ? STUDENT_NAV_ITEMS
      : role === "HOD"
      ? HOD_NAV_ITEMS
      : [];

  const items = role ? [...roleItems, NOTIFICATIONS_NAV_ITEM] : roleItems;

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-border bg-surface">
      <div className="flex items-center gap-2.5 border-b border-border px-5 py-5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-accent font-display text-sm font-semibold text-white">
          P
        </div>
        <span className="font-display text-lg font-semibold text-ink">Panacea</span>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 py-4">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/" || item.to === "/staff/quizzes" || item.to === "/quizzes" || item.to === "/hod"}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors duration-150 ease-out ${
                isActive
                  ? "bg-accent-soft text-accent"
                  : "text-ink-secondary hover:bg-surface-alt hover:text-ink"
              }`
            }
          >
            <item.icon className="h-[18px] w-[18px] shrink-0" strokeWidth={2} aria-hidden="true" />
            <span className="truncate">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-border px-3 py-3">
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm font-medium text-ink-secondary transition-colors duration-150 ease-out hover:bg-surface-alt hover:text-danger"
        >
          <LogOut className="h-[18px] w-[18px] shrink-0" strokeWidth={2} aria-hidden="true" />
          Log out
        </button>
      </div>
    </aside>
  );
}
