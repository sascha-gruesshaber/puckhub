import deCommon from "./locales/de-DE/common.json"
import deErrors from "./locales/de-DE/errors.json"
import enCommon from "./locales/en-US/common.json"
import enErrors from "./locales/en-US/errors.json"

export const resources = {
  "de-DE": {
    common: deCommon,
    errors: deErrors,
  },
  "en-US": {
    common: enCommon,
    errors: enErrors,
  },
} as const

export type Locale = keyof typeof resources
export type Namespace = keyof (typeof resources)["de-DE"]

export const supportedLocales: Locale[] = ["de-DE", "en-US"]

export function normalizeLocale(locale: string | null | undefined): Locale | null {
  if (!locale) return null

  const exact = supportedLocales.find((v) => v.toLowerCase() === locale.toLowerCase())
  if (exact) return exact

  if (locale.toLowerCase().startsWith("de")) return "de-DE"
  if (locale.toLowerCase().startsWith("en")) return "en-US"

  return null
}
