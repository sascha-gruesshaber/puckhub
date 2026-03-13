import { serveStatic } from "@hono/node-server/serve-static"
import { trpcServer } from "@hono/trpc-server"
import { db } from "@puckhub/db"
import { Hono } from "hono"
import { cors } from "hono/cors"
import { auth } from "./lib/auth"
import { handleStripeWebhook } from "./routes/stripe-webhook"
import { handleUpload } from "./routes/upload"
import { appRouter } from "./trpc"
import { createContext } from "./trpc/context"

const app = new Hono()

const trustedOrigins = (process.env.TRUSTED_ORIGINS ?? "http://admin.puckhub.localhost,http://platform.puckhub.localhost").split(",").map((o) => o.trim())

// Public site tRPC routes — allow any origin (read-only, no auth)
app.use(
  "/api/trpc/publicSite.*",
  cors({
    origin: "*",
    credentials: false,
  }),
)

// Authenticated routes — strict origin checking (skip publicSite routes handled above)
app.use("/api/*", async (c, next) => {
  if (c.req.path.startsWith("/api/trpc/publicSite.")) {
    return next()
  }
  return cors({
    origin: (origin) => {
      if (!origin) return trustedOrigins[0]!
      if (trustedOrigins.includes(origin)) return origin
      return trustedOrigins[0]!
    },
    credentials: true,
  })(c, next)
})

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

// Stripe webhook (stub — no auth, raw body needed for signature verification)
app.post("/api/webhooks/stripe", handleStripeWebhook)

// Domain check for Caddy On-Demand TLS
app.get("/api/domain-check", async (c) => {
  const domain = c.req.query("domain")
  if (!domain) return c.text("missing domain", 400)

  const baseDomain = process.env.BASE_DOMAIN ?? "puckhub.eu"
  const suffix = process.env.SUBDOMAIN_SUFFIX ?? `.${baseDomain}`

  // Allow known fixed subdomains and bare domain
  const knownHosts = [baseDomain, `www.${baseDomain}`, `admin.${baseDomain}`, `platform.${baseDomain}`, `api.${baseDomain}`]
  if (knownHosts.includes(domain)) return c.text("ok", 200)

  // Check if it matches an active websiteConfig (by custom domain or org slug)
  let config = await db.websiteConfig.findFirst({
    where: { isActive: true, domain },
    select: { id: true },
  })

  if (!config && domain.endsWith(suffix)) {
    const slug = domain.slice(0, -suffix.length)
    if (slug) {
      config = await db.websiteConfig.findFirst({
        where: { isActive: true, organization: { slug } },
        select: { id: true },
      })
    }
  }

  return config ? c.text("ok", 200) : c.text("not found", 404)
})

// Health check
app.get("/api/health", (c) => {
  return c.json({ status: "ok", timestamp: new Date().toISOString() })
})

export { app }
export type { AppRouter } from "./trpc"
