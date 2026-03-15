import { createContext, useContext, useMemo } from "react"
import { translations, type Locale, type Translations } from "./translations"

const LocaleContext = createContext<Locale>("de")

function detectLocale(): Locale {
  if (typeof navigator === "undefined") return "de"
  const lang = navigator.language || (navigator as any).userLanguage || ""
  return lang.startsWith("en") ? "en" : "de"
}

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const locale = useMemo(detectLocale, [])

  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>
}

export function useLocale(): Locale {
  return useContext(LocaleContext)
}

export function useT(): Translations {
  const locale = useLocale()
  return translations[locale]
}
