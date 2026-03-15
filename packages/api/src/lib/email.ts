import type { Transporter } from "nodemailer"

let transporter: Transporter | null = null

async function getTransporter(): Promise<Transporter | null> {
  if (transporter) return transporter

  const host = process.env.EMAIL_SMTP_HOST
  const port = Number(process.env.EMAIL_SMTP_PORT || "587")
  const user = process.env.EMAIL_SMTP_USER
  const pass = process.env.EMAIL_SMTP_PASS

  if (!host || !user || !pass) {
    return null
  }

  const nodemailer = await import("nodemailer")
  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  })

  return transporter
}

async function sendViaRelay(from: string, to: string, subject: string, html: string) {
  const baseUrl = process.env.EMAIL_RELAY_URL
  const secret = process.env.EMAIL_RELAY_SECRET
  if (!baseUrl || !secret) throw new Error("EMAIL_RELAY_URL and EMAIL_RELAY_SECRET must be set")

  // Pass secret as query param — nginx/Apache proxies strip Authorization headers
  const url = new URL(baseUrl)
  url.searchParams.set("token", secret)

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ from, to, subject, html }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Email relay ${res.status}: ${body}`)
  }
}

async function sendViaSmtp(from: string, to: string, subject: string, html: string) {
  const t = await getTransporter()
  if (!t) {
    console.log(`[Email] No transport configured — To: ${to} | Subject: ${subject}`)
    return
  }

  await t.sendMail({ from, to, subject, html })
}

export async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
  const from = process.env.EMAIL_FROM || "noreply@puckhub.eu"

  // Always log the link for debugging
  const linkMatch = html.match(/href="([^"]+)"/)
  if (linkMatch) {
    console.log(`[Email] Link: ${linkMatch[1]}`)
  }

  const useRelay = !!process.env.EMAIL_RELAY_URL
  const transport = useRelay ? "relay" : "SMTP"

  try {
    if (useRelay) {
      await sendViaRelay(from, to, subject, html)
    } else {
      await sendViaSmtp(from, to, subject, html)
    }
    console.log(`[Email] Sent to ${to} via ${transport}`)
  } catch (err) {
    transporter = null
    console.error(`[Email] Failed to send to ${to}:`, err instanceof Error ? err.message : err)
    throw new Error("EMAIL_SEND_FAILED")
  }
}
