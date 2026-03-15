/**
 * Runtime environment helpers.
 * On the client the API origin is derived from the current hostname
 * (slug.example.com → api.example.com) so the same Docker image works
 * on any domain without a rebuild.
 * On the server (SSR) we fall back to the `VITE_API_URL` env var.
 */
export function getApiUrl(): string {
  if (typeof window !== "undefined") {
    // Allow override via env (dev/e2e use localhost without subdomains)
    if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL
    const parts = window.location.hostname.split(".")
    parts[0] = "api"
    return `${window.location.protocol}//${parts.join(".")}`
  }
  return process.env.VITE_API_URL ?? "http://api.puckhub.localhost"
}

/** Admin portal runs on the admin subdomain. */
export function getAdminUrl(): string {
  if (typeof window !== "undefined") {
    const parts = window.location.hostname.split(".")
    parts[0] = "admin"
    return `${window.location.protocol}//${parts.join(".")}`
  }
  return process.env.VITE_BASE_DOMAIN
    ? `http://admin.${process.env.VITE_BASE_DOMAIN}`
    : "http://admin.puckhub.localhost"
}

/** Marketing site runs on the bare domain (strip the league slug subdomain). */
export function getMarketingUrl(): string {
  if (typeof window !== "undefined") {
    const parts = window.location.hostname.split(".")
    parts.shift()
    return `${window.location.protocol}//${parts.join(".")}`
  }
  return process.env.VITE_BASE_DOMAIN ? `http://${process.env.VITE_BASE_DOMAIN}` : "http://puckhub.localhost"
}
