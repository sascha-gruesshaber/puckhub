import type { Config } from "tailwindcss"
import tailwindAnimate from "tailwindcss-animate"

export default {
  content: ["./src/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}", "../../packages/ui/src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter Variable", "system-ui", "sans-serif"],
        display: ["Inter Variable", "system-ui", "sans-serif"],
      },
      colors: {
        "league-primary": "hsl(var(--league-primary) / <alpha-value>)",
        "league-secondary": "hsl(var(--league-secondary) / <alpha-value>)",
        "league-accent": "hsl(var(--league-accent) / <alpha-value>)",
        "league-bg": "hsl(var(--league-bg) / <alpha-value>)",
        "league-surface": "hsl(var(--league-surface) / <alpha-value>)",
        "league-text": "hsl(var(--league-text) / <alpha-value>)",
        "league-header-bg": "hsl(var(--league-header-bg) / <alpha-value>)",
        "league-header-text": "hsl(var(--league-header-text) / <alpha-value>)",
        "league-footer-bg": "hsl(var(--league-footer-bg) / <alpha-value>)",
        "league-footer-text": "hsl(var(--league-footer-text) / <alpha-value>)",
      },
    },
  },
  plugins: [tailwindAnimate],
} satisfies Config
