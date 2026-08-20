#!/usr/bin/env node
// Verify the SMTP configuration for each mailbox, and optionally send a test message.
// Usage: pnpm email:test [--send you@example.com] [--mailbox auth|noreply]
//
// Reads the same EMAIL_* variables the API uses (see .env.example); the repo-root
// .env is loaded automatically when present.

import nodemailer from "nodemailer"

const args = process.argv.slice(2)
const flag = (name) => {
  const i = args.indexOf(`--${name}`)
  return i === -1 ? undefined : args[i + 1]
}

const sendTo = flag("send")
const only = flag("mailbox")
const mailboxes = only ? [only] : ["auth", "noreply"]

const PREFIX = { auth: "EMAIL_AUTH", noreply: "EMAIL_NOREPLY" }
const FALLBACK_FROM = { auth: "PuckHub <login@puckhub.eu>", noreply: "PuckHub <no-reply@puckhub.eu>" }

const env = (name) => {
  const value = process.env[name]?.trim()
  return value ? value : undefined
}

function resolve(mailbox) {
  const prefix = PREFIX[mailbox]
  if (!prefix) throw new Error(`Unknown mailbox "${mailbox}" — expected "auth" or "noreply"`)

  const host = env(`${prefix}_SMTP_HOST`) ?? env("EMAIL_SMTP_HOST")
  const user = env(`${prefix}_SMTP_USER`) ?? env("EMAIL_SMTP_USER")
  const pass = env(`${prefix}_SMTP_PASS`) ?? env("EMAIL_SMTP_PASS")
  if (!host || !user || !pass) return null

  const port = Number(env(`${prefix}_SMTP_PORT`) ?? env("EMAIL_SMTP_PORT") ?? "587")
  const from =
    env(`${prefix}_FROM`) ??
    (user.includes("@") ? `PuckHub <${user}>` : undefined) ??
    env("EMAIL_FROM") ??
    FALLBACK_FROM[mailbox]

  return { host, port, user, pass, from }
}

let failed = false

for (const mailbox of mailboxes) {
  const config = resolve(mailbox)
  if (!config) {
    console.error(`✗ ${mailbox}: not configured — set ${PREFIX[mailbox]}_SMTP_USER / _SMTP_PASS and EMAIL_SMTP_HOST`)
    failed = true
    continue
  }

  const secure = config.port === 465
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure,
    requireTLS: !secure,
    auth: { user: config.user, pass: config.pass },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  })

  console.log(`→ ${mailbox}: ${config.user} @ ${config.host}:${config.port} (${secure ? "TLS" : "STARTTLS"})`)

  try {
    await transporter.verify()
    console.log(`  ✓ connection and login OK — From: ${config.from}`)
  } catch (err) {
    console.error(`  ✗ ${err.message}`)
    failed = true
    continue
  }

  if (sendTo) {
    try {
      const info = await transporter.sendMail({
        from: config.from,
        to: sendTo,
        subject: `PuckHub SMTP test (${mailbox})`,
        html: `<p>Test message from the PuckHub <strong>${mailbox}</strong> mailbox.</p>`,
      })
      console.log(`  ✓ sent to ${sendTo} — ${info.messageId}`)
    } catch (err) {
      console.error(`  ✗ send failed: ${err.message}`)
      failed = true
    }
  }

  transporter.close()
}

if (!sendTo && !failed) console.log("\nPass --send you@example.com to also deliver a test message.")
process.exit(failed ? 1 : 0)
