import { tanstackStart } from "@tanstack/react-start/plugin/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import tsConfigPaths from "vite-tsconfig-paths"

export default defineConfig({
  server: {
    port: 3000,
    strictPort: true,
    host: "0.0.0.0",
    proxy: {
      "/api/uploads": {
        target: process.env.VITE_API_URL ?? "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
  plugins: [
    tsConfigPaths({
      projects: ["./tsconfig.json"],
    }),
    tanstackStart(),
    react(),
  ],
})
