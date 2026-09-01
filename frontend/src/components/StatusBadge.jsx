const VARIANTS = {
  negative: "bg-danger/10 text-danger",
  pending: "bg-warning/10 text-warning",
  neutral: "bg-surface-alt text-ink-secondary",
  positive: "bg-success/10 text-success",
  approved: "bg-success/10 text-success",
};

/**
 * Operations-console status chip — same status->tone inference as the old
 * ledger's StatusStamp (rotated ink-stamp mark), just restyled as a colored
 * badge. `variant` overrides the inferred tone: "negative" | "pending" |
 * "neutral" | "positive" | "approved".
 */
export default function StatusBadge({ status, variant }) {
  const label = String(status ?? "").toUpperCase();
  const resolvedVariant =
    variant ??
    (["APPROVED", "PAID", "COMPLETE", "COMPLETED", "PRESENT", "RESOLVED"].includes(label)
      ? "positive"
      : ["REJECTED", "DENIED", "OVERDUE", "ABSENT", "FAILED"].includes(label)
      ? "negative"
      : ["PENDING", "PROCESSING", "OPEN"].includes(label)
      ? "pending"
      : "neutral");

  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium tracking-wide ${VARIANTS[resolvedVariant]}`}
    >
      {label}
    </span>
  );
}
