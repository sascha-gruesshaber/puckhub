import { Button, Card, CardContent, ColorInput, Input, Textarea, toast } from "@puckhub/ui"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import {
  Check,
  CheckCircle,
  Copy,
  ExternalLink,
  Eye,
  Globe,
  Image,
  Loader2,
  Monitor,
  Palette,
  RotateCcw,
  Save,
  Search,
  Smartphone,
  Tablet,
  X,
  XCircle,
} from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { trpc } from "@/trpc"
import { FeatureGate } from "~/components/featureGate"
import { ImageUpload } from "~/components/imageUpload"
import { PageHeader } from "~/components/pageHeader"
import { TabNavigation, type TabGroup } from "~/components/tabNavigation"
import { useOrganization } from "~/contexts/organizationContext"
import { usePermissionGuard } from "~/contexts/permissionsContext"
import { useTranslation } from "~/i18n/use-translation"
import { resolveTranslatedError } from "~/lib/errorI18n"
import { hexToHslString, hslStringToHex } from "~/lib/colorUtils"
import { presets, type ThemeColors } from "../../../../league-site/src/lib/theme"

const WEBSITE_TABS = ["domain", "appearance", "images", "seo"] as const
type WebsiteTab = (typeof WEBSITE_TABS)[number]

export const Route = createFileRoute("/_authed/website")({
  validateSearch: (s: Record<string, unknown>): { tab?: string } => ({
    ...(typeof s.tab === "string" && s.tab ? { tab: s.tab } : {}),
  }),
  loader: ({ context }) => {
    void context.trpcQueryUtils?.websiteConfig.get.ensureData()
  },
  component: WebsitePage,
})

const COLOR_FIELDS = [
  "colorPrimary",
  "colorSecondary",
  "colorAccent",
  "colorBackground",
  "colorText",
  "colorHeaderBg",
  "colorHeaderText",
  "colorFooterBg",
  "colorFooterText",
] as const

type ColorField = (typeof COLOR_FIELDS)[number]

const COLOR_TO_PRESET_KEY: Record<ColorField, keyof ThemeColors> = {
  colorPrimary: "primary",
  colorSecondary: "secondary",
  colorAccent: "accent",
  colorBackground: "background",
  colorText: "text",
  colorHeaderBg: "headerBg",
  colorHeaderText: "headerText",
  colorFooterBg: "footerBg",
  colorFooterText: "footerText",
}

const COLOR_GROUPS: { label: string; fields: ColorField[] }[] = [
  { label: "colorGroupBrand", fields: ["colorPrimary", "colorSecondary", "colorAccent"] },
  { label: "colorGroupPage", fields: ["colorBackground", "colorText"] },
  { label: "colorGroupHeader", fields: ["colorHeaderBg", "colorHeaderText"] },
  { label: "colorGroupFooter", fields: ["colorFooterBg", "colorFooterText"] },
]

const PRESET_DESCRIPTIONS: Record<string, { en: string; de: string }> = {
  classic: { en: "Dark header, clean layout", de: "Dunkler Header, klares Layout" },
  modern: { en: "Light header, purple accent", de: "Heller Header, lila Akzent" },
  bold: { en: "Dark mode, red accent", de: "Dark Mode, roter Akzent" },
}

interface FormState {
  domain: string
  subdomain: string
  isActive: boolean
  templatePreset: string
  colorPrimary: string
  colorSecondary: string
  colorAccent: string
  colorBackground: string
  colorText: string
  colorHeaderBg: string
  colorHeaderText: string
  colorFooterBg: string
  colorFooterText: string
  logoUrl: string | null
  faviconUrl: string | null
  ogImageUrl: string | null
  seoTitle: string
  seoDescription: string
}

const EMPTY_FORM: FormState = {
  domain: "",
  subdomain: "",
  isActive: false,
  templatePreset: "classic",
  colorPrimary: "",
  colorSecondary: "",
  colorAccent: "",
  colorBackground: "",
  colorText: "",
  colorHeaderBg: "",
  colorHeaderText: "",
  colorFooterBg: "",
  colorFooterText: "",
  logoUrl: null,
  faviconUrl: null,
  ogImageUrl: null,
  seoTitle: "",
  seoDescription: "",
}

