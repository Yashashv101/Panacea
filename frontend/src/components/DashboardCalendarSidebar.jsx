import { useEffect, useMemo, useState } from "react";
import apiClient from "../api/client";
import { useAuth } from "../context/AuthContext";
import StatusStamp from "./StatusStamp";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const WEEKDAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const TYPE_LABELS = {
  HOLIDAY: "Holiday",
  EXAM: "Exam",
  EVENT: "Event",
  REMINDER: "Reminder",
};

function toIsoDate(year, month, day) {
  const m = String(month + 1).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${year}-${m}-${d}`;
}

function formatRange(entry) {
  if (entry.endDate && entry.endDate !== entry.date) {
    return `${entry.date} – ${entry.endDate}`;
  }
  return entry.date;
}

export default function DashboardCalendarSidebar() {
  const { user } = useAuth();

  const today = new Date();
  const todayIso = today.toISOString().slice(0, 10);

  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState(todayIso);

  // Global institution calendar events (holidays, college events, exams)
  const [events, setEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(true);

  // User-specific personal reminders
  const [reminders, setReminders] = useState([]);
  const [remindersLoading, setRemindersLoading] = useState(true);

  // Add reminder inline form state
  const [showAddReminder, setShowAddReminder] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newTime, setNewTime] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [savingReminder, setSavingReminder] = useState(false);
  const [reminderError, setReminderError] = useState(null);

  // Filter tab for selected date: "ALL", "REMINDERS", "EVENTS"
  const [activeTab, setActiveTab] = useState("ALL");

  // Load global calendar events
  useEffect(() => {
    let cancelled = false;
    setEventsLoading(true);

    apiClient
      .get("/calendar/all")
      .then((res) => {
        if (!cancelled) setEvents(res.data);
      })
      .catch(() => {
        // Fallback to /calendar/upcoming if /all is not yet active
        apiClient
          .get("/calendar/upcoming")
          .then((res) => {
            if (!cancelled) setEvents(res.data);
          })
          .catch(() => {});
      })
      .finally(() => {
        if (!cancelled) setEventsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Load user personal reminders
  function fetchReminders() {
    setRemindersLoading(true);
    apiClient
      .get("/reminders")
      .then((res) => {
        setReminders(res.data);
      })
      .catch(() => {})
      .finally(() => {
        setRemindersLoading(false);
      });
  }

  useEffect(() => {
    fetchReminders();
  }, []);

  // Navigate months
  function prevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  }

  function nextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  function jumpToToday() {
    const now = new Date();
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth());
    setSelectedDate(todayIso);
  }

  // Calendar Grid Calculation
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

    const days = [];

    // Previous month trailing days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const prevMonthIdx = viewMonth === 0 ? 11 : viewMonth - 1;
      const prevYearNum = viewMonth === 0 ? viewYear - 1 : viewYear;
      days.push({
        day: dayNum,
        iso: toIsoDate(prevYearNum, prevMonthIdx, dayNum),
        isCurrentMonth: false,
      });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        day: i,
        iso: toIsoDate(viewYear, viewMonth, i),
        isCurrentMonth: true,
      });
    }

    // Next month leading days to fill up full 35 or 42 grid cells
    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const nextMonthIdx = viewMonth === 11 ? 0 : viewMonth + 1;
      const nextYearNum = viewMonth === 11 ? viewYear + 1 : viewYear;
      days.push({
        day: i,
        iso: toIsoDate(nextYearNum, nextMonthIdx, i),
        isCurrentMonth: false,
      });
    }

    return days;
  }, [viewYear, viewMonth]);

  // Map dates to markers: { [isoDate]: { hasHoliday, hasExam, hasEvent, hasReminder } }
  const dateMarkerMap = useMemo(() => {
    const map = {};

    events.forEach((ev) => {
      if (!ev.date) return;
      if (!map[ev.date]) {
        map[ev.date] = { hasHoliday: false, hasExam: false, hasEvent: false, hasReminder: false };
      }
      if (ev.type === "HOLIDAY") map[ev.date].hasHoliday = true;
      else if (ev.type === "EXAM") map[ev.date].hasExam = true;
      else map[ev.date].hasEvent = true;

      // Handle multi-day range if any
      if (ev.endDate && ev.endDate !== ev.date) {
        const start = new Date(ev.date);
        const end = new Date(ev.endDate);
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          const iso = d.toISOString().slice(0, 10);
          if (!map[iso]) {
            map[iso] = { hasHoliday: false, hasExam: false, hasEvent: false, hasReminder: false };
          }
          if (ev.type === "HOLIDAY") map[iso].hasHoliday = true;
          else if (ev.type === "EXAM") map[iso].hasExam = true;
          else map[iso].hasEvent = true;
        }
      }
    });

    reminders.forEach((rem) => {
      if (!rem.date) return;
      if (!map[rem.date]) {
        map[rem.date] = { hasHoliday: false, hasExam: false, hasEvent: false, hasReminder: false };
      }
      map[rem.date].hasReminder = true;
    });

    return map;
  }, [events, reminders]);

  // Selected date parsed information
  const selectedDateObj = useMemo(() => {
    if (!selectedDate) return new Date();
    const parts = selectedDate.split("-");
    return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  }, [selectedDate]);

  const selectedDayNumber = selectedDateObj.getDate();
  const selectedDayName = selectedDateObj.toLocaleDateString("en-US", { weekday: "long" });
  const selectedMonthYear = selectedDateObj.toLocaleDateString("en-US", { month: "short", year: "numeric" });

  // Items on the selected date
  const selectedDateEvents = useMemo(() => {
    return events.filter((ev) => {
      if (ev.date === selectedDate) return true;
      if (ev.endDate && ev.endDate >= selectedDate && ev.date <= selectedDate) return true;
      return false;
    });
  }, [events, selectedDate]);

  const selectedDateReminders = useMemo(() => {
    return reminders.filter((rem) => rem.date === selectedDate);
  }, [reminders, selectedDate]);

  // Save new reminder
  async function handleAddReminder(e) {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setSavingReminder(true);
    setReminderError(null);
    try {
      const res = await apiClient.post("/reminders", {
        date: selectedDate,
        title: newTitle.trim(),
        time: newTime.trim() || null,
        description: newDescription.trim() || null,
      });
      setReminders((prev) => [...prev, res.data]);
      setNewTitle("");
      setNewTime("");
      setNewDescription("");
      setShowAddReminder(false);
    } catch (err) {
      setReminderError("Could not save reminder. Please try again.");
    } finally {
      setSavingReminder(false);
    }
  }

  // Toggle reminder completion
  async function handleToggleReminder(reminderId) {
    try {
      const res = await apiClient.patch(`/reminders/${reminderId}/toggle`);
      setReminders((prev) =>
        prev.map((r) => (r.id === reminderId ? res.data : r))
      );
    } catch {
      // ignore or refetch
      fetchReminders();
    }
  }

  // Delete reminder
  async function handleDeleteReminder(reminderId) {
    try {
      await apiClient.delete(`/reminders/${reminderId}`);
      setReminders((prev) => prev.filter((r) => r.id !== reminderId));
    } catch {
      fetchReminders();
    }
  }

  // Upcoming entries for bottom feed (sorted by date >= today)
  const upcomingEvents = useMemo(() => {
    return events
      .filter((ev) => (ev.endDate || ev.date) >= todayIso)
      .slice(0, 6);
  }, [events, todayIso]);

  return (
    <aside className="flex flex-col gap-6 w-full lg:w-80 xl:w-96 shrink-0">
      {/* Calendar Card */}
      <div className="border border-brass/25 bg-card/70 rounded-lg p-5 shadow-sm backdrop-blur-sm">
        {/* Month & Year Navigation Header */}
        <div className="flex items-center justify-between mb-4 border-b border-brass/15 pb-3">
          <div className="flex items-center gap-2">
            <span className="font-display text-lg font-semibold text-ink tracking-tight">
              {MONTH_NAMES[viewMonth]}
            </span>
            <span className="font-mono text-sm text-slate">{viewYear}</span>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={jumpToToday}
              title="Today"
              className="px-2 py-0.5 text-xs font-mono font-medium rounded border border-brass/20 text-slate hover:text-ink hover:border-brass/50 transition-colors mr-1"
            >
              Today
            </button>
            <button
              type="button"
              onClick={prevMonth}
              title="Previous Month"
              className="p-1 text-slate hover:text-ink rounded hover:bg-brass/10 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              type="button"
              onClick={nextMonth}
              title="Next Month"
              className="p-1 text-slate hover:text-ink rounded hover:bg-brass/10 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Day-of-week header */}
        <div className="grid grid-cols-7 text-center mb-2">
          {WEEKDAY_NAMES.map((name, i) => (
            <div key={name} className={`text-xs font-medium uppercase tracking-wider py-1 ${i === 0 ? "text-oxblood/80" : "text-slate/70"}`}>
              {name}
            </div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7 gap-y-1 gap-x-1 text-center">
          {calendarDays.map((cell) => {
            const isSelected = cell.iso === selectedDate;
            const isToday = cell.iso === todayIso;
            const markers = dateMarkerMap[cell.iso];

            return (
              <button
                key={cell.iso}
                type="button"
                onClick={() => {
                  setSelectedDate(cell.iso);
                  setShowAddReminder(false);
                }}
                className={`relative flex flex-col items-center justify-center h-10 rounded-full text-sm font-medium transition-all group ${
                  isSelected
                    ? "bg-oxblood text-white font-semibold shadow-sm"
                    : isToday
                    ? "bg-brass/15 text-ink font-semibold border border-brass/40"
                    : cell.isCurrentMonth
                    ? "text-ink hover:bg-brass/10"
                    : "text-slate/40 hover:bg-brass/5"
                }`}
              >
                <span className="leading-none">{cell.day}</span>

                {/* Dot Indicators */}
                <div className="flex items-center gap-0.5 mt-0.5 h-1.5">
                  {markers?.hasHoliday && (
                    <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? "bg-white" : "bg-red-500"}`} title="Holiday" />
                  )}
                  {(markers?.hasExam || markers?.hasEvent) && (
                    <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? "bg-amber-200" : "bg-amber-500"}`} title="Event / Exam" />
                  )}
                  {markers?.hasReminder && (
                    <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? "bg-emerald-200" : "bg-emerald-600"}`} title="Personal Reminder" />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 mt-4 pt-3 border-t border-brass/15 text-[11px] text-slate">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
            <span>Holiday</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
            <span>Event/Exam</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block" />
            <span>My Reminder</span>
          </div>
        </div>
      </div>

      {/* Selected Day Agenda & Reminders Section */}
      <div className="border border-brass/25 bg-card/70 rounded-lg p-5 shadow-sm backdrop-blur-sm flex flex-col gap-4">
        {/* Selected Date Header */}
        <div className="flex items-start justify-between border-b border-brass/15 pb-3">
          <div className="flex items-baseline gap-2.5">
            <span className="font-display text-3xl font-bold text-ink leading-none">
              {selectedDayNumber}
            </span>
            <div>
              <div className="font-medium text-sm text-ink leading-snug">{selectedDayName}</div>
              <div className="text-xs text-slate font-mono">{selectedMonthYear}</div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowAddReminder(!showAddReminder)}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded border border-oxblood text-oxblood hover:bg-oxblood hover:text-white transition-colors"
            title="Add personal reminder for this day"
          >
            <span>+</span>
            <span>Reminder</span>
          </button>
        </div>

        {/* Add Reminder Inline Form */}
        {showAddReminder && (
          <form onSubmit={handleAddReminder} className="border border-brass/30 bg-paper/60 rounded p-3 flex flex-col gap-2.5 text-xs animate-in fade-in duration-150">
            <div className="font-semibold text-ink flex items-center justify-between">
              <span>New Reminder for {selectedDate}</span>
              <button
                type="button"
                onClick={() => setShowAddReminder(false)}
                className="text-slate hover:text-ink font-mono text-sm leading-none"
              >
                ✕
              </button>
            </div>

            <input
              type="text"
              required
              placeholder="Reminder note (e.g. Question paper review)"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="px-2.5 py-1.5 rounded border border-brass/30 bg-card text-ink text-xs focus:outline-none focus:border-oxblood"
            />

            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Time (e.g. 10:30 AM)"
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
                className="px-2.5 py-1.5 rounded border border-brass/30 bg-card text-ink text-xs focus:outline-none focus:border-oxblood"
              />
              <input
                type="text"
                placeholder="Details (optional)"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                className="px-2.5 py-1.5 rounded border border-brass/30 bg-card text-ink text-xs focus:outline-none focus:border-oxblood"
              />
            </div>

            {reminderError && <p className="text-oxblood text-xs">{reminderError}</p>}

            <div className="flex items-center justify-end gap-2 mt-1">
              <button
                type="button"
                onClick={() => setShowAddReminder(false)}
                className="px-2 py-1 text-slate hover:text-ink"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingReminder || !newTitle.trim()}
                className="px-3 py-1 rounded bg-oxblood text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {savingReminder ? "Saving…" : "Save"}
              </button>
            </div>
          </form>
        )}

        {/* Tab Filters */}
        <div className="flex items-center gap-1 border-b border-brass/15 pb-2 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab("ALL")}
            className={`px-2.5 py-1 rounded font-medium transition-colors ${
              activeTab === "ALL" ? "bg-brass/20 text-ink font-semibold" : "text-slate hover:text-ink"
            }`}
          >
            All ({selectedDateEvents.length + selectedDateReminders.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("REMINDERS")}
            className={`px-2.5 py-1 rounded font-medium transition-colors ${
              activeTab === "REMINDERS" ? "bg-brass/20 text-ink font-semibold" : "text-slate hover:text-ink"
            }`}
          >
            My Reminders ({selectedDateReminders.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("EVENTS")}
            className={`px-2.5 py-1 rounded font-medium transition-colors ${
              activeTab === "EVENTS" ? "bg-brass/20 text-ink font-semibold" : "text-slate hover:text-ink"
            }`}
          >
            Events ({selectedDateEvents.length})
          </button>
        </div>

        {/* Agenda list for selected date */}
        <div className="flex flex-col divide-y divide-brass/10 max-h-56 overflow-y-auto pr-1">
          {activeTab !== "REMINDERS" &&
            selectedDateEvents.map((ev, idx) => (
              <div key={`event-${ev.type}-${idx}`} className="py-2.5 flex items-start gap-2.5">
                <span
                  className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                    ev.type === "HOLIDAY" ? "bg-red-500" : "bg-amber-500"
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-ink">{ev.title}</span>
                    <span className="text-[10px] font-mono uppercase px-1.5 py-0.2 rounded border border-brass/20 text-slate">
                      {TYPE_LABELS[ev.type] ?? ev.type}
                    </span>
                  </div>
                  {ev.description && <p className="text-xs text-slate mt-0.5">{ev.description}</p>}
                </div>
              </div>
            ))}

          {activeTab !== "EVENTS" &&
            selectedDateReminders.map((rem) => (
              <div key={`rem-${rem.id}`} className="py-2.5 flex items-start gap-2.5 group">
                <input
                  type="checkbox"
                  checked={rem.completed}
                  onChange={() => handleToggleReminder(rem.id)}
                  className="mt-1 accent-oxblood rounded cursor-pointer shrink-0"
                  title="Mark as completed"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium ${rem.completed ? "line-through text-slate/60" : "text-ink"}`}>
                      {rem.title}
                    </span>
                    {rem.time && (
                      <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200">
                        {rem.time}
                      </span>
                    )}
                  </div>
                  {rem.description && (
                    <p className={`text-xs mt-0.5 ${rem.completed ? "text-slate/50" : "text-slate"}`}>
                      {rem.description}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteReminder(rem.id)}
                  className="opacity-0 group-hover:opacity-100 text-slate/50 hover:text-oxblood text-xs transition-opacity font-mono px-1"
                  title="Delete reminder"
                >
                  ✕
                </button>
              </div>
            ))}

          {selectedDateEvents.length === 0 && selectedDateReminders.length === 0 && (
            <div className="py-4 text-center text-xs text-slate">
              No events or reminders for this date.
            </div>
          )}
        </div>
      </div>

      {/* Upcoming on the Calendar (Bottom Section) */}
      <div className="border border-brass/25 bg-card/70 rounded-lg p-5 shadow-sm backdrop-blur-sm flex flex-col gap-3">
        <div className="flex items-center justify-between border-b border-brass/15 pb-2">
          <h2 className="font-display text-base font-semibold text-ink">Upcoming on the calendar</h2>
          <span className="font-mono text-xs text-slate">Next 30 days</span>
        </div>

        {eventsLoading ? (
          <p className="text-xs text-slate py-2">Loading…</p>
        ) : upcomingEvents.length === 0 ? (
          <p className="text-xs text-slate py-2">Nothing scheduled coming up.</p>
        ) : (
          <div className="flex flex-col divide-y divide-brass/10">
            {upcomingEvents.map((entry, index) => (
              <div
                key={`${entry.type}-${entry.date}-${index}`}
                className="py-2.5 flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <StatusStamp status={TYPE_LABELS[entry.type] ?? entry.type} variant="neutral" />
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-ink truncate">{entry.title}</div>
                    {entry.description && (
                      <div className="text-[11px] text-slate truncate">{entry.description}</div>
                    )}
                  </div>
                </div>
                <span className="font-mono text-[11px] text-slate shrink-0">{formatRange(entry)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
