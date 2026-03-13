import dns from "node:dns/promises"
import { z } from "zod"
import { orgAdminProcedure, orgProcedure, router } from "../init"

const CNAME_TARGET = process.env.CNAME_TARGET || "sites.puckhub.eu"
const SUBDOMAIN_SUFFIX = process.env.SUBDOMAIN_SUFFIX || ".puckhub.eu"

function cleanDomain(raw: string): string {
  let d = raw.trim().toLowerCase()
  // Strip protocol
  d = d.replace(/^https?:\/\//, "")
  // Strip path/query
  d = d.split("/")[0]!
  // Strip port
  d = d.split(":")[0]!
  // Strip trailing dot
  d = d.replace(/\.$/, "")
  return d
}

export const websiteConfigRouter = router({
  dnsConfig: orgProcedure.query(() => ({
    cnameTarget: CNAME_TARGET,
    subdomainSuffix: SUBDOMAIN_SUFFIX,
  })),

  get: orgProcedure.query(async ({ ctx }) => {
    const row = await ctx.db.websiteConfig.findUnique({
      where: { organizationId: ctx.organizationId },
      include: { organization: { select: { slug: true } } },
    })
    if (!row) return null
    return { ...row, subdomain: row.organization.slug }
  }),

  update: orgAdminProcedure
    .input(
      z.object({
        domain: z
          .string()
          .transform((v) => v.trim().toLowerCase() || null)
          .nullable()
          .optional(),
        isActive: z.boolean().optional(),
        templatePreset: z.string().optional(),
        colorPrimary: z.string().nullable().optional(),
        colorSecondary: z.string().nullable().optional(),
        colorAccent: z.string().nullable().optional(),
        colorBackground: z.string().nullable().optional(),
        colorText: z.string().nullable().optional(),
        colorHeaderBg: z.string().nullable().optional(),
        colorHeaderText: z.string().nullable().optional(),
        colorFooterBg: z.string().nullable().optional(),
        colorFooterText: z.string().nullable().optional(),
        logoUrl: z.string().nullable().optional(),
        faviconUrl: z.string().nullable().optional(),
        ogImageUrl: z.string().nullable().optional(),
        seoTitle: z.string().nullable().optional(),
        seoDescription: z.string().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Clean domain if provided
      const data: Record<string, unknown> = { ...input }
      if (typeof input.domain === "string") {
        data.domain = cleanDomain(input.domain) || null
      }

      const existing = await ctx.db.websiteConfig.findUnique({
        where: { organizationId: ctx.organizationId },
        select: { id: true },
      })

      if (existing) {
        await ctx.db.websiteConfig.update({
          where: { id: existing.id },
          data: { ...data, updatedAt: new Date() },
        })
      } else {
        await ctx.db.websiteConfig.create({
          data: {
            organizationId: ctx.organizationId,
            ...data,
          },
        })
      }

      return { success: true }
    }),

  verifyDns: orgAdminProcedure
    .input(z.object({ domain: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const domain = cleanDomain(input.domain)
      if (!domain) {
        return { status: "error" as const, recordType: null, recordValue: null, message: "Invalid domain" }
      }

      try {
        // Try CNAME first
        try {
          const cnames = await dns.resolveCname(domain)
          if (cnames.length > 0) {
            const value = cnames[0]!
            const isValid = value.replace(/\.$/, "").toLowerCase() === CNAME_TARGET
            if (isValid) {
              // Mark as verified
              await ctx.db.websiteConfig.updateMany({
                where: { organizationId: ctx.organizationId },
                data: { domainVerifiedAt: new Date() },
              })
              return { status: "valid" as const, recordType: "CNAME", recordValue: value, message: "DNS correctly configured" }
            }
            return {
              status: "invalid" as const,
              recordType: "CNAME",
              recordValue: value,
              message: `CNAME points to ${value} instead of ${CNAME_TARGET}`,
            }
          }
        } catch (e: any) {
          // ENODATA / ENOTFOUND for CNAME is expected — fall through to A record
          if (e.code !== "ENODATA" && e.code !== "ENOTFOUND") throw e
        }

        // Try A record
        try {
          const addresses = await dns.resolve4(domain)
          if (addresses.length > 0) {
            return {
              status: "invalid" as const,
              recordType: "A",
              recordValue: addresses.join(", "),
              message: `A record found (${addresses.join(", ")}). Please use a CNAME record pointing to ${CNAME_TARGET} instead.`,
            }
          }
        } catch (e: any) {
          if (e.code !== "ENODATA" && e.code !== "ENOTFOUND") throw e
        }

        return { status: "invalid" as const, recordType: null, recordValue: null, message: "No DNS records found for this domain" }
      } catch (e: any) {
        if (e.code === "ENOTFOUND") {
          return { status: "error" as const, recordType: null, recordValue: null, message: "Domain not found" }
        }
        if (e.code === "ETIMEOUT") {
          return { status: "error" as const, recordType: null, recordValue: null, message: "DNS query timed out" }
        }
        return { status: "error" as const, recordType: null, recordValue: null, message: "DNS query failed" }
      }
    }),
})
