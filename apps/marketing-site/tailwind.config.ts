import type { Config } from "tailwindcss"

export default {
  content: ["./src/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Outfit Variable", "system-ui", "sans-serif"],
      },
      colors: {
        brand: {
          navy: "#0c1929",
          "navy-light": "#132237",
          gold: "#f4d35e",
          "gold-dark": "#d4b84e",
          blue: "#38bdf8",
          slate: "#a8b8cc",
        },
      },
    },
  },
  plugins: [],
} satisfies Config
