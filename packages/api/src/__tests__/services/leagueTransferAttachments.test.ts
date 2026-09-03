import * as fs from "node:fs"
import * as os from "node:os"
import * as path from "node:path"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { buildAttachments, writeAttachments } from "../../services/leagueTransfer/attachments"

let uploadDir: string
let previousUploadDir: string | undefined

beforeAll(() => {
  uploadDir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "puckhub-uploads-")))
  previousUploadDir = process.env.UPLOAD_DIR
  process.env.UPLOAD_DIR = uploadDir
})

afterAll(() => {
  if (previousUploadDir === undefined) delete process.env.UPLOAD_DIR
  else process.env.UPLOAD_DIR = previousUploadDir
  fs.rmSync(uploadDir, { recursive: true, force: true })
})

const PIXEL = { data: Buffer.from("payload").toString("base64"), mimeType: "image/png" }

describe("league transfer attachments", () => {
  it("writes an attachment inside the upload directory", async () => {
    await writeAttachments({ "/api/uploads/new-org/logos/a.png": PIXEL }, "old-org", "new-org")

    const written = path.join(uploadDir, "new-org", "logos", "a.png")
    expect(fs.existsSync(written)).toBe(true)
    expect(fs.readFileSync(written, "utf8")).toBe("payload")
  })

  it("refuses to write outside the upload directory", async () => {
    const escapee = path.join(path.dirname(uploadDir), "escaped.txt")
    fs.rmSync(escapee, { force: true })

    await writeAttachments({ "/api/uploads/../escaped.txt": PIXEL }, "old-org", "new-org")

    expect(fs.existsSync(escapee)).toBe(false)
  })

  it("refuses deeper traversal and absolute-looking keys", async () => {
    const escapee = path.join(path.dirname(uploadDir), "deep-escape.txt")
    fs.rmSync(escapee, { force: true })

    await writeAttachments(
      {
        "/api/uploads/org/../../deep-escape.txt": PIXEL,
        "http://host/api/uploads/a/b/../../../deep-escape.txt": PIXEL,
      },
      "old-org",
      "new-org",
    )

    expect(fs.existsSync(escapee)).toBe(false)
  })

  it("does not read a file outside the upload directory during export", async () => {
    const secret = path.join(path.dirname(uploadDir), "secret.txt")
    fs.writeFileSync(secret, "top secret")

    try {
      const { attachments, warnings } = await buildAttachments(["/api/uploads/../secret.txt"])

      expect(attachments).toEqual({})
      expect(warnings).toHaveLength(1)
    } finally {
      fs.rmSync(secret, { force: true })
    }
  })

  it("still resolves ordinary keys during export", async () => {
    const dir = path.join(uploadDir, "org-1", "logos")
    fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(path.join(dir, "b.png"), "bytes")

    const { attachments, warnings } = await buildAttachments(["/api/uploads/org-1/logos/b.png"])

    expect(warnings).toEqual([])
    expect(attachments["/api/uploads/org-1/logos/b.png"]).toEqual({
      data: Buffer.from("bytes").toString("base64"),
      mimeType: "image/png",
    })
  })
})
