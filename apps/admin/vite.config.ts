import { createRequire } from "node:module"
import path from "node:path"
import { fileURLToPath } from "node:url"
import tailwindcss from "@tailwindcss/vite"
import { tanstackStart } from "@tanstack/react-start/plugin/vite"
import react from "@vitejs/plugin-react"
import { nitro } from "nitro/vite"
import { defineConfig } from "vite"

const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const shimPath = path.resolve(
  __dirname,
  "../../packages/config/use-sync-external-store-shim.js",
)

export default defineConfig({
  envDir: "../../",
  resolve: {
    tsconfigPaths: true,
    alias: [
      { find: "tslib", replacement: require.resolve("tslib/tslib.es6.mjs") },
      {
        find: /^use-sync-external-store\/shim(\/index\.js)?$/,
        replacement: shimPath,
      },
    ],
  },
  server: {
    port: 3000,
    strictPort: true,
    host: "0.0.0.0",
    allowedHosts: true,
    proxy: {
      "/api/uploads": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
  plugins: [
    tailwindcss(),
    tanstackStart(),
    nitro({ noExternals: true }),
    react(),
  ],
})
