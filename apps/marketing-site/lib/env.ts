/**
 * Runtime environment helpers for the marketing site.
 * The marketing site runs on the bare domain (puckhub.localhost / puckhub.eu),
 * so subdomain URLs are derived by prepending the subdomain to the hostname
 * (unlike other apps which replace the first subdomain segment).
 */

function getSubdomainUrl(subdomain: string): string {
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname
    return `${window.location.protocol}//${subdomain}.${hostname}`
  }
  return ""
}

export function getApiUrl(): string {
  if (typeof window !== "undefined") {
    return getSubdomainUrl("api")
  }
  return process.env.VITE_API_URL ?? "http://api.puckhub.localhost"
}

export function getAdminUrl(): string {
  if (typeof window !== "undefined") {
    return getSubdomainUrl("admin")
  }
  return process.env.VITE_ADMIN_URL ?? "http://admin.puckhub.localhost"
}

export function getPlatformUrl(): string {
  if (typeof window !== "undefined") {
    return getSubdomainUrl("platform")
  }
  return process.env.VITE_PLATFORM_URL ?? "http://platform.puckhub.localhost"
}
