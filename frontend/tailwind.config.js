export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Old "registrar's ledger" tokens — retained for pages not yet
        // migrated to the operations-console system (see CLAUDE.md).
        // Do not remove until every page has moved off them.
        paper: "#EFEAE1",
        oxblood: "#6E2A34",
        brass: "#93794F",
        slate: "#49554F",
        card: "#F7F3EA",

        // Operations-console tokens (current design system).
        bg: "#F7F8FA",
        surface: "#FFFFFF",
        "surface-alt": "#F1F3F6",
        border: "#E4E7EC",
        "border-strong": "#D0D5DD",
        // `ink` is intentionally redefined here (was #1E211C under the old
        // ledger system) — this is a deliberate global shift, see CLAUDE.md.
        ink: "#0F1729",
        "ink-secondary": "#475467",
        "ink-muted": "#98A2B3",
        accent: "#2E5CE6",
        "accent-soft": "#EEF2FF",
        success: "#16A34A",
        warning: "#D97706",
        danger: "#DC2626",
      },
      fontFamily: {
        display: ["Fraunces", "serif"],
        sans: ["IBM Plex Sans", "sans-serif"],
        mono: ["IBM Plex Mono", "monospace"],
      },
      borderRadius: {
        DEFAULT: "6px",
      },
      boxShadow: {
        sm: "0 1px 2px 0 rgb(15 23 41 / 0.04), 0 1px 3px 0 rgb(15 23 41 / 0.06)",
      },
      transitionTimingFunction: {
        "out-console": "cubic-bezier(0.16, 1, 0.3, 1)",
      },
    },
  },
  plugins: [],
};
