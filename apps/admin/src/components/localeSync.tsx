import { useEffect } from "react"
import { trpc } from "@/trpc"
import { normalizeLocale } from "~/i18n/resources"
import { useTranslation } from "~/i18n/use-translation"

function localeToHtmlLang(locale: string): string {
  if (locale.startsWith("de")) return "de"
  if (locale.startsWith("en")) return "en"
  return "de"
}

export function LocaleSync() {
  const { i18n } = useTranslation("common")
  const { data: settings } = trpc.settings.get.useQuery()
  const { data: preference } = trpc.userPreferences.getMyLocale.useQuery(undefined, {
    retry: false,
  })

  useEffect(() => {
    const resolved = normalizeLocale(preference?.locale) ?? normalizeLocale(settings?.locale) ?? "de-DE"

    const resolvedAppLocale = resolved.startsWith("en") ? "en" : "de"

    if (i18n.language !== resolvedAppLocale) {
      void i18n.changeLanguage(resolved)
    }

    if (typeof document !== "undefined") {
      document.documentElement.lang = localeToHtmlLang(resolvedAppLocale)
    }
  }, [i18n, preference?.locale, settings?.locale])

  return null
}
