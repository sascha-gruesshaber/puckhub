import { useIntlayer, useLocale } from "react-intlayer"

type Options = {
  defaultValue?: string
  [key: string]: string | number | undefined
}

function getNestedValue(obj: unknown, key: string): unknown {
  return key.split(".").reduce<unknown>((acc, segment) => {
    if (!acc || typeof acc !== "object") {
      return undefined
    }
    return (acc as Record<string, unknown>)[segment]
  }, obj)
}

function resolveNodeToString(value: unknown): string | null {
  if (typeof value === "string") {
    return value
  }

  if (value && (typeof value === "object" || typeof value === "function")) {
    const nested = Reflect.get(value as object, "value")
    if (typeof nested === "string") {
      return nested
    }
  }

  return null
}

function interpolate(value: string, options?: Options): string {
  if (!options) return value
  return value.replace(/{{\s*([\w.]+)\s*}}/g, (_, token: string) => {
    const replacement = options[token]
    return replacement === undefined ? "" : String(replacement)
  })
}

function normalizeToIntlayerLocale(locale: string): "de" | "en" {
  return locale.toLowerCase().startsWith("en") ? "en" : "de"
}

export function useTranslation(namespace: "common" | "errors" = "common") {
  const content = useIntlayer(namespace)
  const { locale, setLocale } = useLocale()

  function t(key: string, options?: Options): string {
    const value = getNestedValue(content, key)
    const resolved = resolveNodeToString(value)
    if (resolved !== null) {
      return interpolate(resolved, options)
    }
    return options?.defaultValue ?? key
  }

  return {
    t,
    i18n: {
      language: locale,
      changeLanguage: async (nextLocale: string) => {
        setLocale(normalizeToIntlayerLocale(nextLocale))
      },
    },
  }
}
