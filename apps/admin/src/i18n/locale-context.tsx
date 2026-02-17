import { createContext, useCallback, useContext, useState } from "react"
import type { ReactNode } from "react"

type Locale = "de" | "en" | "raw"

interface LocaleContextValue {
  locale: Locale
  setLocale: (locale: Locale) => void
}

const LocaleContext = createContext<LocaleContextValue>({
  locale: "de",
  setLocale: () => {},
})

function getInitialLocale(): Locale {
  if (typeof import.meta !== "undefined" && import.meta.env?.VITE_LOCALE === "raw") return "raw"
  return "de"
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(getInitialLocale)

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next)
  }, [])

  return <LocaleContext.Provider value={{ locale, setLocale }}>{children}</LocaleContext.Provider>
}

export function useLocale() {
  return useContext(LocaleContext)
}