type DeviceMode = "desktop" | "tablet" | "mobile"

function hslToHex(hsl: string): string {
  if (!hsl) return "#000000"
  return hslStringToHex(hsl)
}

// --- Mini-mockup component for preset cards ---
function ThemePresetMockup({ colors }: { colors: ThemeColors }) {
  const headerBg = hslToHex(colors.headerBg)
  const headerText = hslToHex(colors.headerText)
  const bg = hslToHex(colors.background)
  const text = hslToHex(colors.text)
  const primary = hslToHex(colors.primary)
  const secondary = hslToHex(colors.secondary)
  const accent = hslToHex(colors.accent)
  const footerBg = hslToHex(colors.footerBg)
  const footerText = hslToHex(colors.footerText)

  return (
    <div className="rounded-md overflow-hidden border border-border" style={{ height: 120 }}>
      {/* Header bar */}
      <div
        className="flex items-center gap-1.5 px-2"
        style={{ background: headerBg, height: 24 }}
      >
        <div className="rounded-sm" style={{ width: 8, height: 8, background: headerText, opacity: 0.9 }} />
        <div className="rounded-sm" style={{ width: 20, height: 4, background: headerText, opacity: 0.5 }} />
        <div className="rounded-sm" style={{ width: 16, height: 4, background: headerText, opacity: 0.5 }} />
        <div className="rounded-sm" style={{ width: 18, height: 4, background: headerText, opacity: 0.5 }} />
      </div>
      {/* Body */}
      <div
        className="flex items-center justify-center gap-2 px-3"
        style={{ background: bg, height: 72 }}
      >
        <div className="rounded-sm" style={{ width: 32, height: 6, background: text, opacity: 0.3 }} />
        <div className="rounded-full" style={{ width: 12, height: 12, background: primary }} />
        <div className="rounded-full" style={{ width: 10, height: 10, background: secondary }} />
        <div className="rounded-full" style={{ width: 10, height: 10, background: accent }} />
      </div>
      {/* Footer bar */}
      <div
        className="flex items-center gap-1.5 px-2"
        style={{ background: footerBg, height: 24 }}
      >
        <div className="rounded-sm" style={{ width: 24, height: 4, background: footerText, opacity: 0.5 }} />
        <div className="rounded-sm" style={{ width: 16, height: 4, background: footerText, opacity: 0.5 }} />
      </div>
    </div>
  )
}

