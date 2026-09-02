export const TIMETABLE_DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"];
export const TIMETABLE_PERIODS = [1, 2, 3, 4, 5, 6];

export function timetableDayLabel(day) {
  return day.charAt(0) + day.slice(1).toLowerCase();
}

// Cycles a subject through the app's own semantic tokens (never an invented
// hue) so the same subject reads as the same color everywhere it appears —
// a quick visual key the way a calendar app color-codes recurring events,
// built only from colors already in tailwind.config.js.
const SUBJECT_STYLES = [
  { chip: "bg-accent", dot: "bg-accent" },
  { chip: "bg-success", dot: "bg-success" },
  { chip: "bg-warning", dot: "bg-warning" },
  { chip: "bg-danger", dot: "bg-danger" },
];

function styleForSubject(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return SUBJECT_STYLES[hash % SUBJECT_STYLES.length];
}

function todayDayName() {
  const jsDay = new Date().getDay(); // 0=Sun..6=Sat
  return ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"][jsDay];
}

/**
 * The Day x Period grid shared by the admin per-section view
 * (TimetableGeneration.jsx), the student dashboard, and staff's own
 * timetable — renders subject name, section name (e.g. Sec A), and staff name.
 *
 * A denser CSS-grid "agenda board" than the plain hairline table it replaces
 * — per-subject color coding, hover lift, and entrance motion — but built
 * entirely from the operations-console palette (accent/success/warning/danger,
 * ink/ink-secondary/ink-muted, surface/surface-alt/border) rather than an
 * invented one, per explicit instruction to keep the rest of the ERP's color
 * system.
 */
export default function TimetableGrid({ entries, emptyMessage = "No timetable entries yet.", showSection = true }) {
  if (entries.length === 0) {
    return <p className="text-sm text-ink-secondary">{emptyMessage}</p>;
  }

  const today = todayDayName();

  function entryFor(day, period) {
    return entries.find((entry) => entry.day === day && entry.period === period);
  }

  return (
    <div className="ttg-root overflow-x-auto rounded-xl border border-border bg-surface shadow-sm">
      <style>{`
        @keyframes ttg-rise {
          from { opacity: 0; transform: translateY(6px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .ttg-cell { animation: ttg-rise 0.35s cubic-bezier(0.16,1,0.3,1) both; }
        @keyframes ttg-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(46,92,230,0.45); }
          50% { box-shadow: 0 0 0 5px rgba(46,92,230,0); }
        }
        .ttg-today-dot { animation: ttg-pulse 2s ease-in-out infinite; }
      `}</style>

      <div
        className="grid min-w-[720px]"
        style={{ gridTemplateColumns: `104px repeat(${TIMETABLE_PERIODS.length}, minmax(0, 1fr))` }}
      >
        {/* header row */}
        <div className="sticky top-0 z-10 flex items-center rounded-tl-xl bg-ink px-3 py-3 text-[11px] font-bold uppercase tracking-widest text-white/70">
          Day
        </div>
        {TIMETABLE_PERIODS.map((period, i) => (
          <div
            key={period}
            className={`sticky top-0 z-10 flex flex-col items-center justify-center gap-0.5 bg-ink px-2 py-3 ${
              i === TIMETABLE_PERIODS.length - 1 ? "rounded-tr-xl" : ""
            }`}
          >
            <span className="font-mono text-sm font-bold text-white">P{period}</span>
            <span className="text-[9px] uppercase tracking-wider text-white/50">Period</span>
          </div>
        ))}

        {/* body rows */}
        {TIMETABLE_DAYS.map((day, rowIndex) => {
          const isToday = day === today;
          return (
            <div key={`${day}-label`} className="contents">
              <div
                className={`flex flex-col items-start justify-center gap-1 border-t border-border px-3 py-4 ${
                  isToday ? "bg-accent-soft" : ""
                }`}
              >
                <span className={`text-sm font-semibold ${isToday ? "text-accent" : "text-ink"}`}>
                  {timetableDayLabel(day)}
                </span>
                {isToday && (
                  <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-accent">
                    <span className="ttg-today-dot h-1.5 w-1.5 rounded-full bg-accent" />
                    Today
                  </span>
                )}
              </div>

              {TIMETABLE_PERIODS.map((period, colIndex) => {
                const entry = entryFor(day, period);
                const style = entry ? styleForSubject(entry.subjectName) : null;
                return (
                  <div
                    key={period}
                    className={`border-t border-border p-1.5 ${isToday ? "bg-accent-soft/40" : ""}`}
                  >
                    {entry ? (
                      <div
                        className={`ttg-cell group relative flex h-full flex-col gap-1 overflow-hidden rounded-lg ${style.chip} p-2.5 shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md`}
                        style={{ animationDelay: `${(rowIndex * TIMETABLE_PERIODS.length + colIndex) * 18}ms` }}
                      >
                        <div className="pointer-events-none absolute -right-4 -top-4 h-14 w-14 rounded-full bg-white/10 blur-md transition-transform duration-300 group-hover:scale-125" />
                        <div className="relative text-[13px] font-bold leading-tight text-white">
                          {entry.subjectName}
                        </div>
                        {showSection && entry.sectionName && (
                          <span className="relative w-fit rounded-full bg-white/20 px-2 py-0.5 font-mono text-[10px] font-semibold text-white">
                            Sec {entry.sectionName}
                          </span>
                        )}
                        {entry.staffName && (
                          <div className="relative truncate text-[11px] font-medium text-white/85">{entry.staffName}</div>
                        )}
                      </div>
                    ) : (
                      <div className="flex h-full min-h-[64px] items-center justify-center rounded-lg border border-dashed border-border-strong text-ink-muted">
                        <span className="text-xs">—</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
