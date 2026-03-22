import tailwindcss from "@tailwindcss/vite"
import { tanstackStart } from "@tanstack/react-start/plugin/vite"
import react from "@vitejs/plugin-react"
import { nitro } from "nitro/vite"
import { defineConfig } from "vite"

export default defineConfig({
  envDir: "../../",
  base: process.env.VITE_BASE_PATH ?? "/",
  resolve: {
    tsconfigPaths: true,
  },
  server: {
    port: 3002,
    strictPort: true,
    host: "0.0.0.0",
    allowedHosts: true,
  },
  plugins: [
    tailwindcss(),
    tanstackStart(),
    nitro(),
    react(),
  ],
})
