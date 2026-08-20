import type { Transporter } from "nodemailer"

/**
 * Which sender identity an email goes out as.
 * - `auth`    — sign-in links and invitations (login@puckhub.eu)
 * - `noreply` — everything else: contact form, OTP codes, admin notifications (no-reply@puckhub.eu)
 */
export type Mailbox = "auth" | "noreply"

type MailboxConfig = {
  host: string
  port: number
  user: string
  pass: string
  from: string
}

const ENV_PREFIX: Record<Mailbox, string> = {
  auth: "EMAIL_AUTH",
  noreply: "EMAIL_NOREPLY",
}

const FALLBACK_FROM: Record<Mailbox, string> = {
  auth: "PuckHub <login@puckhub.eu>",
  noreply: "PuckHub <no-reply@puckhub.eu>",
}

const transporters = new Map<Mailbox, Transporter>()

function env(name: string): string | undefined {
  const value = process.env[name]?.trim()
  return value ? value : undefined
}

/**
 * Resolve the SMTP settings for one mailbox. Mailbox-specific vars win; the
 * unprefixed `EMAIL_SMTP_*` / `EMAIL_FROM` vars act as a shared fallback so a
 * single-account setup keeps working. Returns null when SMTP is not configured.
 */
export function resolveMailboxConfig(mailbox: Mailbox): MailboxConfig | null {
  const prefix = ENV_PREFIX[mailbox]

  const host = env(`${prefix}_SMTP_HOST`) ?? env("EMAIL_SMTP_HOST")
  const user = env(`${prefix}_SMTP_USER`) ?? env("EMAIL_SMTP_USER")
  const pass = env(`${prefix}_SMTP_PASS`) ?? env("EMAIL_SMTP_PASS")
  if (!host || !user || !pass) return null

  const port = Number(env(`${prefix}_SMTP_PORT`) ?? env("EMAIL_SMTP_PORT") ?? "587")

  // Prefer an explicit From, then the authenticated address (keeps SPF/DMARC aligned),
  // then the shared EMAIL_FROM, then a hardcoded default.
  const from =
    env(`${prefix}_FROM`) ??
    (user.includes("@") ? `PuckHub <${user}>` : undefined) ??
    env("EMAIL_FROM") ??
    FALLBACK_FROM[mailbox]

  return { host, port, user, pass, from }
}

async function getTransporter(mailbox: Mailbox, config: MailboxConfig): Promise<Transporter> {
  const cached = transporters.get(mailbox)
  if (cached) return cached

  const nodemailer = await import("nodemailer")
  const secure = config.port === 465
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure,
    // Anything other than implicit TLS must upgrade via STARTTLS — never send credentials in the clear.
    requireTLS: !secure,
    auth: { user: config.user, pass: config.pass },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  })

  console.log(`[Email] SMTP transport ready for "${mailbox}" — ${config.user}@${config.host}:${config.port}`)
  transporters.set(mailbox, transporter)
  return transporter
}

/**
 * Legacy HTTP relay (a PHP endpoint on a third-party host). Only used when no SMTP
 * host is configured; it rewrites the envelope sender, which produces the
 * "on behalf of" notice in most clients. Prefer SMTP.
 */
async function sendViaRelay(from: string, to: string, subject: string, html: string, replyTo?: string) {
  const baseUrl = process.env.EMAIL_RELAY_URL
  const secret = process.env.EMAIL_RELAY_SECRET
  if (!baseUrl || !secret) throw new Error("EMAIL_RELAY_URL and EMAIL_RELAY_SECRET must be set")

  // Pass secret as query param — nginx/Apache proxies strip Authorization headers
  const url = new URL(baseUrl)
  url.searchParams.set("token", secret)

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ from, to, subject, html, replyTo }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Email relay ${res.status}: ${body}`)
  }
}

export async function sendEmail({
  to,
  subject,
  html,
  mailbox = "noreply",
  replyTo,
}: {
  to: string
  subject: string
  html: string
  mailbox?: Mailbox
  replyTo?: string
}) {
  // Always log the link for debugging
  const linkMatch = html.match(/href="([^"]+)"/)
  if (linkMatch) {
    console.log(`[Email] Link: ${linkMatch[1]}`)
  }

  const config = resolveMailboxConfig(mailbox)
  const relayUrl = process.env.EMAIL_RELAY_URL

  if (!config && !relayUrl) {
    console.log(`[Email] No transport configured for "${mailbox}" — To: ${to} | Subject: ${subject}`)
    return
  }

  const from = config?.from ?? process.env.EMAIL_FROM ?? FALLBACK_FROM[mailbox]

  try {
    if (config) {
      const transporter = await getTransporter(mailbox, config)
      await transporter.sendMail({ from, to, subject, html, replyTo })
    } else {
      await sendViaRelay(from, to, subject, html, replyTo)
    }
    console.log(`[Email] Sent to ${to} as ${from} via ${config ? "SMTP" : "relay"}`)
  } catch (err) {
    transporters.delete(mailbox)
    console.error(`[Email] Failed to send to ${to} via "${mailbox}":`, err instanceof Error ? err.message : err)
    throw new Error("EMAIL_SEND_FAILED")
  }
}
