import { serveStatic } from "@hono/node-server/serve-static"
import { trpcServer } from "@hono/trpc-server"
import { Hono } from "hono"
import { cors } from "hono/cors"
import { auth } from "./lib/auth"
import { handleCalendarExport } from "./routes/calendar"
import { handleUpload } from "./routes/upload"
import { appRouter } from "./trpc"
import { createContext } from "./trpc/context"

const app = new Hono()

app.use(
  "/api/*",
  cors({
    origin: (origin) => {
      if (!origin) return "http://localhost:3000"
      if (new URL(origin).hostname === "localhost") return origin
      return "http://localhost:3000"
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

// Calendar export
app.get("/api/calendar/export.ics", handleCalendarExport)

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
