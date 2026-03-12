/**
 * Runtime environment helpers.
 * On the client the API origin is derived from the current hostname
 * (platform.example.com → api.example.com) so the same Docker image works
 * on any domain without a rebuild.
 * On the server (SSR) we fall back to the `VITE_API_URL` env var.
 */
export function getApiUrl(): string {
  if (typeof window !== "undefined") {
    const parts = window.location.hostname.split(".")
    parts[0] = "api"
    return `${window.location.protocol}//${parts.join(".")}`
  }
  return process.env.VITE_API_URL ?? "http://api.puckhub.localhost"
}

/**
 * Returns the base domain (e.g. "puckhub.gruesshaber.eu") derived from
 * the current hostname by stripping the first subdomain.
 */
export function getBaseDomain(): string {
  if (typeof window !== "undefined") {
    const parts = window.location.hostname.split(".")
    return parts.slice(1).join(".")
  }
  return process.env.BASE_DOMAIN ?? "puckhub.localhost"
}
