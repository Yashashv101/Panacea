export const TIMETABLE_DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"];
export const TIMETABLE_PERIODS = [1, 2, 3, 4, 5, 6];

export function timetableDayLabel(day) {
  return day.charAt(0) + day.slice(1).toLowerCase();
}

/**
 * The Day x Period grid shared by the admin per-section view
 * (TimetableGeneration.jsx), the student dashboard, and staff's own
 * timetable — renders subject name, section name (e.g. Sec A), and staff name.
 */
export default function TimetableGrid({ entries, emptyMessage = "No timetable entries yet.", showSection = true }) {
  if (entries.length === 0) {
    return <p className="text-sm text-slate">{emptyMessage}</p>;
  }

  function entryFor(day, period) {
    return entries.find((entry) => entry.day === day && entry.period === period);
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="border-b border-brass/30 py-2 pr-4 text-left text-xs font-medium uppercase tracking-wide text-slate">
              Day
            </th>
            {TIMETABLE_PERIODS.map((period) => (
              <th
                key={period}
                className="border-b border-brass/30 px-3 py-2 text-left font-mono text-xs font-medium uppercase tracking-wide text-slate"
              >
                P{period}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {TIMETABLE_DAYS.map((day) => (
            <tr key={day}>
              <td className="border-b border-brass/20 py-3 pr-4 text-sm text-ink">{timetableDayLabel(day)}</td>
              {TIMETABLE_PERIODS.map((period) => {
                const entry = entryFor(day, period);
                return (
                  <td key={period} className="border-b border-brass/20 px-3 py-3 align-top">
                    {entry ? (
                      <div className="flex flex-col gap-0.5">
                        <div className="text-sm font-medium text-ink">{entry.subjectName}</div>
                        {showSection && entry.sectionName && (
                          <div className="font-mono text-xs text-oxblood">Sec {entry.sectionName}</div>
                        )}
                        {entry.staffName && (
                          <div className="text-xs text-slate">{entry.staffName}</div>
                        )}
                      </div>
                    ) : (
                      <span className="text-sm text-slate">—</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
