import { useEffect, useRef, useState } from "react";

const TONE_VALUE_CLASS = {
  default: "text-ink",
  success: "text-success",
  warning: "text-warning",
  danger: "text-danger",
};

const TONE_ICON_CLASS = {
  default: "bg-accent-soft text-accent",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  danger: "bg-danger/10 text-danger",
};

/**
 * Counts a numeric value up from 0 to `target` on mount / whenever it
 * changes, easing out over ~800ms. Non-numeric targets (null while
 * loading, etc.) are rendered as-is with no animation.
 */
function useCountUp(target, duration = 800) {
  const [display, setDisplay] = useState(typeof target === "number" ? 0 : target);
  const frameRef = useRef(null);

  useEffect(() => {
    if (typeof target !== "number" || Number.isNaN(target)) {
      setDisplay(target);
      return;
    }

    const start = performance.now();
    const from = 0;

    function tick(now) {
      const elapsed = now - start;
      const progress = Math.min(1, elapsed / duration);
      // ease-out-cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(from + (target - from) * eased);
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick);
      } else {
        setDisplay(target);
      }
    }

    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, duration]);

  return display;
}

/**
 * Standard dashboard summary-number tile: label, value (counts up on
 * mount), optional delta/trend, optional icon. `tone` colors the value and
 * icon chip for semantic emphasis (e.g. "danger" for low attendance).
 */
export default function MetricCard({
  label,
  value,
  formatValue = (v) => v,
  suffix = "",
  icon: Icon,
  delta,
  caption,
  tone = "default",
}) {
  const animated = useCountUp(typeof value === "number" ? value : null);
  const displayValue = typeof value === "number" ? formatValue(animated) : value ?? "—";

  return (
    <div className="rounded-lg border border-border bg-surface p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <span className="text-xs font-medium uppercase tracking-wide text-ink-muted">{label}</span>
        {Icon && (
          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${TONE_ICON_CLASS[tone]}`}>
            <Icon className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
          </span>
        )}
      </div>

      <div className={`mt-3 font-mono text-3xl font-semibold leading-none ${TONE_VALUE_CLASS[tone]}`}>
        {displayValue}
        {suffix}
      </div>

      {(delta || caption) && (
        <div className="mt-2 flex items-center gap-2 text-xs">
          {delta && (
            <span
              className={`font-mono font-medium ${
                delta.direction === "up" ? "text-success" : delta.direction === "down" ? "text-danger" : "text-ink-muted"
              }`}
            >
              {delta.direction === "up" ? "▲" : delta.direction === "down" ? "▼" : "•"} {delta.label}
            </span>
          )}
          {caption && <span className="text-ink-muted">{caption}</span>}
        </div>
      )}
    </div>
  );
}
