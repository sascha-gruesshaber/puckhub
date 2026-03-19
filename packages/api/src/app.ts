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

const trustedOrigins = (
  process.env.TRUSTED_ORIGINS ?? "http://admin.puckhub.localhost,http://platform.puckhub.localhost"
)
  .split(",")
  .map((o) => o.trim())

// Public site tRPC routes — allow any origin (read-only, no auth)
app.use(
  "/api/trpc/publicSite.*",
  cors({
    origin: "*",
    credentials: false,
  }),
)

// Contact form tRPC routes — allow any origin (public, no auth)
app.use(
  "/api/trpc/contactForm.*",
  cors({
    origin: "*",
    credentials: false,
  }),
)

// Demo login — CORS must be registered before the strict origin check
if (process.env.DEMO_MODE === "true") {
  app.use(
    "/api/demo-login",
    cors({
      origin: (origin) => origin ?? "*",
      credentials: true,
    }),
  )
}

// Authenticated routes — strict origin checking (skip routes with their own CORS above)
app.use("/api/*", async (c, next) => {
  if (c.req.path.startsWith("/api/trpc/publicSite.") || c.req.path.startsWith("/api/trpc/contactForm.")) {
    return next()
  }
  if (process.env.DEMO_MODE === "true" && c.req.path === "/api/demo-login") {
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
app.on(["POST", "GET"], "/api/auth/**", async (c) => {
  const req = c.req.raw
  const url = new URL(req.url)
  const isMagicLinkVerify = url.pathname.endsWith("/magic-link/verify")

  if (isMagicLinkVerify) {
    console.log(
      `[Auth] Magic link verify — token=${url.searchParams.get("token")?.slice(0, 8)}… callbackURL=${url.searchParams.get("callbackURL")}`,
    )
  }

  const res = await auth.handler(req)

  if (isMagicLinkVerify) {
    console.log(`[Auth] Magic link verify response — status=${res.status} location=${res.headers.get("location")}`)
    const setCookies = res.headers.getSetCookie?.() ?? []
    for (const sc of setCookies) {
      // Log cookie name + domain only (not value for security)
      const name = sc.split("=")[0]
      const domain = sc.match(/[Dd]omain=([^;]+)/)?.[1] ?? "(none)"
      console.log(`[Auth]   Set-Cookie: ${name} domain=${domain}`)
    }
  }

  return res
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
  const knownHosts = [
    baseDomain,
    `www.${baseDomain}`,
    `admin.${baseDomain}`,
    `platform.${baseDomain}`,
    `api.${baseDomain}`,
  ]
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

// Demo login — only available when DEMO_MODE=true
if (process.env.DEMO_MODE === "true") {
  app.post("/api/demo-login", async (c) => {
    const { setSignedCookie } = await import("hono/cookie")
    const body = await c.req.json().catch(() => null)
    const email = body?.email
    if (!email || typeof email !== "string") {
      return c.json({ error: "email required" }, 400)
    }

    const user = await db.user.findFirst({
      where: { email, isDemoUser: true },
      select: { id: true },
    })
    if (!user) {
      return c.json({ error: "demo user not found" }, 404)
    }

    // Better Auth uses signed cookies (HMAC with AUTH_SECRET).
    // The raw token is stored in the DB; the signed token goes in the cookie.
    const { generateId } = await import("better-auth")
    const sessionToken = generateId(32)
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    await db.session.create({
      data: {
        id: crypto.randomUUID(),
        token: sessionToken,
        userId: user.id,
        expiresAt,
        ipAddress: c.req.header("x-forwarded-for") ?? null,
        userAgent: c.req.header("user-agent") ?? null,
      },
    })

    const cookieDomain = process.env.COOKIE_DOMAIN ?? "puckhub.localhost"
    const secret = process.env.AUTH_SECRET ?? "dev-secret-change-me"

    // Better Auth adds __Secure- prefix when baseURL is https
    const baseUrl = process.env.BETTER_AUTH_BASE_URL ?? "http://api.puckhub.localhost"
    const isSecure = baseUrl.startsWith("https")
    const cookieName = isSecure
      ? "__Secure-better-auth.session_token"
      : "better-auth.session_token"

    await setSignedCookie(c, cookieName, sessionToken, secret, {
      path: "/",
      domain: cookieDomain,
      httpOnly: true,
      sameSite: "Lax",
      maxAge: 7 * 24 * 60 * 60,
      secure: c.req.url.startsWith("https"),
    })

    return c.json({ ok: true })
  })
}

// Health check
app.get("/api/health", (c) => {
  return c.json({ status: "ok", timestamp: new Date().toISOString() })
})

// Version info
app.get("/api/version", (c) => {
  return c.json({
    app: "api",
    version: process.env.APP_VERSION ?? "dev",
    commit: process.env.APP_COMMIT ?? "unknown",
    branch: process.env.APP_BRANCH ?? "unknown",
    buildDate: process.env.APP_BUILD_DATE ?? "unknown",
  })
})

export type { AppRouter } from "./trpc"
export { app }
