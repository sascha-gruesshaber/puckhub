import * as fs from "node:fs"
import * as path from "node:path"

export interface Attachment {
  data: string
  mimeType: string
}

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.resolve(process.cwd(), "../../uploads")

const MIME_MAP: Record<string, string> = {
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".pdf": "application/pdf",
}

function guessMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase()
  return MIME_MAP[ext] ?? "application/octet-stream"
}

// IMAGE_FIELDS defines which model fields contain file/image URLs
export const IMAGE_FIELDS: Record<string, string[]> = {
  team: ["logoUrl", "teamPhotoUrl"],
  player: ["photoUrl"],
  sponsor: ["logoUrl"],
  document: ["fileUrl"],
  websiteConfig: ["logoUrl", "faviconUrl", "ogImageUrl"],
}

// Resolve a URL like /api/uploads/orgId/logo/abc.webp to a filesystem path.
// Handles both relative (/api/uploads/...) and absolute (http://host/api/uploads/...) URLs.
function urlToFilePath(url: string): string | null {
  const match = url.match(/\/api\/uploads\/(.+)$/)
  if (!match) return null
  return path.join(UPLOAD_DIR, match[1]!)
}

// Collect all image URLs from exported records + org
export function collectImageUrls(org: { logo: string | null }, records: Record<string, any[]>): string[] {
  const urls: string[] = []

  if (org.logo) urls.push(org.logo)

  for (const [modelName, fields] of Object.entries(IMAGE_FIELDS)) {
    const items = records[modelName]
    if (!items) continue
    for (const item of items) {
      for (const field of fields) {
        if (item[field]) urls.push(item[field])
      }
    }
  }

  // Extract inline image URLs from news content
  const newsItems = records.news
  if (newsItems) {
    for (const item of newsItems) {
      if (item.content) {
        const matches = item.content.matchAll(/src="(\/api\/uploads\/[^"]+)"/g)
        for (const m of matches) {
          urls.push(m[1]!)
        }
      }
    }
  }

  return [...new Set(urls)]
}

// Read files from disk and encode as base64
export async function buildAttachments(urls: string[]): Promise<{
  attachments: Record<string, Attachment>
  warnings: string[]
}> {
  const attachments: Record<string, Attachment> = {}
  const warnings: string[] = []

  for (const url of urls) {
    const filePath = urlToFilePath(url)
    if (!filePath) {
      warnings.push(`Cannot resolve URL to file path: ${url}`)
      continue
    }

    try {
      const data = await fs.promises.readFile(filePath)
      attachments[url] = {
        data: data.toString("base64"),
        mimeType: guessMimeType(filePath),
      }
    } catch {
      warnings.push(`File not found, skipping: ${url}`)
    }
  }

  return { attachments, warnings }
}

// Write attachments to disk for the new org, rewriting org ID in paths
export async function writeAttachments(
  attachments: Record<string, Attachment>,
  oldOrgId: string,
  newOrgId: string,
): Promise<void> {
  for (const [url, attachment] of Object.entries(attachments)) {
    const newUrl = url.replace(oldOrgId, newOrgId)
    const filePath = urlToFilePath(newUrl)
    if (!filePath) continue

    const dir = path.dirname(filePath)
    await fs.promises.mkdir(dir, { recursive: true })
    await fs.promises.writeFile(filePath, Buffer.from(attachment.data, "base64"))
  }
}

// Rewrite all image URLs in records: replace old org ID with new org ID
export function rewriteUrls(
  records: Record<string, any>[],
  fields: string[],
  oldOrgId: string,
  newOrgId: string,
): Record<string, any>[] {
  return records.map((record) => {
    const updated = { ...record }
    for (const field of fields) {
      if (updated[field] && typeof updated[field] === "string") {
        updated[field] = (updated[field] as string).replace(oldOrgId, newOrgId)
      }
    }
    return updated
  })
}

// Rewrite inline image URLs in news content HTML
export function rewriteNewsContent(content: string, oldOrgId: string, newOrgId: string): string {
  return content.replaceAll(oldOrgId, newOrgId)
}
