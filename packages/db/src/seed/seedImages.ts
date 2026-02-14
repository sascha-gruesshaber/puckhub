import { randomUUID } from "node:crypto"
import { mkdir, rm, writeFile } from "node:fs/promises"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import sharp from "sharp"

const seedDir = dirname(fileURLToPath(import.meta.url))
const UPLOADS_DIR = resolve(seedDir, "../../../../uploads")
const API_BASE_URL = process.env.AUTH_URL || `http://localhost:${process.env.API_PORT || "3001"}`

// ---------------------------------------------------------------------------
// File I/O helpers
// ---------------------------------------------------------------------------

async function writePng(folder: "logos" | "photos", svg: string, width: number, height: number): Promise<string> {
  const dir = join(UPLOADS_DIR, folder)
  await mkdir(dir, { recursive: true })
  const filename = `${randomUUID()}.png`
  const pngBuffer = await sharp(Buffer.from(svg)).resize(width, height).png().toBuffer()
  await writeFile(join(dir, filename), pngBuffer)
  return `${API_BASE_URL}/api/uploads/${folder}/${filename}`
}

/** Remove existing seed images before re-generating */
export async function cleanUploads(): Promise<void> {
  for (const folder of ["logos", "photos"]) {
    const dir = join(UPLOADS_DIR, folder)
    await rm(dir, { recursive: true, force: true })
    await mkdir(dir, { recursive: true })
  }
}

// ---------------------------------------------------------------------------
// Color utilities
// ---------------------------------------------------------------------------

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "")
  return [parseInt(h.substring(0, 2), 16), parseInt(h.substring(2, 4), 16), parseInt(h.substring(4, 6), 16)]
}

function rgbToHex(r: number, g: number, b: number): string {
  return (
    "#" +
    [r, g, b]
      .map((v) =>
        Math.max(0, Math.min(255, Math.round(v)))
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")
  )
}

function darken(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex)
  return rgbToHex(r * (1 - amount), g * (1 - amount), b * (1 - amount))
}

function lighten(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex)
  return rgbToHex(r + (255 - r) * amount, g + (255 - g) * amount, b + (255 - b) * amount)
}

// ---------------------------------------------------------------------------
// Team logo — shield badge with crossed sticks + short name
// ---------------------------------------------------------------------------

function generateTeamLogoSvg(shortName: string, primaryColor: string, secondaryColor: string): string {
  const darkPrimary = darken(primaryColor, 0.3)

  return `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="480" viewBox="0 0 400 480">
  <defs>
    <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${primaryColor}"/>
      <stop offset="100%" stop-color="${darkPrimary}"/>
    </linearGradient>
  </defs>
  <path d="M200 10 L380 80 L380 260 Q380 400 200 470 Q20 400 20 260 L20 80 Z"
        fill="url(#sg)" stroke="${secondaryColor}" stroke-width="6"/>
  <path d="M200 30 L360 92 L360 256 Q360 384 200 448 Q40 384 40 256 L40 92 Z"
        fill="none" stroke="${secondaryColor}" stroke-width="2" opacity="0.4"/>
  <g opacity="0.12" transform="translate(200,180)">
    <line x1="-70" y1="70" x2="70" y2="-70" stroke="${secondaryColor}" stroke-width="14" stroke-linecap="round"/>
    <line x1="70" y1="70" x2="-70" y2="-70" stroke="${secondaryColor}" stroke-width="14" stroke-linecap="round"/>
    <circle cx="0" cy="0" r="14" fill="${secondaryColor}"/>
  </g>
  <text x="200" y="280" text-anchor="middle" dominant-baseline="central"
        font-family="Arial Black, Arial, sans-serif" font-weight="900" font-size="96"
        fill="${secondaryColor}" letter-spacing="6">${escapeXml(shortName)}</text>
</svg>`
}

// ---------------------------------------------------------------------------
// Player avatar — circle with initials, jersey number, shoulder silhouette
// ---------------------------------------------------------------------------

function generatePlayerAvatarSvg(
  firstName: string,
  lastName: string,
  jerseyNumber: number,
  teamPrimaryColor: string,
  teamSecondaryColor: string,
  position: "forward" | "defense" | "goalie",
): string {
  const bgColor =
    position === "goalie"
      ? lighten(teamPrimaryColor, 0.1)
      : position === "defense"
        ? darken(teamPrimaryColor, 0.1)
        : teamPrimaryColor

  const initials = `${firstName[0]}${lastName[0]}`

  return `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
  <defs>
    <radialGradient id="abg" cx="50%" cy="40%" r="60%">
      <stop offset="0%" stop-color="${lighten(bgColor, 0.15)}"/>
      <stop offset="100%" stop-color="${darken(bgColor, 0.25)}"/>
    </radialGradient>
    <clipPath id="circ"><circle cx="200" cy="200" r="190"/></clipPath>
  </defs>
  <circle cx="200" cy="200" r="195" fill="${darken(bgColor, 0.35)}"/>
  <circle cx="200" cy="200" r="190" fill="url(#abg)"/>
  <g clip-path="url(#circ)" opacity="0.07">
    <rect x="170" y="0" width="60" height="400" fill="${teamSecondaryColor}"/>
  </g>
  <g clip-path="url(#circ)">
    <ellipse cx="200" cy="420" rx="160" ry="120" fill="${darken(bgColor, 0.3)}"/>
  </g>
  <text x="200" y="195" text-anchor="middle" dominant-baseline="central"
        font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="120"
        fill="${teamSecondaryColor}" opacity="0.9">${escapeXml(initials)}</text>
  <text x="200" y="355" text-anchor="middle" dominant-baseline="central"
        font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="30"
        fill="${teamSecondaryColor}" opacity="0.5">#${jerseyNumber}</text>
</svg>`
}

