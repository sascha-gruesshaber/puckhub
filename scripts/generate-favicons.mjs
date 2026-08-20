#!/usr/bin/env node
/**
 * Generates the PuckHub favicons from the master brand logo.
 *
 * Source: assets/brand/puckhub-logo.jpg
 * Targets: apps/{admin,platform,marketing-site}/public/
 *
 * The logo is a neon wireframe puck that fills its frame edge to edge, so it
 * is padded out to a square on the artwork's own near-black rather than
 * cropped — cropping would clip the ellipse and read as broken.
 *
 * Thin neon lines lose their glow when averaged down to 16-48px, so the small
 * sizes get a brightness and saturation lift. Sizes from 180px up keep the
 * artwork untouched.
 *
 * Requires macOS `sips`. Run with: node scripts/generate-favicons.mjs
 */

import { execFileSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import zlib from "node:zlib"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const source = path.join(root, "assets/brand/puckhub-logo.jpg")
const work = fs.mkdtempSync(path.join(process.env.TMPDIR ?? "/tmp", "puckhub-favicons-"))

const targets = ["apps/admin/public", "apps/platform/public", "apps/marketing-site/public"]

/** The artwork's own background, used to pad it out to a square. */
const PAD_COLOR = "030409"
/** Working canvas the icons are downscaled from. */
const CANVAS = 800
/** Applied to sizes small enough that the neon lines would otherwise go muddy. */
const SMALL_BOOST = { brightness: 1.6, saturation: 1.15 }
const BOOST_UP_TO = 48
/** Anything this dark is backdrop, not glow, when keying the mark transparent. */
const BACKGROUND_FLOOR = 16

// ---------------------------------------------------------------------------
// Minimal PNG read/write — enough for the 8-bit RGB/RGBA files sips emits.
// ---------------------------------------------------------------------------

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})

function crc32(buf) {
  let c = 0xffffffff
  for (const byte of buf) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function paeth(a, b, c) {
  const p = a + b - c
  const pa = Math.abs(p - a)
  const pb = Math.abs(p - b)
  const pc = Math.abs(p - c)
  if (pa <= pb && pa <= pc) return a
  return pb <= pc ? b : c
}

function decodePng(buf) {
  let pos = 8 // skip signature
  let header
  const idat = []

  while (pos < buf.length) {
    const length = buf.readUInt32BE(pos)
    const type = buf.toString("ascii", pos + 4, pos + 8)
    const data = buf.subarray(pos + 8, pos + 8 + length)
    if (type === "IHDR") {
      header = {
        width: data.readUInt32BE(0),
        height: data.readUInt32BE(4),
        depth: data[8],
        colorType: data[9],
        interlace: data[12],
      }
    } else if (type === "IDAT") {
      idat.push(data)
    } else if (type === "IEND") {
      break
    }
    pos += 12 + length
  }

  if (!header) throw new Error("PNG has no IHDR")
  if (header.depth !== 8 || header.interlace !== 0 || ![2, 6].includes(header.colorType)) {
    throw new Error(`Unsupported PNG: depth ${header.depth}, colorType ${header.colorType}`)
  }

  const channels = header.colorType === 6 ? 4 : 3
  const stride = header.width * channels
  const raw = zlib.inflateSync(Buffer.concat(idat))
  const pixels = Buffer.alloc(header.height * stride)

  for (let y = 0; y < header.height; y++) {
    const filter = raw[y * (stride + 1)]
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1))
    const out = pixels.subarray(y * stride, (y + 1) * stride)
    const prev = y > 0 ? pixels.subarray((y - 1) * stride, y * stride) : null

    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? out[x - channels] : 0
      const b = prev ? prev[x] : 0
      const c = prev && x >= channels ? prev[x - channels] : 0
      let value = line[x]
      if (filter === 1) value += a
      else if (filter === 2) value += b
      else if (filter === 3) value += (a + b) >> 1
      else if (filter === 4) value += paeth(a, b, c)
      out[x] = value & 0xff
    }
  }

  return { ...header, channels, stride, pixels }
}

function encodePng({ width, height, channels, stride, pixels }) {
  const raw = Buffer.alloc(height * (stride + 1))
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0 // filter: none
    pixels.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride)
  }

  const chunk = (type, data) => {
    const out = Buffer.alloc(12 + data.length)
    out.writeUInt32BE(data.length, 0)
    out.write(type, 4, "ascii")
    data.copy(out, 8)
    out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length)
    return out
  }

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8
  ihdr[9] = channels === 4 ? 6 : 2

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ])
}

