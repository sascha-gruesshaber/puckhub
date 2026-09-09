import { createHmac } from "node:crypto"
import { describe, expect, it } from "vitest"
import { parseStripeSignatureHeader, verifyStripeSignature } from "../../routes/stripe-webhook"

const SECRET = "whsec_test_secret"
const PAYLOAD = JSON.stringify({ type: "checkout.session.completed", id: "evt_1" })
const NOW = 1_700_000_000

function sign(payload: string, timestamp: number, secret = SECRET): string {
  const digest = createHmac("sha256", secret).update(`${timestamp}.${payload}`, "utf8").digest("hex")
  return `t=${timestamp},v1=${digest}`
}

describe("parseStripeSignatureHeader", () => {
  it("reads the timestamp and every v1 signature", () => {
    const parsed = parseStripeSignatureHeader("t=1700000000,v1=aaa,v1=bbb")
    expect(parsed).toEqual({ timestamp: 1_700_000_000, signatures: ["aaa", "bbb"] })
  })

  it("ignores other schemes and rejects headers without a usable pair", () => {
    expect(parseStripeSignatureHeader("t=1700000000,v0=aaa")).toBeNull()
    expect(parseStripeSignatureHeader("v1=aaa")).toBeNull()
    expect(parseStripeSignatureHeader("")).toBeNull()
    expect(parseStripeSignatureHeader("t=not-a-number,v1=aaa")).toBeNull()
  })
})

describe("verifyStripeSignature", () => {
  it("accepts a correctly signed payload", () => {
    const result = verifyStripeSignature({
      payload: PAYLOAD,
      header: sign(PAYLOAD, NOW),
      secret: SECRET,
      nowSeconds: NOW,
    })
    expect(result).toEqual({ valid: true })
  })

  it("accepts when one of several signatures matches (key rotation)", () => {
    const good = sign(PAYLOAD, NOW).split("v1=")[1]!
    const result = verifyStripeSignature({
      payload: PAYLOAD,
      header: `t=${NOW},v1=${"0".repeat(good.length)},v1=${good}`,
      secret: SECRET,
      nowSeconds: NOW,
    })
    expect(result).toEqual({ valid: true })
  })

  it("rejects a body that was modified after signing", () => {
    const header = sign(PAYLOAD, NOW)
    const result = verifyStripeSignature({
      payload: PAYLOAD.replace("evt_1", "evt_2"),
      header,
      secret: SECRET,
      nowSeconds: NOW,
    })
    expect(result).toEqual({ valid: false, reason: "signature mismatch" })
  })

  it("rejects a signature made with a different secret", () => {
    const result = verifyStripeSignature({
      payload: PAYLOAD,
      header: sign(PAYLOAD, NOW, "whsec_other"),
      secret: SECRET,
      nowSeconds: NOW,
    })
    expect(result).toEqual({ valid: false, reason: "signature mismatch" })
  })

  it("rejects a replayed event outside the tolerance window", () => {
    const result = verifyStripeSignature({
      payload: PAYLOAD,
      header: sign(PAYLOAD, NOW - 3600),
      secret: SECRET,
      nowSeconds: NOW,
    })
    expect(result).toEqual({ valid: false, reason: "timestamp outside tolerance" })
  })

  it("rejects a malformed header", () => {
    const result = verifyStripeSignature({
      payload: PAYLOAD,
      header: "garbage",
      secret: SECRET,
      nowSeconds: NOW,
    })
    expect(result).toEqual({ valid: false, reason: "malformed signature header" })
  })

  it("rejects a signature of the wrong length without throwing", () => {
    const result = verifyStripeSignature({
      payload: PAYLOAD,
      header: `t=${NOW},v1=abcd`,
      secret: SECRET,
      nowSeconds: NOW,
    })
    expect(result).toEqual({ valid: false, reason: "signature mismatch" })
  })
})
