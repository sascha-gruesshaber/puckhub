#!/usr/bin/env node
/**
 * Generates the PuckHub favicons from the master brand logo.
 *
 * Source: assets/brand/puckhub-logo.jpg (1085x1101)
 * Targets: apps/{admin,platform,marketing-site}/public/
 *
 * Two crops are used on purpose:
 *   - "mark" (620x620 centre crop) for 16/32/48px, where the full hexagon
 *     turns to mush and only the gold puck still reads.
 *   - "full" (1040x1040 centre crop) for 180px and up, where the hexagon,
 *     the node icons and the gradient edge are all legible.
 *
 * Requires macOS `sips`. Run with: node scripts/generate-favicons.mjs
 */

import { execFileSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const source = path.join(root, "assets/brand/puckhub-logo.jpg")
const work = fs.mkdtempSync(path.join(process.env.TMPDIR ?? "/tmp", "puckhub-favicons-"))

const targets = ["apps/admin/public", "apps/platform/public", "apps/marketing-site/public"]

/** Centre crop `size`x`size` out of the source and write it as PNG. */
function crop(size, out) {
  execFileSync("sips", ["-s", "format", "png", "-c", String(size), String(size), source, "--out", out], {
    stdio: "ignore",
  })
  return out
}

/** Downscale a PNG to `size`x`size`. */
function resize(input, size, out) {
  execFileSync("sips", ["-z", String(size), String(size), input, "--out", out], { stdio: "ignore" })
  return out
}

/** Pack PNG buffers into a single .ico container (PNG-in-ICO, supported everywhere since IE11). */
function buildIco(pngs) {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0) // reserved
  header.writeUInt16LE(1, 2) // type: icon
  header.writeUInt16LE(pngs.length, 4)

  let offset = 6 + pngs.length * 16
  const entries = pngs.map(({ size, data }) => {
    const entry = Buffer.alloc(16)
    entry.writeUInt8(size >= 256 ? 0 : size, 0) // width
    entry.writeUInt8(size >= 256 ? 0 : size, 1) // height
    entry.writeUInt8(0, 2) // palette size
    entry.writeUInt8(0, 3) // reserved
    entry.writeUInt16LE(1, 4) // colour planes
    entry.writeUInt16LE(32, 6) // bits per pixel
    entry.writeUInt32LE(data.length, 8)
    entry.writeUInt32LE(offset, 12)
    offset += data.length
    return entry
  })

  return Buffer.concat([header, ...entries, ...pngs.map((p) => p.data)])
}

if (!fs.existsSync(source)) {
  console.error(`Missing source logo: ${path.relative(root, source)}`)
  process.exit(1)
}

const markCrop = crop(620, path.join(work, "mark.png"))
const fullCrop = crop(1040, path.join(work, "full.png"))

resize(markCrop, 16, path.join(work, "favicon-16x16.png"))
resize(markCrop, 32, path.join(work, "favicon-32x32.png"))
resize(markCrop, 48, path.join(work, "favicon-48x48.png"))
resize(fullCrop, 180, path.join(work, "apple-touch-icon.png"))
const logo512 = resize(fullCrop, 512, path.join(work, "puckhub-logo.png"))

const ico = buildIco(
  [16, 32, 48].map((size) => ({ size, data: fs.readFileSync(path.join(work, `favicon-${size}x${size}.png`)) })),
)
fs.writeFileSync(path.join(work, "favicon.ico"), ico)

const files = ["favicon.ico", "favicon-16x16.png", "favicon-32x32.png", "apple-touch-icon.png"]

for (const target of targets) {
  const dir = path.join(root, target)
  fs.mkdirSync(dir, { recursive: true })
  for (const file of files) {
    fs.copyFileSync(path.join(work, file), path.join(dir, file))
  }
  console.log(`${target}: ${files.join(", ")}`)
}

// The web-ready logo only ships with the public marketing site.
fs.copyFileSync(logo512, path.join(root, "apps/marketing-site/public/puckhub-logo.png"))
console.log("apps/marketing-site/public: puckhub-logo.png")

fs.rmSync(work, { recursive: true, force: true })
