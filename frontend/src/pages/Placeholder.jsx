import StatusStamp from "../components/StatusStamp";

const DEMO_ROWS = [
  { code: "CS301", label: "Data Structures", value: "92%", status: "APPROVED" },
  { code: "CS302", label: "Operating Systems", value: "78%", status: "PENDING" },
  { code: "CS303", label: "Networks", value: "88%", status: "REJECTED" },
];

export default function Placeholder({ title }) {
  return (
    <div>
      <div className="mb-6 flex items-center justify-between border-b border-brass/20 pb-4">
        <h1 className="font-display text-2xl font-semibold text-ink">{title}</h1>
      </div>

      <div className="flex flex-col">
        {DEMO_ROWS.map((row) => (
          <div
            key={row.code}
            className="flex items-center justify-between border-b border-brass/20 py-3"
          >
            <div className="flex items-center gap-4">
              <span className="font-mono text-sm text-slate">{row.code}</span>
              <span className="text-sm text-ink">{row.label}</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="font-mono text-sm text-ink">{row.value}</span>
              <StatusStamp status={row.status} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
