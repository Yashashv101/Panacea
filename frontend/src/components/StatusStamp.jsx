const VARIANTS = {
  negative: "border-oxblood text-oxblood",
  pending: "border-oxblood text-oxblood",
  neutral: "border-slate text-slate",
  positive: "bg-oxblood border-oxblood text-paper",
  approved: "bg-oxblood border-oxblood text-paper",
};

const ROTATIONS = ["-rotate-2", "rotate-1", "-rotate-1", "rotate-2"];

function rotationFor(label) {
  let hash = 0;
  for (let i = 0; i < label.length; i++) hash = (hash + label.charCodeAt(i)) % ROTATIONS.length;
  return ROTATIONS[hash];
}

/**
 * Renders a status as a small rotated ink-stamp mark rather than a colored pill.
 * `variant` controls tone: "negative" | "pending" | "neutral" | "positive" | "approved".
 * If omitted, tone is inferred from common status strings.
 */
export default function StatusStamp({ status, variant }) {
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
      className={`animate-stamp-in inline-flex items-center justify-center rounded-full border-2 px-3 py-1 font-mono text-[0.65rem] font-medium tracking-wider ${VARIANTS[resolvedVariant]} ${rotationFor(label)}`}
    >
      {label}
    </span>
  );
}
