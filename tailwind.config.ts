import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          base:    "var(--bg-base)",
          surface: "var(--bg-surface)",
          elevated:"var(--bg-elevated)",
        },
        accent:  { DEFAULT: "var(--accent)", hover: "var(--accent-hover)" },
        risk: {
          low:     "var(--risk-low)",
          mid:     "var(--risk-mid)",
          high:    "var(--risk-high)",
          extreme: "var(--risk-extreme)",
        },
        route: {
          fast:     "var(--route-fast)",
          safe:     "var(--route-safe)",
          balanced: "var(--route-balanced)",
        },
        border: {
          subtle:  "var(--border-subtle)",
          strong:  "var(--border-strong)",
          accent:  "var(--border-accent)",
        },
        text: {
          primary:   "var(--text-primary)",
          secondary: "var(--text-secondary)",
          tertiary:  "var(--text-tertiary)",
          muted:     "var(--text-muted)",
        },
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },
      borderRadius: {
        xs:  "6px",
        sm:  "10px",
        md:  "14px",
        lg:  "18px",
        xl:  "24px",
        "2xl": "32px",
      },
      boxShadow: {
        sm:   "0 1px 3px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.3)",
        md:   "0 4px 12px rgba(0,0,0,0.5), 0 2px 4px rgba(0,0,0,0.3)",
        lg:   "0 10px 30px rgba(0,0,0,0.6), 0 4px 8px rgba(0,0,0,0.3)",
        glow: "0 0 20px rgba(245,158,11,0.22), 0 0 40px rgba(245,158,11,0.08)",
      },
    },
  },
  plugins: [],
};

export default config;
