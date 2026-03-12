/**
 * Runtime environment helpers.
 * On the client the API origin is derived from the current hostname
 * (slug.example.com → api.example.com) so the same Docker image works
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
