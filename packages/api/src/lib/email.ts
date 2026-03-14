import type { Transporter } from "nodemailer"

let transporter: Transporter | null = null

async function getTransporter(): Promise<Transporter | null> {
  if (transporter) return transporter

  const host = process.env.SMTP_HOST
  const port = Number(process.env.SMTP_PORT || "587")
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS

  if (!host || !user || !pass) {
    return null
  }

  const nodemailer = await import("nodemailer")
  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  })

  return transporter
}

export async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || "noreply@puckhub.eu"
  const t = await getTransporter()

  if (!t) {
    // Extract the first link from the HTML for easy console access
    const linkMatch = html.match(/href="([^"]+)"/)
    console.log(`[Email] To: ${to} | Subject: ${subject}`)
    if (linkMatch) {
      console.log(`[Email] Link: ${linkMatch[1]}`)
    }
    return
  }

  await t.sendMail({ from, to, subject, html })
}
