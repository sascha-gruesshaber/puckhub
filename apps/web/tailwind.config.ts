import type { Config } from "tailwindcss"

export default {
  content: ["./src/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["Inter", "system-ui", "sans-serif"],
      },
      colors: {
        "web-primary": "hsl(var(--web-primary) / <alpha-value>)",
        "web-secondary": "hsl(var(--web-secondary) / <alpha-value>)",
        "web-accent": "hsl(var(--web-accent) / <alpha-value>)",
        "web-bg": "hsl(var(--web-bg) / <alpha-value>)",
        "web-text": "hsl(var(--web-text) / <alpha-value>)",
        "web-header-bg": "hsl(var(--web-header-bg) / <alpha-value>)",
        "web-header-text": "hsl(var(--web-header-text) / <alpha-value>)",
        "web-footer-bg": "hsl(var(--web-footer-bg) / <alpha-value>)",
        "web-footer-text": "hsl(var(--web-footer-text) / <alpha-value>)",
      },
    },
  },
  plugins: [],
} satisfies Config
