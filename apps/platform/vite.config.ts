import { tanstackStart } from "@tanstack/react-start/plugin/vite"
import react from "@vitejs/plugin-react"
import { nitro } from "nitro/vite"
import { defineConfig } from "vite"
import tsConfigPaths from "vite-tsconfig-paths"

export default defineConfig({
  envDir: "../../",
  base: process.env.VITE_BASE_PATH ?? "/",
  server: {
    port: 3002,
    strictPort: true,
    host: "0.0.0.0",
    allowedHosts: true,
  },
  plugins: [
    tsConfigPaths({
      projects: ["./tsconfig.json"],
    }),
    tanstackStart(),
    nitro(),
    react(),
  ],
})
