/**
 * Convert HSL string (e.g. "220 70% 50%") to hex (e.g. "#2655b3").
 */
export function hslStringToHex(hsl: string): string {
  const parts = hsl.trim().split(/\s+/)
  if (parts.length < 3) return "#000000"

  const h = parseFloat(parts[0]!) / 360
  const s = parseFloat(parts[1]!) / 100
  const l = parseFloat(parts[2]!) / 100

  if (isNaN(h) || isNaN(s) || isNaN(l)) return "#000000"

  let r: number, g: number, b: number

  if (s === 0) {
    r = g = b = l
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    r = hueToRgb(p, q, h + 1 / 3)
    g = hueToRgb(p, q, h)
    b = hueToRgb(p, q, h - 1 / 3)
  }

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

/**
 * Convert hex (e.g. "#2655b3") to HSL string (e.g. "220 70% 50%").
 */
export function hexToHslString(hex: string): string {
  const cleaned = hex.replace("#", "")
  const r = parseInt(cleaned.substring(0, 2), 16) / 255
  const g = parseInt(cleaned.substring(2, 4), 16) / 255
  const b = parseInt(cleaned.substring(4, 6), 16) / 255

  if (isNaN(r) || isNaN(g) || isNaN(b)) return "0 0% 0%"

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2

  let h = 0
  let s = 0

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)

    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6
    else if (max === g) h = ((b - r) / d + 2) / 6
    else h = ((r - g) / d + 4) / 6
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`
}

function hueToRgb(p: number, q: number, t: number): number {
  let tt = t
  if (tt < 0) tt += 1
  if (tt > 1) tt -= 1
  if (tt < 1 / 6) return p + (q - p) * 6 * tt
  if (tt < 1 / 2) return q
  if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6
  return p
}

function toHex(c: number): string {
  const hex = Math.round(c * 255)
    .toString(16)
    .padStart(2, "0")
  return hex
}
