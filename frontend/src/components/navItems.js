import {
  LayoutDashboard,
  ClipboardList,
  BookOpen,
  UserCheck,
  CalendarClock,
  MessageSquare,
  Users,
  Building2,
  UserCog,
  Calendar,
  CalendarRange,
  Wallet,
  ShieldCheck,
  Bell,
  CheckSquare,
  FileText,
  FolderOpen,
  Users2,
  ListChecks,
  ClipboardCheck,
  CalendarDays,
  Megaphone,
  GraduationCap,
  AlertTriangle,
  Search,
} from "lucide-react";

export const STUDENT_NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/quizzes", label: "Quizzes", icon: ClipboardList },
  { to: "/electives", label: "Electives", icon: BookOpen },
  { to: "/proctor", label: "My Proctor", icon: UserCheck },
  { to: "/leave", label: "Leave Requests", icon: CalendarClock },
  { to: "/feedback", label: "Feedback", icon: MessageSquare },
];

export const STAFF_NAV_ITEMS = [
  { to: "/staff", label: "Dashboard", icon: LayoutDashboard },
  { to: "/staff/attendance", label: "Mark Attendance", icon: CheckSquare },
  { to: "/staff/results", label: "Enter Results", icon: FileText },
  { to: "/staff/materials", label: "Course Materials", icon: FolderOpen },
  { to: "/staff/mentees", label: "My Mentees", icon: Users2 },
  { to: "/staff/electives", label: "Elective Requests", icon: ListChecks },
  { to: "/staff/exam-duty", label: "My Exam Duty", icon: ClipboardCheck },
  { to: "/staff/timetable", label: "My Timetable", icon: CalendarDays },
  { to: "/leave", label: "Leave Requests", icon: CalendarClock },
  { to: "/feedback", label: "Feedback", icon: MessageSquare },
];

export const STAFF_QUIZ_NAV_ITEMS = [
  { to: "/staff/quizzes", label: "Quizzes", icon: ClipboardList },
  { to: "/staff/quizzes/new", label: "New Quiz", icon: ClipboardList },
];

export const HOD_NAV_ITEMS = [
  { to: "/hod", label: "Dashboard", icon: LayoutDashboard },
  { to: "/hod/announcements", label: "Announcements", icon: Megaphone },
  { to: "/hod/subjects", label: "Subjects", icon: BookOpen },
  { to: "/admin/staff-assignments", label: "Staff Assignment", icon: UserCog },
  { to: "/hod/faculty", label: "Faculty", icon: GraduationCap },
  { to: "/hod/at-risk", label: "At-Risk", icon: AlertTriangle },
  { to: "/hod/leave", label: "Leave Requests", icon: CalendarClock },
  { to: "/hod/feedback", label: "Feedback", icon: MessageSquare },
  { to: "/hod/proctor", label: "Proctor Assignment", icon: ShieldCheck },
  { to: "/hod/students", label: "Student Lookup", icon: Search },
];

export const ADMIN_NAV_ITEMS = [
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/academic-structure", label: "Academic Structure", icon: Building2 },
  { to: "/admin/staff-assignments", label: "Staff Assignment", icon: UserCog },
  { to: "/admin/calendar", label: "Academic Calendar", icon: Calendar },
  { to: "/admin/timetable", label: "Generate Timetable", icon: CalendarRange },
  { to: "/admin/leave", label: "Leave Requests", icon: CalendarClock },
  { to: "/admin/fees", label: "Fees Overview", icon: Wallet },
  { to: "/admin/feedback", label: "Feedback", icon: MessageSquare },
  { to: "/admin/proctor", label: "Proctor Assignment", icon: ShieldCheck },
];

export const NOTIFICATIONS_NAV_ITEM = { to: "/notifications", label: "Notifications", icon: Bell };

// Combined lookup of every route -> label, used by Layout.jsx to render the
// topbar breadcrumb without duplicating this list.
export const ALL_NAV_ITEMS = [
  ...STUDENT_NAV_ITEMS,
  ...STAFF_NAV_ITEMS,
  ...STAFF_QUIZ_NAV_ITEMS,
  ...HOD_NAV_ITEMS,
  ...ADMIN_NAV_ITEMS,
  NOTIFICATIONS_NAV_ITEM,
];
