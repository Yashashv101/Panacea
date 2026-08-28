export const inputClass =
  "border-0 border-b border-brass/40 bg-transparent px-0 py-2 text-sm text-ink outline-none focus:border-oxblood";

export const labelClass = "text-xs font-medium uppercase tracking-wide text-slate";

export const primaryButtonClass =
  "w-fit rounded bg-oxblood px-5 py-2.5 text-sm font-medium text-paper transition-opacity hover:opacity-90 disabled:opacity-50";

export const rowActionClass = "text-xs font-medium uppercase tracking-wide text-slate hover:text-oxblood";

export function extractErrorMessage(err, fallback) {
  const status = err.response?.status;
  if (status === 400 && err.response?.data?.errors) {
    return Object.values(err.response.data.errors)[0] ?? fallback;
  }
  if (status === 409) return err.response.data?.message ?? fallback;
  return fallback;
}
