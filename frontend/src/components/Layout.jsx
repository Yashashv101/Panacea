import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import { ALL_NAV_ITEMS } from "./navItems";
import { useAuth } from "../context/AuthContext";

const ROLE_LABELS = {
  ADMIN: "Administrator",
  HOD: "Head of Department",
  STAFF: "Staff",
  STUDENT: "Student",
};

function currentPageLabel(pathname) {
  const exact = ALL_NAV_ITEMS.find((item) => item.to === pathname);
  if (exact) return exact.label;

  // Dynamic/detail routes (e.g. /subjects/:id) aren't in the nav list —
  // fall back to the longest nav item whose path prefixes this one.
  const prefixMatch = ALL_NAV_ITEMS.filter((item) => item.to !== "/" && pathname.startsWith(item.to)).sort(
    (a, b) => b.to.length - a.to.length
  )[0];

  return prefixMatch?.label ?? "Panacea";
}

export default function Layout() {
  const { role } = useAuth();
  const location = useLocation();
  const pageLabel = currentPageLabel(location.pathname);

  return (
    <div className="flex min-h-screen bg-bg">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-surface px-8">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-ink-muted">Panacea</span>
            <span className="text-ink-muted">/</span>
            <span className="font-medium text-ink">{pageLabel}</span>
          </div>
          {role && (
            <span className="rounded-md bg-surface-alt px-2.5 py-1 font-mono text-xs font-medium text-ink-secondary">
              {ROLE_LABELS[role] ?? role}
            </span>
          )}
        </header>
        <main className="flex-1 overflow-y-auto px-8 py-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
