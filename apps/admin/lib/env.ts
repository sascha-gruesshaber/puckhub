/**
 * Runtime environment helpers.
 * On the client the API origin is derived from the current hostname
 * (admin.example.com → api.example.com) so the same Docker image works
 * on any domain without a rebuild.
 * On the server (SSR) we fall back to the `VITE_API_URL` env var.
 */
export function getApiUrl(): string {
  if (typeof window !== "undefined") {
    // Prefer explicit VITE_API_URL (set in E2E / dev-without-Caddy mode)
    const envUrl = import.meta.env?.VITE_API_URL
    if (envUrl) return envUrl
    // Fall back to hostname derivation (works with Caddy subdomain routing)
    const parts = window.location.hostname.split(".")
    parts[0] = "api"
    return `${window.location.protocol}//${parts.join(".")}`
  }
  return process.env.VITE_API_URL ?? "http://api.puckhub.localhost"
}
