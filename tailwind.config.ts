import type { Config } from "tailwindcss";

/**
 * Tailwind config.
 *
 * Accessibility-first design decisions baked in here:
 * - Colors are driven by CSS variables (see globals.css) so that the
 *   high-contrast toggle can swap the entire palette by flipping a class
 *   on <html> without re-rendering React.
 * - The `dyslexic` font family maps to OpenDyslexic, toggled the same way.
 * - We expose a `--font-scale` variable so the user font-size slider
 *   (14px–22px) can scale the whole app via rem.
 */
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Semantic tokens — resolved from CSS variables so themes can swap them.
        bg: "rgb(var(--color-bg) / <alpha-value>)",
        surface: "rgb(var(--color-surface) / <alpha-value>)",
        "surface-alt": "rgb(var(--color-surface-alt) / <alpha-value>)",
        fg: "rgb(var(--color-fg) / <alpha-value>)",
        muted: "rgb(var(--color-muted) / <alpha-value>)",
        primary: "rgb(var(--color-primary) / <alpha-value>)",
        "primary-fg": "rgb(var(--color-primary-fg) / <alpha-value>)",
        accent: "rgb(var(--color-accent) / <alpha-value>)",
        border: "rgb(var(--color-border) / <alpha-value>)",
        success: "rgb(var(--color-success) / <alpha-value>)",
        warning: "rgb(var(--color-warning) / <alpha-value>)",
      },
      fontFamily: {
        // `sans` is the default; `dyslexic` is opt-in via the body class.
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
        dyslexic: ["OpenDyslexic", "Comic Sans MS", "sans-serif"],
      },
      lineHeight: {
        // WCAG: body text line-height >= 1.6
        relaxed: "1.6",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-dot": {
          "0%, 100%": { opacity: "0.3" },
          "50%": { opacity: "1" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.25s ease-out",
        "pulse-dot": "pulse-dot 1.2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
