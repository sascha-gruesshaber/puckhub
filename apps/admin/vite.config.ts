import { tanstackStart } from "@tanstack/react-start/plugin/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { intlayerPlugin } from "vite-intlayer"
import tsConfigPaths from "vite-tsconfig-paths"

export default defineConfig({
  server: {
    port: 3000,
    strictPort: true,
    host: "0.0.0.0",
  },
  plugins: [
    intlayerPlugin(),
    tsConfigPaths({
      projects: ["./tsconfig.json"],
    }),
    tanstackStart(),
    react(),
  ],
})
