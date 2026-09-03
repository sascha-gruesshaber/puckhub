import { createHmac, timingSafeEqual } from "node:crypto"
import type { Context } from "hono"

/**
 * Stripe webhook handler stub.
 *
 * The event handlers below are not implemented yet, but the signature check in
 * front of them is: this endpoint is unauthenticated and reachable from the
 * internet, so nothing past this point may run on an unverified body. When the
 * handlers start writing to `OrgSubscription`, the guard is already in place.
 *
 * To activate:
 * 1. Set `STRIPE_WEBHOOK_SECRET` (the `whsec_…` value from the Stripe dashboard)
 * 2. Implement the event handlers below
 *
 * Relevant Stripe events:
 * - checkout.session.completed — new subscription created
 * - customer.subscription.updated — plan change, renewal, etc.
 * - customer.subscription.deleted — subscription cancelled
 * - invoice.payment_succeeded — successful payment
 * - invoice.payment_failed — failed payment
 */

/** Stripe rejects (and we reject) events whose timestamp is older than this. */
const SIGNATURE_TOLERANCE_SECONDS = 5 * 60

interface StripeSignatureHeader {
  timestamp: number
  signatures: string[]
}

/** Parse a `Stripe-Signature` header: `t=1614556800,v1=abc…,v1=def…`. */
export function parseStripeSignatureHeader(header: string): StripeSignatureHeader | null {
  let timestamp: number | null = null
  const signatures: string[] = []

  for (const part of header.split(",")) {
    const [key, value] = part.trim().split("=", 2)
    if (!key || !value) continue
    if (key === "t") {
      const parsed = Number(value)
      if (Number.isInteger(parsed)) timestamp = parsed
    } else if (key === "v1") {
      signatures.push(value)
    }
  }

  if (timestamp === null || signatures.length === 0) return null
  return { timestamp, signatures }
}

function signaturesMatch(expected: string, candidates: string[]): boolean {
  const expectedBuf = Buffer.from(expected, "hex")
  // Compare every candidate rather than short-circuiting, so the work does not
  // depend on which signature matched.
  let matched = false
  for (const candidate of candidates) {
    const candidateBuf = Buffer.from(candidate, "hex")
    if (candidateBuf.length === expectedBuf.length && timingSafeEqual(candidateBuf, expectedBuf)) {
      matched = true
    }
  }
  return matched
}

/**
 * Verify Stripe's `v1` webhook signature over `${timestamp}.${rawBody}`.
 * Implements the same scheme as `stripe.webhooks.constructEvent`, without the SDK.
 */
export function verifyStripeSignature({
  payload,
  header,
  secret,
  nowSeconds = Math.floor(Date.now() / 1000),
  toleranceSeconds = SIGNATURE_TOLERANCE_SECONDS,
}: {
  payload: string
  header: string
  secret: string
  nowSeconds?: number
  toleranceSeconds?: number
}): { valid: true } | { valid: false; reason: string } {
  const parsed = parseStripeSignatureHeader(header)
  if (!parsed) return { valid: false, reason: "malformed signature header" }

  // Replay window: an intercepted body must not stay usable indefinitely.
  if (Math.abs(nowSeconds - parsed.timestamp) > toleranceSeconds) {
    return { valid: false, reason: "timestamp outside tolerance" }
  }

  const expected = createHmac("sha256", secret).update(`${parsed.timestamp}.${payload}`, "utf8").digest("hex")
  if (!signaturesMatch(expected, parsed.signatures)) {
    return { valid: false, reason: "signature mismatch" }
  }

  return { valid: true }
}

export async function handleStripeWebhook(c: Context) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) {
    // Never fall through to the handlers unauthenticated — an unconfigured
    // endpoint is a closed endpoint.
    console.error("[stripe] STRIPE_WEBHOOK_SECRET is not set — rejecting webhook")
    return c.json({ error: "Webhook not configured" }, 503)
  }

  const signature = c.req.header("stripe-signature")
  if (!signature) {
    return c.json({ error: "Missing signature" }, 400)
  }

  // The signature covers the exact bytes Stripe sent, so verify before parsing.
  const rawBody = await c.req.text()
  const verification = verifyStripeSignature({ payload: rawBody, header: signature, secret })
  if (!verification.valid) {
    console.warn(`[stripe] Rejected webhook — ${verification.reason}`)
    return c.json({ error: "Invalid signature" }, 400)
  }

  let body: { type?: unknown } | null = null
  try {
    body = JSON.parse(rawBody)
  } catch {
    return c.json({ error: "Invalid JSON" }, 400)
  }

  const eventType = typeof body?.type === "string" ? body.type : undefined
  if (!eventType) {
    return c.json({ error: "Missing event type" }, 400)
  }

  switch (eventType) {
    case "checkout.session.completed": {
      // TODO: Create or update OrgSubscription
      // - Extract organizationId from metadata
      // - Set stripeCustomerId, stripeSubscriptionId
      // - Update status to "active"
      console.log("[stripe] checkout.session.completed — not yet implemented")
      break
    }

    case "customer.subscription.updated": {
      // TODO: Update subscription status/plan
      // - Find OrgSubscription by stripeSubscriptionId
      // - Update planId if price changed
      // - Update status, currentPeriodStart, currentPeriodEnd
      console.log("[stripe] customer.subscription.updated — not yet implemented")
      break
    }

    case "customer.subscription.deleted": {
      // TODO: Handle cancellation
      // - Find OrgSubscription by stripeSubscriptionId
      // - Set status to "cancelled", set cancelledAt
      // - Optionally downgrade to Free plan
      console.log("[stripe] customer.subscription.deleted — not yet implemented")
      break
    }

    case "invoice.payment_failed": {
      // TODO: Handle failed payment
      // - Find OrgSubscription by stripeSubscriptionId
      // - Set status to "past_due"
      console.log("[stripe] invoice.payment_failed — not yet implemented")
      break
    }

    default: {
      console.log(`[stripe] Unhandled event type: ${eventType}`)
    }
  }

  return c.json({ received: true })
}
