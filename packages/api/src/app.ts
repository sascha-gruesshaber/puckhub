import { serveStatic } from "@hono/node-server/serve-static"
import { trpcServer } from "@hono/trpc-server"
import { Hono } from "hono"
import { cors } from "hono/cors"
import { auth } from "./lib/auth"
import { handleUpload } from "./routes/upload"
import { appRouter } from "./trpc"
import { createContext } from "./trpc/context"

const app = new Hono()

const trustedOrigins = (process.env.TRUSTED_ORIGINS ?? "http://localhost:3000,http://localhost:3002,http://localhost:3003").split(",").map((o) => o.trim())

// Public site tRPC routes — allow any origin (read-only, no auth)
app.use(
  "/api/trpc/publicSite.*",
  cors({
    origin: "*",
    credentials: false,
  }),
)

// Authenticated routes — strict origin checking
app.use(
  "/api/*",
  cors({
    origin: (origin) => {
      if (!origin) return trustedOrigins[0]!
      if (trustedOrigins.includes(origin)) return origin
      return trustedOrigins[0]!
    },
    credentials: true,
  }),
)

// Better Auth routes
app.on(["POST", "GET"], "/api/auth/**", (c) => {
  return auth.handler(c.req.raw)
})

// tRPC routes
app.use(
  "/api/trpc/*",
  trpcServer({
    endpoint: "/api/trpc",
    router: appRouter,
    createContext,
  }),
)

// File upload
app.post("/api/upload", handleUpload)

// Serve uploaded files
app.use(
  "/api/uploads/*",
  serveStatic({
    root: process.env.UPLOAD_DIR || "../../uploads",
    rewriteRequestPath: (path) => path.replace("/api/uploads", ""),
  }),
)

// Health check
app.get("/api/health", (c) => {
  return c.json({ status: "ok", timestamp: new Date().toISOString() })
})

export { app }
export type { AppRouter } from "./trpc"
