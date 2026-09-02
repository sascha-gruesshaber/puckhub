import { z } from "zod"
import { createAppError } from "../../errors/appError"
import { APP_ERROR_CODES } from "../../errors/codes"
import { sendEmail } from "../../lib/email"
import { consumeOtp, enforceRateLimit, issueOtp } from "../../lib/otp"
import { hashPublicReportIp } from "../../lib/publicReportPrivacy"
import { publicProcedure, router } from "../init"

const OTP_PER_EMAIL_PER_HOUR = 3
const OTP_PER_IP_PER_HOUR = 10

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export const contactFormRouter = router({
  /** Send an OTP code to verify the sender's email address */
  requestOtp: publicProcedure.input(z.object({ email: z.string().email() })).mutation(async ({ ctx, input }) => {
    const email = normalizeEmail(input.email)
    const identifier = `contact-form:${email}`
    const hour = 60 * 60 * 1000

    // Rate limits: per recipient address and per client IP
    await enforceRateLimit(
      ctx.db,
      `contact-form-req:${email}`,
      OTP_PER_EMAIL_PER_HOUR,
      hour,
      APP_ERROR_CODES.CONTACT_RATE_LIMITED,
      "Too many OTP requests. Please try again later.",
    )
    if (ctx.ip) {
      await enforceRateLimit(
        ctx.db,
        `contact-form-ip:${hashPublicReportIp(ctx.ip, "contact-form")}`,
        OTP_PER_IP_PER_HOUR,
        hour,
        APP_ERROR_CODES.CONTACT_RATE_LIMITED,
        "Too many OTP requests. Please try again later.",
      )
    }

    // One valid CSPRNG code per address (10 min TTL); replaces any earlier code
    const code = await issueOtp(ctx.db, identifier)

    // Send email with code
    const { contactOtpEmail } = await import("../../lib/emailTemplates")
    await sendEmail({
      to: email,
      subject: "Your verification code – PuckHub",
      html: contactOtpEmail(code),
    })

    return { success: true }
  }),

  /** Submit the contact form after OTP verification */
  submit: publicProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        email: z.string().email(),
        type: z.enum(["general", "demo", "support"]),
        message: z.string().min(10).max(5000),
        otpCode: z.string().length(6),
        // Bot detection
        _hp: z.string().optional(),
        _ts: z.number().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Honeypot: bots fill hidden fields — silently succeed
      if (input._hp) {
        return { success: true }
      }

      // Timing check: form must be open >= 3 seconds; a missing timestamp is a bot
      if (!input._ts || Date.now() - input._ts < 3000) {
        return { success: true }
      }

      const email = normalizeEmail(input.email)
      const identifier = `contact-form:${email}`

      // Validate and consume the OTP (locks the address after repeated failures)
      const valid = await consumeOtp(ctx.db, {
        identifier,
        code: input.otpCode,
        lockedCode: APP_ERROR_CODES.CONTACT_RATE_LIMITED,
      })
      if (!valid) {
        throw createAppError(
          "BAD_REQUEST",
          APP_ERROR_CODES.CONTACT_INVALID_OTP,
          "Invalid or expired verification code.",
        )
      }

      // Rate limit: max 5 submissions per email per 24h
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
      const recentSubmissions = await ctx.db.verification.count({
        where: {
          identifier: `contact-submitted:${email}`,
          createdAt: { gte: oneDayAgo },
        },
      })
      if (recentSubmissions >= 5) {
        throw createAppError(
          "TOO_MANY_REQUESTS",
          APP_ERROR_CODES.CONTACT_RATE_LIMITED,
          "Too many submissions. Please try again later.",
        )
      }

      // Track submission for rate limiting (reuse verification table)
      await ctx.db.verification.create({
        data: {
          id: crypto.randomUUID(),
          identifier: `contact-submitted:${email}`,
          value: "submitted",
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      })

      // Map type to human-readable label
      const typeLabels: Record<string, string> = {
        general: "General Inquiry",
        demo: "Demo Request",
        support: "Support",
      }

      // Send notification to admin
      const contactEmail = process.env.CONTACT_EMAIL
      if (contactEmail) {
        const { contactNotificationEmail } = await import("../../lib/emailTemplates")
        await sendEmail({
          to: contactEmail,
          subject: `PuckHub Contact: ${typeLabels[input.type] ?? input.type} from ${input.name}`,
          html: contactNotificationEmail({
            name: input.name,
            email,
            type: typeLabels[input.type] ?? input.type,
            message: input.message,
          }),
          // Sent from no-reply@, so point replies at the person who wrote in
          replyTo: email,
        })
      } else {
        console.log(`[Contact] No CONTACT_EMAIL set — Name: ${input.name}, Email: ${email}, Type: ${input.type}`)
        console.log(`[Contact] Message: ${input.message}`)
      }

      return { success: true }
    }),
})
