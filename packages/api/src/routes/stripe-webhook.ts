import type { Context } from "hono"

/**
 * Stripe webhook handler stub.
 *
 * This handler is prepared for future Stripe integration. When activated:
 * 1. Install `stripe` package
 * 2. Set STRIPE_WEBHOOK_SECRET in .env
 * 3. Verify the webhook signature using stripe.webhooks.constructEvent()
 * 4. Implement the event handlers below
 *
 * Relevant Stripe events:
 * - checkout.session.completed — new subscription created
 * - customer.subscription.updated — plan change, renewal, etc.
 * - customer.subscription.deleted — subscription cancelled
 * - invoice.payment_succeeded — successful payment
 * - invoice.payment_failed — failed payment
 */
export async function handleStripeWebhook(c: Context) {
  // TODO: Verify Stripe signature
  // const sig = c.req.header("stripe-signature")
  // const rawBody = await c.req.text()
  // const event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET!)

  // For now, return 200 to acknowledge receipt
  const body = await c.req.json().catch(() => null)
  const eventType = body?.type as string | undefined

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
