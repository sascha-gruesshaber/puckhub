import tailwindcss from "@tailwindcss/vite"
import { tanstackStart } from "@tanstack/react-start/plugin/vite"
import react from "@vitejs/plugin-react"
import { nitro } from "nitro/vite"
import { defineConfig } from "vite"

export default defineConfig({
  envDir: "../../",
  resolve: {
    tsconfigPaths: true,
  },
  server: {
    port: 3004,
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
