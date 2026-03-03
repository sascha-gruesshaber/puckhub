export interface ThemeColors {
  primary: string
  secondary: string
  accent: string
  background: string
  text: string
  headerBg: string
  headerText: string
  footerBg: string
  footerText: string
}

export interface LayoutConfig {
  home?: {
    sections?: Array<{
      id: string
      visible?: boolean
      variant?: string
    }>
  }
}

export interface ThemePreset {
  name: string
  colors: ThemeColors
  layout: LayoutConfig
}

export const presets: Record<string, ThemePreset> = {
  classic: {
    name: "Classic",
    colors: {
      primary: "220 70% 50%",
      secondary: "220 13% 46%",
      accent: "38 92% 50%",
      background: "0 0% 98%",
      text: "220 20% 15%",
      headerBg: "220 70% 15%",
      headerText: "0 0% 98%",
      footerBg: "220 20% 12%",
      footerText: "220 10% 75%",
    },
    layout: {
      home: {
        sections: [
          { id: "hero", visible: true, variant: "banner" },
          { id: "results", visible: true },
          { id: "upcoming", visible: true },
          { id: "news", visible: true },
          { id: "standings", visible: true },
          { id: "sponsors", visible: true },
        ],
      },
    },
  },
  modern: {
    name: "Modern",
    colors: {
      primary: "262 83% 58%",
      secondary: "220 13% 46%",
      accent: "142 76% 36%",
      background: "0 0% 100%",
      text: "220 20% 10%",
      headerBg: "0 0% 100%",
      headerText: "220 20% 10%",
      footerBg: "220 20% 8%",
      footerText: "220 10% 70%",
    },
    layout: {
      home: {
        sections: [
          { id: "hero", visible: true, variant: "split" },
          { id: "results", visible: true },
          { id: "upcoming", visible: true },
          { id: "standings", visible: true },
          { id: "news", visible: true },
          { id: "sponsors", visible: true },
        ],
      },
    },
  },
  bold: {
    name: "Bold",
    colors: {
      primary: "0 84% 60%",
      secondary: "220 9% 46%",
      accent: "48 96% 53%",
      background: "220 20% 8%",
      text: "0 0% 95%",
      headerBg: "220 20% 5%",
      headerText: "0 0% 98%",
      footerBg: "220 20% 4%",
      footerText: "220 10% 60%",
    },
    layout: {
      home: {
        sections: [
          { id: "hero", visible: true, variant: "minimal" },
          { id: "results", visible: true },
          { id: "standings", visible: true },
          { id: "upcoming", visible: true },
          { id: "news", visible: true },
          { id: "sponsors", visible: true },
        ],
      },
    },
  },
}

export interface WebsiteConfig {
  templatePreset: string
  colorPrimary?: string | null
  colorSecondary?: string | null
  colorAccent?: string | null
  colorBackground?: string | null
  colorText?: string | null
  colorHeaderBg?: string | null
  colorHeaderText?: string | null
  colorFooterBg?: string | null
  colorFooterText?: string | null
  layoutConfig?: LayoutConfig | null
}

export function resolveTheme(config: WebsiteConfig): { colors: ThemeColors; layout: LayoutConfig } {
  const preset = presets[config.templatePreset] ?? presets.classic!

  const colors: ThemeColors = {
    primary: config.colorPrimary ?? preset.colors.primary,
    secondary: config.colorSecondary ?? preset.colors.secondary,
    accent: config.colorAccent ?? preset.colors.accent,
    background: config.colorBackground ?? preset.colors.background,
    text: config.colorText ?? preset.colors.text,
    headerBg: config.colorHeaderBg ?? preset.colors.headerBg,
    headerText: config.colorHeaderText ?? preset.colors.headerText,
    footerBg: config.colorFooterBg ?? preset.colors.footerBg,
    footerText: config.colorFooterText ?? preset.colors.footerText,
  }

  const layout: LayoutConfig = (config.layoutConfig as LayoutConfig) ?? preset.layout

  return { colors, layout }
}

export function generateCssVariables(colors: ThemeColors): string {
  return `:root {
  --league-primary: ${colors.primary};
  --league-secondary: ${colors.secondary};
  --league-accent: ${colors.accent};
  --league-bg: ${colors.background};
  --league-text: ${colors.text};
  --league-header-bg: ${colors.headerBg};
  --league-header-text: ${colors.headerText};
  --league-footer-bg: ${colors.footerBg};
  --league-footer-text: ${colors.footerText};
}`
}

export function getHomeSections(layout: LayoutConfig) {
  return (
    layout.home?.sections?.filter((s) => s.visible !== false) ?? [
      { id: "hero", visible: true, variant: "banner" },
      { id: "results", visible: true },
      { id: "upcoming", visible: true },
      { id: "news", visible: true },
      { id: "standings", visible: true },
      { id: "sponsors", visible: true },
    ]
  )
}
