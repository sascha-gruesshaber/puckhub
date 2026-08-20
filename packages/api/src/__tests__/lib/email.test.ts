import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { resolveMailboxConfig } from "../../lib/email"

const EMAIL_VARS = [
  "EMAIL_SMTP_HOST",
  "EMAIL_SMTP_PORT",
  "EMAIL_SMTP_USER",
  "EMAIL_SMTP_PASS",
  "EMAIL_FROM",
  "EMAIL_AUTH_SMTP_HOST",
  "EMAIL_AUTH_SMTP_PORT",
  "EMAIL_AUTH_SMTP_USER",
  "EMAIL_AUTH_SMTP_PASS",
  "EMAIL_AUTH_FROM",
  "EMAIL_NOREPLY_SMTP_HOST",
  "EMAIL_NOREPLY_SMTP_PORT",
  "EMAIL_NOREPLY_SMTP_USER",
  "EMAIL_NOREPLY_SMTP_PASS",
  "EMAIL_NOREPLY_FROM",
] as const

let saved: Record<string, string | undefined> = {}

beforeEach(() => {
  saved = Object.fromEntries(EMAIL_VARS.map((k) => [k, process.env[k]]))
  for (const k of EMAIL_VARS) delete process.env[k]
})

afterEach(() => {
  for (const [k, v] of Object.entries(saved)) {
    if (v === undefined) delete process.env[k]
    else process.env[k] = v
  }
})

describe("resolveMailboxConfig", () => {
  it("returns null when SMTP is not configured", () => {
    expect(resolveMailboxConfig("auth")).toBeNull()
    expect(resolveMailboxConfig("noreply")).toBeNull()
  })

  it("returns null when the host is set but credentials are missing", () => {
    process.env.EMAIL_SMTP_HOST = "mail.example.com"
    expect(resolveMailboxConfig("auth")).toBeNull()
  })

  it("keeps the two mailboxes on separate credentials over a shared host", () => {
    process.env.EMAIL_SMTP_HOST = "mail.example.com"
    process.env.EMAIL_AUTH_SMTP_USER = "login@puckhub.eu"
    process.env.EMAIL_AUTH_SMTP_PASS = "auth-secret"
    process.env.EMAIL_NOREPLY_SMTP_USER = "no-reply@puckhub.eu"
    process.env.EMAIL_NOREPLY_SMTP_PASS = "noreply-secret"

    expect(resolveMailboxConfig("auth")).toEqual({
      host: "mail.example.com",
      port: 587,
      user: "login@puckhub.eu",
      pass: "auth-secret",
      from: "PuckHub <login@puckhub.eu>",
    })
    expect(resolveMailboxConfig("noreply")).toEqual({
      host: "mail.example.com",
      port: 587,
      user: "no-reply@puckhub.eu",
      pass: "noreply-secret",
      from: "PuckHub <no-reply@puckhub.eu>",
    })
  })

  it("prefers mailbox-specific host, port and From over the shared values", () => {
    process.env.EMAIL_SMTP_HOST = "shared.example.com"
    process.env.EMAIL_SMTP_PORT = "587"
    process.env.EMAIL_SMTP_USER = "shared@puckhub.eu"
    process.env.EMAIL_SMTP_PASS = "shared-secret"
    process.env.EMAIL_FROM = "shared@puckhub.eu"
    process.env.EMAIL_AUTH_SMTP_HOST = "auth.example.com"
    process.env.EMAIL_AUTH_SMTP_PORT = "465"
    process.env.EMAIL_AUTH_SMTP_USER = "login@puckhub.eu"
    process.env.EMAIL_AUTH_SMTP_PASS = "auth-secret"
    process.env.EMAIL_AUTH_FROM = "PuckHub Login <login@puckhub.eu>"

    expect(resolveMailboxConfig("auth")).toEqual({
      host: "auth.example.com",
      port: 465,
      user: "login@puckhub.eu",
      pass: "auth-secret",
      from: "PuckHub Login <login@puckhub.eu>",
    })
  })

  it("falls back to the single-account vars for a mailbox without its own credentials", () => {
    process.env.EMAIL_SMTP_HOST = "mail.example.com"
    process.env.EMAIL_SMTP_USER = "shared@puckhub.eu"
    process.env.EMAIL_SMTP_PASS = "shared-secret"
    process.env.EMAIL_FROM = "PuckHub <shared@puckhub.eu>"
    process.env.EMAIL_AUTH_SMTP_USER = "login@puckhub.eu"
    process.env.EMAIL_AUTH_SMTP_PASS = "auth-secret"

    expect(resolveMailboxConfig("auth")?.user).toBe("login@puckhub.eu")
    expect(resolveMailboxConfig("noreply")).toEqual({
      host: "mail.example.com",
      port: 587,
      user: "shared@puckhub.eu",
      pass: "shared-secret",
      from: "PuckHub <shared@puckhub.eu>",
    })
  })

  it("ignores blank environment values", () => {
    process.env.EMAIL_SMTP_HOST = "mail.example.com"
    process.env.EMAIL_NOREPLY_SMTP_USER = "   "
    process.env.EMAIL_NOREPLY_SMTP_PASS = "noreply-secret"
    expect(resolveMailboxConfig("noreply")).toBeNull()
  })
})
