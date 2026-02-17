import { useEffect } from "react"
import { trpc } from "@/trpc"
import { useLocale } from "~/i18n/locale-context"
import { normalizeLocale } from "~/i18n/resources"

function localeToHtmlLang(locale: string): string {
  if (locale.startsWith("de")) return "de"
  if (locale.startsWith("en")) return "en"
  return "de"
}

function normalizeToAppLocale(locale: string): "de" | "en" {
  return locale.toLowerCase().startsWith("en") ? "en" : "de"
}

export function LocaleSync() {
  const { locale, setLocale } = useLocale()
  const { data: settings } = trpc.settings.get.useQuery()
  const { data: preference } = trpc.userPreferences.getMyLocale.useQuery(undefined, {
    retry: false,
  })

  useEffect(() => {
    // In raw mode (E2E tests), never override the locale
    if (locale === "raw") return

    const resolved = normalizeLocale(preference?.locale) ?? normalizeLocale(settings?.locale) ?? "de-DE"

    const resolvedAppLocale = normalizeToAppLocale(resolved)

    if (locale !== resolvedAppLocale) {
      setLocale(resolvedAppLocale)
    }

    if (typeof document !== "undefined") {
      document.documentElement.lang = localeToHtmlLang(resolvedAppLocale)
    }
  }, [locale, setLocale, preference?.locale, settings?.locale])

  return null
}
