import { useCallback, useMemo } from "react"
import { useLocale } from "./locale-context"
import deCommon from "./locales/de-DE/common.json"
import deErrors from "./locales/de-DE/errors.json"
import enCommon from "./locales/en-US/common.json"
import enErrors from "./locales/en-US/errors.json"

type Options = {
  defaultValue?: string
  [key: string]: string | number | undefined
}

// ---------------------------------------------------------------------------
// Singleton translation cache — built once at module load, keyed by locale
// ---------------------------------------------------------------------------

function flattenObject(obj: Record<string, unknown>, prefix: string, map: Map<string, string>) {
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key
    if (typeof value === "string") {
      map.set(path, value)
    } else if (value && typeof value === "object" && !Array.isArray(value)) {
      flattenObject(value as Record<string, unknown>, path, map)
    }
  }
}

function buildMap(json: Record<string, unknown>): Map<string, string> {
  const map = new Map<string, string>()
  flattenObject(json, "", map)
  return map
}

type Locale = "de" | "en" | "raw"
type Namespace = "common" | "errors"

const cache: Record<"de" | "en", Record<Namespace, Map<string, string>>> = {
  de: {
    common: buildMap(deCommon as Record<string, unknown>),
    errors: buildMap(deErrors as Record<string, unknown>),
  },
  en: {
    common: buildMap(enCommon as Record<string, unknown>),
    errors: buildMap(enErrors as Record<string, unknown>),
  },
}

function getMap(locale: string, namespace: Namespace): Map<string, string> {
  const loc: "de" | "en" = locale === "en" ? "en" : "de"
  return cache[loc][namespace]
}

// ---------------------------------------------------------------------------
// Interpolation
// ---------------------------------------------------------------------------

function interpolate(value: string, options?: Options): string {
  if (!options) return value
  return value.replace(/{{\s*([\w.]+)\s*}}/g, (_, token: string) => {
    const replacement = options[token]
    return replacement === undefined ? "" : String(replacement)
  })
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

function normalizeLocaleForApp(locale: string): "de" | "en" | "raw" {
  if (locale === "raw") return "raw"
  return locale.toLowerCase().startsWith("en") ? "en" : "de"
}

export function useTranslation(namespace: "common" | "errors" = "common") {
  const { locale, setLocale } = useLocale()

  const isRaw = locale === "raw"
  const map = getMap(locale, namespace)

  const t = useCallback(
    (key: string, options?: Options): string => {
      if (isRaw) return key
      const value = map.get(key)
      if (value !== undefined) {
        return interpolate(value, options)
      }
      return options?.defaultValue ?? key
    },
    [map, isRaw],
  )

  const i18n = useMemo(
    () => ({
      language: locale,
      changeLanguage: async (nextLocale: string) => {
        setLocale(normalizeLocaleForApp(nextLocale))
      },
    }),
    [locale, setLocale],
  )

  return { t, i18n }
}
