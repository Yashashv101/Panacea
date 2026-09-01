export const inputClass =
  "w-full rounded border border-border bg-surface px-3 py-2 text-sm text-ink outline-none transition-colors duration-150 ease-out placeholder:text-ink-muted focus:border-accent focus:ring-2 focus:ring-accent-soft";

export const labelClass = "text-xs font-medium uppercase tracking-wide text-ink-muted";

export const primaryButtonClass =
  "w-fit rounded bg-accent px-4 py-2 text-sm font-medium text-white transition-colors duration-150 ease-out hover:bg-accent/90 disabled:opacity-50";

export const rowActionClass = "text-xs font-medium text-accent transition-colors duration-150 ease-out hover:underline";

export const dangerActionClass = "text-xs font-medium text-danger transition-colors duration-150 ease-out hover:underline";

// Standard table shell: rounded surface card with a hairline border, used
// with theadRowClass + zebra-striped <tr>s (trClass) inside.
export const tableWrapClass = "overflow-x-auto rounded-lg border border-border bg-surface";

export const theadRowClass =
  "border-b border-border bg-surface-alt text-xs font-medium uppercase tracking-wide text-ink-muted";

export const thClass = "px-4 py-2.5 text-left font-medium";

export const tdClass = "px-4 py-3 text-sm text-ink";

// Zebra striping via surface-alt on even rows, plus a soft accent hover.
export const trClass =
  "border-b border-border last:border-0 even:bg-surface-alt/60 transition-colors duration-150 ease-out hover:bg-accent-soft/50";

export const rowClass =
  "flex items-center justify-between gap-4 border-b border-border py-3 px-3 -mx-3 rounded transition-colors duration-150 ease-out hover:bg-surface-alt";

export const folioClass = "font-mono text-xs text-ink-muted w-6 shrink-0 tabular-nums";

export function sectionCountBadge(count) {
  return `${String(count).padStart(2, "0")}`;
}

export function extractErrorMessage(err, fallback) {
  const status = err.response?.status;
  if (status === 400 && err.response?.data?.errors) {
    return Object.values(err.response.data.errors)[0] ?? fallback;
  }
  if (status === 409 || status === 404) return err.response.data?.message ?? fallback;
  return fallback;
}
