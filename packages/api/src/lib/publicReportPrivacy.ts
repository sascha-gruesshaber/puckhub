import { createHash } from "node:crypto"

function getHashSecret() {
  return process.env.PUBLIC_REPORT_HASH_SECRET ?? process.env.AUTH_SECRET ?? "dev-secret-change-me"
}

export function normalizePublicReportEmail(email: string) {
  return email.trim().toLowerCase()
}

export function maskPublicReportEmail(email: string) {
  const normalized = normalizePublicReportEmail(email)
  const [localPart, domainPart] = normalized.split("@")
  if (!localPart || !domainPart) return "***"
  const visible = localPart[0] ?? "*"
  return `${visible}***@${domainPart}`
}

function anonymizeIp(ip: string) {
  if (ip.includes(":")) {
    const [address] = ip.split("%")
    const parts = address.split(":").filter(Boolean)
    const prefix = parts.slice(0, 4).join(":")
    return `${prefix || "::"}::`
  }

  const octets = ip.split(".")
  if (octets.length === 4) {
    return `${octets[0]}.${octets[1]}.${octets[2]}.0`
  }

  return ip
}

export function hashPublicReportValue(value: string, organizationId: string) {
  return createHash("sha256")
    .update(`${organizationId}:${getHashSecret()}:${value}`)
    .digest("hex")
}

export function hashPublicReportEmail(email: string, organizationId: string) {
  return hashPublicReportValue(normalizePublicReportEmail(email), organizationId)
}

export function hashPublicReportIp(ip: string | null | undefined, organizationId: string) {
  if (!ip) return null
  return hashPublicReportValue(anonymizeIp(ip), organizationId)
}
