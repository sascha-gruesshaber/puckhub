import { randomUUID } from "node:crypto"
import { mkdir, writeFile } from "node:fs/promises"
import { join, resolve } from "node:path"
import type { Context } from "hono"
import { auth } from "../lib/auth"

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/svg+xml"])
const MAX_SIZE = 5 * 1024 * 1024 // 5MB
const UPLOAD_BASE = resolve(process.env.UPLOAD_DIR || "../../uploads")

export async function handleUpload(c: Context) {
  // Auth check
  const session = await auth.api.getSession({ headers: c.req.raw.headers })
  if (!session?.user) {
    return c.json({ error: "Unauthorized" }, 401)
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

  if (!ALLOWED_TYPES.has(file.type)) {
    return c.json({ error: "Invalid file type. Allowed: jpeg, png, webp, svg" }, 400)
  }

  if (file.size > MAX_SIZE) {
    return c.json({ error: "File too large. Max 5MB" }, 400)
  }

  const ext = file.name.split(".").pop() || "png"
  const folder = type === "logo" ? "logos" : "photos"
  const filename = `${randomUUID()}.${ext}`
  const dir = join(UPLOAD_BASE, folder)

  await mkdir(dir, { recursive: true })
  const buffer = Buffer.from(await file.arrayBuffer())
  await writeFile(join(dir, filename), buffer)

  const url = `/api/uploads/${folder}/${filename}`
  return c.json({ url })
}
