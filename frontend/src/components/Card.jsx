/**
 * Standard bordered/surfaced content container for the operations-console
 * design system — replaces the old ledger's hairline-rule sections.
 */
export default function Card({ title, action, children, className = "" }) {
  return (
    <div className={`rounded-lg border border-border bg-surface shadow-sm ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          {title && <h2 className="font-display text-base font-semibold text-ink">{title}</h2>}
          {action}
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
}
