import { createContext, useContext } from "react"
import type { LayoutConfig, ThemeColors } from "./theme"

export interface OrgData {
  id: string
  name: string
  logo: string | null
}

export interface SiteSettings {
  leagueName: string
  leagueShortName: string
  locale: string
  timezone: string
}

export interface SiteConfig {
  organizationId: string
  domain: string | null
  subdomain: string | null
  logoUrl: string | null
  faviconUrl: string | null
  ogImageUrl: string | null
  seoTitle: string | null
  seoDescription: string | null
  templatePreset: string
}

export interface SeasonData {
  id: string
  name: string
}

export interface SiteFeatures {
  advancedStats: boolean
  publicReports: boolean
  publicReportsRequireEmail: boolean
  publicReportsBotDetection: boolean
}

export const OrgContext = createContext<OrgData | null>(null)
export const SettingsContext = createContext<SiteSettings | null>(null)
export const ConfigContext = createContext<SiteConfig | null>(null)
export const ThemeContext = createContext<{ colors: ThemeColors; layout: LayoutConfig } | null>(null)
export const SeasonContext = createContext<{ current: SeasonData | null; all: SeasonData[] }>({
  current: null,
  all: [],
})
export const FeaturesContext = createContext<SiteFeatures>({
  advancedStats: false,
  publicReports: false,
  publicReportsRequireEmail: true,
  publicReportsBotDetection: true,
})

export function useOrg() {
  const ctx = useContext(OrgContext)
  if (!ctx) throw new Error("useOrg must be used within OrgContext")
  return ctx
}

export function useSettings() {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error("useSettings must be used within SettingsContext")
  return ctx
}

export function useSiteConfig() {
  const ctx = useContext(ConfigContext)
  if (!ctx) throw new Error("useSiteConfig must be used within ConfigContext")
  return ctx
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error("useTheme must be used within ThemeContext")
  return ctx
}

export function useSeason() {
  return useContext(SeasonContext)
}

export function useFeatures() {
  return useContext(FeaturesContext)
}