// --- Preset card component ---
function PresetCard({
  presetKey,
  selected,
  onClick,
}: {
  presetKey: string
  selected: boolean
  onClick: () => void
}) {
  const preset = presets[presetKey]!
  const desc = PRESET_DESCRIPTIONS[presetKey]

  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative rounded-lg border-2 p-3 text-left transition-all hover:shadow-md ${
        selected ? "border-blue-500 shadow-sm" : "border-border hover:-translate-y-0.5"
      }`}
    >
      {selected && (
        <div className="absolute -top-2 -right-2 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
          <Check className="w-3 h-3 text-white" />
        </div>
      )}
      <ThemePresetMockup colors={preset.colors} />
      <div className="mt-2">
        <p className="text-sm font-medium">{preset.name}</p>
        {desc && <p className="text-[11px] text-muted-foreground">{desc.en}</p>}
      </div>
    </button>
  )
}

// --- Live color preview strip ---
function LiveColorPreview({ form }: { form: FormState }) {
  const headerBg = hslToHex(form.colorHeaderBg)
  const headerText = hslToHex(form.colorHeaderText)
  const bg = hslToHex(form.colorBackground)
  const text = hslToHex(form.colorText)
  const primary = hslToHex(form.colorPrimary)
  const accent = hslToHex(form.colorAccent)
  const footerBg = hslToHex(form.colorFooterBg)
  const footerText = hslToHex(form.colorFooterText)

  return (
    <div className="flex rounded-lg overflow-hidden border border-border" style={{ height: 56 }}>
      {/* Header section */}
      <div
        className="flex items-center justify-center gap-1.5 px-4"
        style={{ background: headerBg, flex: "1 1 0" }}
      >
        <div className="rounded-sm" style={{ width: 10, height: 10, background: headerText, opacity: 0.8 }} />
        <span className="text-[10px] font-medium" style={{ color: headerText }}>Header</span>
      </div>
      {/* Page section */}
      <div
        className="flex items-center justify-center gap-2 px-4"
        style={{ background: bg, flex: "2 1 0" }}
      >
        <span className="text-[10px] font-medium" style={{ color: text }}>Page text</span>
        <div className="rounded-full" style={{ width: 10, height: 10, background: primary }} />
        <div className="rounded-full" style={{ width: 8, height: 8, background: accent }} />
      </div>
      {/* Footer section */}
      <div
        className="flex items-center justify-center gap-1.5 px-4"
        style={{ background: footerBg, flex: "1 1 0" }}
      >
        <span className="text-[10px] font-medium" style={{ color: footerText }}>Footer</span>
      </div>
    </div>
  )
}

function buildWebsiteTabGroups(t: (key: string) => string): TabGroup<WebsiteTab>[] {
  return [
    { key: "domain", tabs: [{ id: "domain", label: t("website.tabs.domain"), icon: Globe }] },
    { key: "appearance", tabs: [{ id: "appearance", label: t("website.tabs.appearance"), icon: Palette }] },
    { key: "images", tabs: [{ id: "images", label: t("website.tabs.images"), icon: Image }] },
    { key: "seo", tabs: [{ id: "seo", label: t("website.tabs.seo"), icon: Search }] },
  ]
}

function WebsitePage() {
  usePermissionGuard("settings")
  const { t } = useTranslation("common")
  const { t: tErrors } = useTranslation("errors")
  const { organization } = useOrganization()
  const { data: config, isLoading } = trpc.websiteConfig.get.useQuery()
  const { data: dnsConfig } = trpc.websiteConfig.dnsConfig.useQuery()
  const utils = trpc.useUtils()
  const navigate = useNavigate({ from: Route.fullPath })
  const { tab: tabParam } = Route.useSearch()

  const activeTab = (tabParam ?? "domain") as WebsiteTab
  const setTab = useCallback(
    (v: WebsiteTab) =>
      navigate({ search: (prev) => ({ ...prev, tab: v === "domain" ? undefined : v }), replace: true }),
    [navigate],
  )

  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [showPreview, setShowPreview] = useState(false)
  const [deviceMode, setDeviceMode] = useState<DeviceMode>("desktop")
  const [dnsResult, setDnsResult] = useState<{
    status: "valid" | "invalid" | "error"
    message: string
  } | null>(null)

  useEffect(() => {
    if (config) {
      setForm({
        domain: config.domain ?? "",
        subdomain: config.subdomain ?? "",
        isActive: config.isActive,
        templatePreset: config.templatePreset,
        colorPrimary: config.colorPrimary ?? "",
        colorSecondary: config.colorSecondary ?? "",
        colorAccent: config.colorAccent ?? "",
        colorBackground: config.colorBackground ?? "",
        colorText: config.colorText ?? "",
        colorHeaderBg: config.colorHeaderBg ?? "",
        colorHeaderText: config.colorHeaderText ?? "",
        colorFooterBg: config.colorFooterBg ?? "",
        colorFooterText: config.colorFooterText ?? "",
        logoUrl: config.logoUrl ?? null,
        faviconUrl: config.faviconUrl ?? null,
        ogImageUrl: config.ogImageUrl ?? null,
        seoTitle: config.seoTitle ?? "",
        seoDescription: config.seoDescription ?? "",
      })
    }
  }, [config])

  const updateMutation = trpc.websiteConfig.update.useMutation({
    onSuccess: () => {
      toast.success(t("website.saved"))
      void utils.websiteConfig.get.invalidate()
    },
    onError: (err) => {
      toast.error(resolveTranslatedError(err, tErrors))
    },
  })

  const dnsVerifyMutation = trpc.websiteConfig.verifyDns.useMutation({
    onSuccess: (result) => {
      setDnsResult({ status: result.status, message: result.message })
      if (result.status === "valid") {
        void utils.websiteConfig.get.invalidate()
      }
    },
    onError: () => {
      setDnsResult({ status: "error", message: t("website.dns.error") })
    },
  })

  function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault()
    updateMutation.mutate({
      domain: form.domain || null,
      isActive: form.isActive,
      templatePreset: form.templatePreset,
      colorPrimary: form.colorPrimary || null,
      colorSecondary: form.colorSecondary || null,
      colorAccent: form.colorAccent || null,
      colorBackground: form.colorBackground || null,
      colorText: form.colorText || null,
      colorHeaderBg: form.colorHeaderBg || null,
      colorHeaderText: form.colorHeaderText || null,
      colorFooterBg: form.colorFooterBg || null,
      colorFooterText: form.colorFooterText || null,
      logoUrl: form.logoUrl,
      faviconUrl: form.faviconUrl,
      ogImageUrl: form.ogImageUrl,
      seoTitle: form.seoTitle || null,
      seoDescription: form.seoDescription || null,
    })
  }

  function handleColorChange(field: ColorField, hex: string) {
    const hsl = hexToHslString(hex)
    setForm((prev) => ({ ...prev, [field]: hsl }))
  }

  function getColorHex(field: ColorField): string {
    const hsl = form[field]
    if (!hsl) return "#000000"
    return hslStringToHex(hsl)
  }

  function handlePresetSelect(presetKey: string) {
    const preset = presets[presetKey]
    if (!preset) return
    setForm((prev) => ({
      ...prev,
      templatePreset: presetKey,
      colorPrimary: preset.colors.primary,
      colorSecondary: preset.colors.secondary,
      colorAccent: preset.colors.accent,
      colorBackground: preset.colors.background,
      colorText: preset.colors.text,
      colorHeaderBg: preset.colors.headerBg,
      colorHeaderText: preset.colors.headerText,
      colorFooterBg: preset.colors.footerBg,
      colorFooterText: preset.colors.footerText,
    }))
  }

  function getPresetDefault(field: ColorField): string | null {
    const preset = presets[form.templatePreset]
    if (!preset) return null
    return preset.colors[COLOR_TO_PRESET_KEY[field]]
  }

  function isColorDifferentFromPreset(field: ColorField): boolean {
    const current = form[field]
    const defaultVal = getPresetDefault(field)
    if (!current || !defaultVal) return false
    return current !== defaultVal
  }

  function resetColorToPreset(field: ColorField) {
    const defaultVal = getPresetDefault(field)
    if (defaultVal) {
      setForm((prev) => ({ ...prev, [field]: defaultVal }))
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text)
    toast.success("Copied!")
  }

  const webUrl = typeof window !== "undefined"
    ? `${window.location.protocol}//${window.location.hostname.split(".").map((p, i) => i === 0 ? "web" : p).join(".")}`
    : "http://web.puckhub.localhost"
  const previewUrl = organization ? `${webUrl}?orgId=${organization.id}` : webUrl

  const deviceWidths: Record<DeviceMode, number | "100%"> = {
    desktop: "100%",
    tablet: 768,
    mobile: 375,
  }

  if (isLoading) {
    return (
      <FeatureGate feature="featureWebsiteBuilder">
        <div className="space-y-6">
          <PageHeader title={t("website.title")} description={t("website.description")} />
          <Card>
            <CardContent className="p-6">
              <div className="animate-pulse space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-10 bg-muted rounded" />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </FeatureGate>
    )
  }

  return (
    <FeatureGate feature="featureWebsiteBuilder">
    <div className="space-y-6">
      <PageHeader
        title={t("website.title")}
        description={t("website.description")}
        action={
          <Button
            type="button"
            variant={showPreview ? "default" : "outline"}
            onClick={() => setShowPreview(!showPreview)}
          >
            <Eye className="w-4 h-4 mr-2" />
            {showPreview ? t("website.preview.close") : t("website.preview.open")}
          </Button>
        }
      />

      {/* Preview Panel */}
      {showPreview && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">{t("website.preview.title")}</h3>
              <div className="flex items-center gap-2">
                <div className="flex items-center rounded-md border border-border">
                  <button
                    type="button"
                    onClick={() => setDeviceMode("desktop")}
                    className={`p-1.5 rounded-l-md transition-colors ${deviceMode === "desktop" ? "bg-muted" : "hover:bg-muted/50"}`}
                    title={t("website.preview.desktop")}
                  >
                    <Monitor className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeviceMode("tablet")}
                    className={`p-1.5 border-x border-border transition-colors ${deviceMode === "tablet" ? "bg-muted" : "hover:bg-muted/50"}`}
                    title={t("website.preview.tablet")}
                  >
                    <Tablet className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeviceMode("mobile")}
                    className={`p-1.5 rounded-r-md transition-colors ${deviceMode === "mobile" ? "bg-muted" : "hover:bg-muted/50"}`}
                    title={t("website.preview.mobile")}
                  >
                    <Smartphone className="w-4 h-4" />
                  </button>
                </div>
                <a
                  href={previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  {t("website.preview.openNewTab")}
                </a>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => setShowPreview(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="flex justify-center">
              <div
                className="border border-border rounded-lg overflow-hidden shadow-sm transition-all duration-300"
                style={{
                  width: deviceWidths[deviceMode] === "100%" ? "100%" : deviceWidths[deviceMode],
                  maxWidth: "100%",
                }}
              >
                <iframe
                  src={previewUrl}
                  title="Website preview"
                  className="w-full border-0"
                  style={{ height: 600 }}
                />
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground text-center">
              {t("website.preview.savedNote")}
            </p>
          </CardContent>
        </Card>
      )}

      <TabNavigation groups={buildWebsiteTabGroups(t)} activeTab={activeTab} onTabChange={setTab} />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Domain Configuration */}
        {activeTab === "domain" && (
          <Card>
            <CardContent className="p-6 space-y-6">
              {/* Subdomain (read-only, derived from org slug) */}
              {form.subdomain && (
                <div className="rounded-lg border border-border bg-muted/30 p-4 flex items-center justify-between">
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">
                      {t("website.domain.subdomain")}
                    </label>
                    <p className="text-sm font-medium">
                      {form.subdomain}{dnsConfig?.subdomainSuffix ?? ".puckhub.eu"}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{t("website.domain.subdomainReadonlyHint")}</p>
                  </div>
                  <a
                    href={`http://${form.subdomain}${dnsConfig?.subdomainSuffix ?? ".puckhub.eu"}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ExternalLink className="h-4 w-4" />
                    {t("website.domain.openSite")}
                  </a>
                </div>
              )}

              {/* Custom domain */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  {t("website.domain.customDomain")}
                </label>
                <Input
                  value={form.domain}
                  onChange={(e) => {
                    setForm({ ...form, domain: e.target.value })
                    setDnsResult(null)
                  }}
                  placeholder={t("website.domain.customDomainPlaceholder")}
                  className="h-10"
                />
                <p className="text-[11px] text-muted-foreground mt-1">{t("website.domain.customDomainHint")}</p>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  className="h-4 w-4 rounded border-input"
                />
                <div>
                  <label htmlFor="isActive" className="text-sm font-medium cursor-pointer">
                    {t("website.domain.active")}
                  </label>
                  <p className="text-[11px] text-muted-foreground">{t("website.domain.activeHint")}</p>
                </div>
              </div>

              {/* DNS Instructions */}
              {form.domain && (
                <div className="rounded-lg border border-border bg-muted/50 p-4 space-y-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {t("website.dns.title")}
                  </h4>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium">{t("website.dns.cnameLabel")}</p>
                        <p className="text-[11px] text-muted-foreground">{t("website.dns.cnameInstruction")}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <code className="rounded bg-background px-2 py-1 text-xs font-mono border">
                          {dnsConfig?.cnameTarget ?? "sites.puckhub.eu"}
                        </code>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => copyToClipboard(dnsConfig?.cnameTarget ?? "sites.puckhub.eu")}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-medium">{t("website.dns.aRecordLabel")}</p>
                      <p className="text-[11px] text-muted-foreground">{t("website.dns.aRecordInstruction")}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={dnsVerifyMutation.isPending}
                      onClick={() => dnsVerifyMutation.mutate({ domain: form.domain })}
                    >
                      {dnsVerifyMutation.isPending ? (
                        <>
                          <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                          {t("website.dns.verifying")}
                        </>
                      ) : (
                        t("website.dns.verify")
                      )}
                    </Button>

                    {dnsResult && (
                      <div className="flex items-center gap-1.5">
                        {dnsResult.status === "valid" ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                        <span
                          className={`text-xs ${dnsResult.status === "valid" ? "text-green-600" : "text-red-600"}`}
                        >
                          {dnsResult.message}
                        </span>
                      </div>
                    )}

                    {config?.domainVerifiedAt && (
                      <span className="text-[11px] text-muted-foreground ml-auto">
                        {t("website.dns.lastVerified")}: {new Date(config.domainVerifiedAt).toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Appearance */}
        {activeTab === "appearance" && (
          <Card>
            <CardContent className="p-6 space-y-6">
              {/* Preset Cards */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-3">
                  {t("website.appearance.preset")}
                </label>
                <div className="grid grid-cols-3 gap-4">
                  {Object.keys(presets).map((key) => (
                    <PresetCard
                      key={key}
                      presetKey={key}
                      selected={form.templatePreset === key}
                      onClick={() => handlePresetSelect(key)}
                    />
                  ))}
                </div>
              </div>

              {/* Live Color Preview Strip */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-2">
                  {t("website.appearance.colors")}
                </label>
                <LiveColorPreview form={form} />
              </div>

              {/* Grouped Color Fields */}
              <div className="space-y-5">
                {COLOR_GROUPS.map((group) => (
                  <div key={group.label}>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                      {t(`website.appearance.${group.label}`)}
                    </label>
                    <div className="flex gap-4">
                      {group.fields.map((field) => (
                        <div key={field} className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-[11px] text-muted-foreground">
                              {t(`website.appearance.${field}`)}
                            </label>
                            {isColorDifferentFromPreset(field) && (
                              <button
                                type="button"
                                onClick={() => resetColorToPreset(field)}
                                className="text-muted-foreground hover:text-foreground transition-colors"
                                title={t("website.appearance.resetColor")}
                              >
                                <RotateCcw className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                          <ColorInput
                            value={getColorHex(field)}
                            onChange={(hex) => handleColorChange(field, hex)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Images */}
        {activeTab === "images" && (
          <Card>
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-3 gap-6">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-2">
                    {t("website.images.logo")}
                  </label>
                  <ImageUpload
                    value={form.logoUrl}
                    onChange={(url) => setForm({ ...form, logoUrl: url })}
                    type="logo"
                    label={t("website.images.logo")}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-2">
                    {t("website.images.favicon")}
                  </label>
                  <ImageUpload
                    value={form.faviconUrl}
                    onChange={(url) => setForm({ ...form, faviconUrl: url })}
                    type="logo"
                    label={t("website.images.favicon")}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-2">
                    {t("website.images.ogImage")}
                  </label>
                  <ImageUpload
                    value={form.ogImageUrl}
                    onChange={(url) => setForm({ ...form, ogImageUrl: url })}
                    type="photo"
                    label={t("website.images.ogImage")}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* SEO */}
        {activeTab === "seo" && (
          <Card>
            <CardContent className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  {t("website.seo.seoTitle")}
                </label>
                <Input
                  value={form.seoTitle}
                  onChange={(e) => setForm({ ...form, seoTitle: e.target.value })}
                  className="h-10"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  {t("website.seo.seoDescription")}
                </label>
                <Textarea
                  value={form.seoDescription}
                  onChange={(e) => setForm({ ...form, seoDescription: e.target.value })}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Save */}
        <div className="flex justify-end">
          <Button type="submit" disabled={updateMutation.isPending}>
            <Save className="w-4 h-4 mr-2" />
            {updateMutation.isPending ? t("saving") : t("save")}
          </Button>
        </div>
      </form>
    </div>
    </FeatureGate>
  )
}