/** Brightness then saturation, matching the CSS filter functions of the same name. */
function boost(file, { brightness, saturation }) {
  const img = decodePng(fs.readFileSync(file))
  const [lr, lg, lb] = [0.213, 0.715, 0.072]

  for (let i = 0; i < img.pixels.length; i += img.channels) {
    const r = img.pixels[i] * brightness
    const g = img.pixels[i + 1] * brightness
    const b = img.pixels[i + 2] * brightness
    const values = [
      (lr + saturation * (1 - lr)) * r + (lg - saturation * lg) * g + (lb - saturation * lb) * b,
      (lr - saturation * lr) * r + (lg + saturation * (1 - lg)) * g + (lb - saturation * lb) * b,
      (lr - saturation * lr) * r + (lg - saturation * lg) * g + (lb + saturation * (1 - lb)) * b,
    ]
    for (let c = 0; c < 3; c++) img.pixels[i + c] = Math.max(0, Math.min(255, Math.round(values[c])))
  }

  fs.writeFileSync(file, encodePng(img))
}

/**
 * Turns the near-black backdrop into transparency, for placing the mark on a
 * coloured surface such as the marketing header.
 *
 * The artwork is glow drawn on black, which is exactly what premultiplied
 * alpha looks like — so recovering the colour is a divide by the brightest
 * channel, and that channel is the alpha.
 *
 * That backdrop is not quite black though (it is #030409 plus JPEG noise), so
 * without BACKGROUND_FLOOR every pixel keeps a few percent of alpha and the
 * mark shows up as a faint dark rectangle on a lighter surface.
 */
function keyOutBackground(file) {
  const img = decodePng(fs.readFileSync(file))
  const pixels = Buffer.alloc(img.width * img.height * 4)

  for (let src = 0, dst = 0; src < img.pixels.length; src += img.channels, dst += 4) {
    const [r, g, b] = [img.pixels[src], img.pixels[src + 1], img.pixels[src + 2]]
    const peak = Math.max(r, g, b)
    const alpha = Math.max(0, Math.round(((peak - BACKGROUND_FLOOR) * 255) / (255 - BACKGROUND_FLOOR)))
    // Unpremultiply against the original peak, so the floor only clears the
    // backdrop and does not shift the colour of the glow it keeps.
    pixels[dst] = alpha === 0 ? 0 : Math.min(255, Math.round((r * 255) / peak))
    pixels[dst + 1] = alpha === 0 ? 0 : Math.min(255, Math.round((g * 255) / peak))
    pixels[dst + 2] = alpha === 0 ? 0 : Math.min(255, Math.round((b * 255) / peak))
    pixels[dst + 3] = alpha
  }

  fs.writeFileSync(file, encodePng({ ...img, channels: 4, stride: img.width * 4, pixels }))
}

// ---------------------------------------------------------------------------

/** Pad the source out to a `size`x`size` PNG on the artwork's own background. */
function padToSquare(size, out) {
  execFileSync(
    "sips",
    ["-s", "format", "png", "-p", String(size), String(size), "--padColor", PAD_COLOR, source, "--out", out],
    { stdio: "ignore" },
  )
  return out
}

/** Downscale a PNG to `size`x`size`, lifting the neon where the size demands it. */
function render(input, size, out) {
  execFileSync("sips", ["-z", String(size), String(size), input, "--out", out], { stdio: "ignore" })
  if (size <= BOOST_UP_TO) boost(out, SMALL_BOOST)
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

const canvas = padToSquare(CANVAS, path.join(work, "canvas.png"))

for (const size of [16, 32, 48]) {
  render(canvas, size, path.join(work, `favicon-${size}x${size}.png`))
}
render(canvas, 180, path.join(work, "apple-touch-icon.png"))
const logo512 = render(canvas, 512, path.join(work, "puckhub-logo.png"))

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

// The web-ready logo and the transparent header mark only ship with the
// public marketing site.
const marketing = path.join(root, "apps/marketing-site/public")
fs.copyFileSync(logo512, path.join(marketing, "puckhub-logo.png"))

const mark = render(canvas, 96, path.join(work, "puckhub-mark.png"))
keyOutBackground(mark)
fs.copyFileSync(mark, path.join(marketing, "puckhub-mark.png"))
console.log("apps/marketing-site/public: puckhub-logo.png, puckhub-mark.png")

fs.rmSync(work, { recursive: true, force: true })
