import { randomUUID } from "node:crypto"
import { mkdir, writeFile } from "node:fs/promises"
import { join, resolve } from "node:path"
import { db, type OrgRole } from "@puckhub/db"
import type { Context } from "hono"
import { auth } from "../lib/auth"

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const
const ALLOWED_IMAGE_TYPE_SET = new Set<string>(ALLOWED_IMAGE_TYPES)
const ALLOWED_UPLOAD_ROLES = new Set<OrgRole>(["owner", "admin", "editor", "team_manager"])
const MAX_SIZE = 5 * 1024 * 1024 // 5MB
const UPLOAD_BASE = resolve(process.env.UPLOAD_DIR || "../../uploads")

function getExtensionForMimeType(mimeType: AllowedUploadMimeType): string {
  switch (mimeType) {
    case "image/jpeg":
      return "jpg"
    case "image/png":
      return "png"
    case "image/webp":
      return "webp"
  }
}

type AllowedUploadMimeType = (typeof ALLOWED_IMAGE_TYPES)[number]

export function isAllowedUploadMimeType(mimeType: string): mimeType is AllowedUploadMimeType {
  return ALLOWED_IMAGE_TYPE_SET.has(mimeType)
}

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

/**
 * Identifies the format from the file's own leading bytes. `File.type` is set by the
 * client and is not evidence of anything: an HTML document announced as `image/png`
 * would otherwise be stored under a `.png` name and served back from our own origin.
 * Returns null for anything that is not one of the three accepted bitmap formats.
 */
export function sniffImageMimeType(bytes: Uint8Array): AllowedUploadMimeType | null {
  const buf = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength)

  // JPEG: SOI marker FF D8 FF
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return "image/jpeg"
  }

  // PNG: 8-byte signature
  if (buf.length >= 8 && buf.subarray(0, 8).equals(PNG_MAGIC)) {
    return "image/png"
  }

  // WebP: RIFF container ("RIFF" ....size.... "WEBP")
  if (buf.length >= 12 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") {
    return "image/webp"
  }

  return null
}

export async function canUserUploadToOrganization(userId: string, organizationId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { role: true },
  })

  if (user?.role === "admin") {
    return { allowed: true as const }
  }

  const membership = await db.member.findFirst({
    where: { userId, organizationId },
    select: {
      id: true,
      memberRoles: {
        select: { role: true },
      },
    },
  })

  if (!membership) {
    return {
      allowed: false as const,
      status: 403 as const,
      error: "No organization access",
    }
  }

  const hasUploadRole = membership.memberRoles.some((memberRole) => ALLOWED_UPLOAD_ROLES.has(memberRole.role))
  if (!hasUploadRole) {
    return {
      allowed: false as const,
      status: 403 as const,
      error: "Insufficient permissions",
    }
  }

  return { allowed: true as const }
}

export async function handleUpload(c: Context) {
  // Auth check
  const session = await auth.api.getSession({ headers: c.req.raw.headers })
  if (!session?.user) {
    return c.json({ error: "Unauthorized" }, 401)
  }

  const orgId = (session.session as any)?.activeOrganizationId
  if (!orgId) {
    return c.json({ error: "No organization selected" }, 400)
  }

  const uploadAccess = await canUserUploadToOrganization(session.user.id, orgId)
  if (!uploadAccess.allowed) {
    return c.json({ error: uploadAccess.error }, uploadAccess.status)
  }

  const formData = await c.req.formData()
  const file = formData.get("file")
  const type = formData.get("type") as string

  if (!(file instanceof File)) {
    return c.json({ error: "No file provided" }, 400)
  }

  if (!type || !["logo", "photo"].includes(type)) {
    return c.json({ error: 'Invalid type. Must be "logo" or "photo"' }, 400)
  }

  if (!isAllowedUploadMimeType(file.type)) {
    return c.json({ error: "Invalid file type. Allowed: jpeg, png, webp" }, 400)
  }

  if (file.size > MAX_SIZE) {
    return c.json({ error: "File too large. Max 5MB" }, 400)
  }

  const buffer = Buffer.from(await file.arrayBuffer())

  // The stored extension follows the sniffed format, never the declared one.
  const sniffedType = sniffImageMimeType(buffer)
  if (!sniffedType) {
    return c.json({ error: "Invalid file type. Allowed: jpeg, png, webp" }, 400)
  }
  if (sniffedType !== file.type) {
    return c.json({ error: "File content does not match the declared type" }, 400)
  }

  const folder = type === "logo" ? "logos" : "photos"
  const filename = `${randomUUID()}.${getExtensionForMimeType(sniffedType)}`
  const dir = join(UPLOAD_BASE, orgId, folder)

  await mkdir(dir, { recursive: true })
  await writeFile(join(dir, filename), buffer)

  const url = `/api/uploads/${orgId}/${folder}/${filename}`
  return c.json({ url })
}
