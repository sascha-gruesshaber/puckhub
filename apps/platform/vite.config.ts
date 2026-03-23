import { createRequire } from "node:module"
import tailwindcss from "@tailwindcss/vite"
import { tanstackStart } from "@tanstack/react-start/plugin/vite"
import react from "@vitejs/plugin-react"
import { nitro } from "nitro/vite"
import { defineConfig } from "vite"

const require = createRequire(import.meta.url)

export default defineConfig({
  envDir: "../../",
  base: process.env.VITE_BASE_PATH ?? "/",
  resolve: {
    tsconfigPaths: true,
    alias: {
      tslib: require.resolve("tslib/tslib.es6.mjs"),
    },
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