// ---------------------------------------------------------------------------
// Sponsor logo — corporate badge with initials + full name
// ---------------------------------------------------------------------------

const SPONSOR_PALETTES = [
  { primary: "#1a5276", secondary: "#d4e6f1", accent: "#2e86c1" },
  { primary: "#7b241c", secondary: "#f2d7d5", accent: "#cb4335" },
  { primary: "#1e8449", secondary: "#d5f5e3", accent: "#27ae60" },
  { primary: "#6c3483", secondary: "#ebdef0", accent: "#8e44ad" },
  { primary: "#515a5a", secondary: "#eaeded", accent: "#839192" },
]

function generateSponsorLogoSvg(name: string, colorIndex: number): string {
  const pal = SPONSOR_PALETTES[colorIndex % SPONSOR_PALETTES.length]!

  const words = name.split(/\s+/)
  const initials =
    words.length >= 2
      ? words
          .slice(0, 2)
          .map((w) => w[0]?.toUpperCase())
          .join("")
      : name.substring(0, 2).toUpperCase()

  const displayName = name.length > 24 ? `${name.substring(0, 22)}\u2026` : name

  return `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="200" viewBox="0 0 600 200">
  <defs>
    <linearGradient id="sbg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${pal.primary}"/>
      <stop offset="100%" stop-color="${darken(pal.primary, 0.25)}"/>
    </linearGradient>
  </defs>
  <rect width="600" height="200" rx="16" fill="url(#sbg)"/>
  <rect width="10" height="200" rx="5" fill="${pal.accent}"/>
  <circle cx="100" cy="100" r="50" fill="${pal.accent}" opacity="0.3"/>
  <text x="100" y="100" text-anchor="middle" dominant-baseline="central"
        font-family="Arial Black, Arial, sans-serif" font-weight="900" font-size="40"
        fill="${pal.secondary}">${escapeXml(initials)}</text>
  <text x="180" y="105" dominant-baseline="central"
        font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="34"
        fill="${pal.secondary}">${escapeXml(displayName)}</text>
</svg>`
}

// ---------------------------------------------------------------------------
// XML safety
// ---------------------------------------------------------------------------

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}

// ---------------------------------------------------------------------------
// Public API — generate all seed images as PNGs and return URL arrays
// ---------------------------------------------------------------------------

export async function generateSeedImages(params: {
  teams: Array<{ shortName: string; primaryColor: string; secondaryColor: string }>
  players: Array<{
    firstName: string
    lastName: string
    jerseyNumber: number
    teamIdx: number
    position: "forward" | "defense" | "goalie"
  }>
  sponsors: Array<{ name: string }>
}): Promise<{
  teamLogoUrls: string[]
  playerPhotoUrls: string[]
  sponsorLogoUrls: string[]
}> {
  console.log("Generating seed images...")

  const teamLogoUrls: string[] = []
  for (const team of params.teams) {
    const svg = generateTeamLogoSvg(team.shortName, team.primaryColor, team.secondaryColor)
    teamLogoUrls.push(await writePng("logos", svg, 400, 480))
  }

  const playerPhotoUrls: string[] = []
  for (const player of params.players) {
    const team = params.teams[player.teamIdx]!
    const svg = generatePlayerAvatarSvg(
      player.firstName,
      player.lastName,
      player.jerseyNumber,
      team.primaryColor,
      team.secondaryColor,
      player.position,
    )
    playerPhotoUrls.push(await writePng("photos", svg, 400, 400))
  }

  const sponsorLogoUrls: string[] = []
  for (let i = 0; i < params.sponsors.length; i++) {
    const svg = generateSponsorLogoSvg(params.sponsors[i]?.name, i)
    sponsorLogoUrls.push(await writePng("logos", svg, 600, 200))
  }

  console.log(
    `  Generated ${teamLogoUrls.length} team logos, ${playerPhotoUrls.length} player avatars, ${sponsorLogoUrls.length} sponsor logos`,
  )

  return { teamLogoUrls, playerPhotoUrls, sponsorLogoUrls }
}
