import { Button, Card, CardContent, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, toast } from "@puckhub/ui"
import { createFileRoute } from "@tanstack/react-router"
import { Save, Send, Settings, Sparkles } from "lucide-react"
import { useEffect, useState } from "react"
import { trpc } from "@/trpc"
import { PageHeader } from "~/components/pageHeader"
import { usePermissionGuard } from "~/contexts/permissionsContext"
import { usePlanLimits } from "~/hooks/usePlanLimits"
import { normalizeLocale } from "~/i18n/resources"
import { useTranslation } from "~/i18n/use-translation"
import { resolveTranslatedError } from "~/lib/errorI18n"

export const Route = createFileRoute("/_authed/$orgSlug/settings")({
  loader: ({ context }) => {
    void context.trpcQueryUtils?.settings.get.ensureData()
  },
  component: SettingsPage,
})

const LOCALES = ["de-DE", "de-AT", "de-CH", "en-US"] as const

const TIMEZONES = [
  { value: "Europe/Berlin", label: "Europe/Berlin" },
  { value: "Europe/Vienna", label: "Europe/Vienna" },
  { value: "Europe/Zurich", label: "Europe/Zurich" },
  { value: "Europe/London", label: "Europe/London" },
  { value: "America/New_York", label: "America/New_York" },
]

function SettingsPage() {
  usePermissionGuard("settings")
  const { t } = useTranslation("common")
  const { t: tErrors } = useTranslation("errors")
  const { data: settings, isLoading } = trpc.settings.get.useQuery()
  const utils = trpc.useUtils()
  const { canUseFeature } = usePlanLimits()

  const [form, setForm] = useState({
    leagueName: "",
    leagueShortName: "",
    locale: "de-DE",
    timezone: "Europe/Berlin",
    pointsWin: 2,
    pointsDraw: 1,
    pointsLoss: 0,
    publicReportsEnabled: false,
    publicReportsRequireEmail: true,
    publicReportsBotDetection: true,
  })

  useEffect(() => {
    if (settings) {
      setForm({
        leagueName: settings.leagueName,
        leagueShortName: settings.leagueShortName || settings.leagueName,
        locale: settings.locale || "de-DE",
        timezone: settings.timezone || "Europe/Berlin",
        pointsWin: settings.pointsWin ?? 2,
        pointsDraw: settings.pointsDraw ?? 1,
        pointsLoss: settings.pointsLoss ?? 0,
        publicReportsEnabled: (settings as any).publicReportsEnabled ?? false,
        publicReportsRequireEmail: (settings as any).publicReportsRequireEmail ?? true,
        publicReportsBotDetection: (settings as any).publicReportsBotDetection ?? true,
      })
    }
  }, [settings])

  const updateMutation = trpc.settings.update.useMutation({
    onSuccess: () => {
      toast.success(t("settings.saved"))
      void utils.settings.get.invalidate()
    },
    onError: (err) => {
      toast.error(resolveTranslatedError(err, tErrors))
    },
  })

  const normalizedLocale = normalizeLocale(form.locale) ?? "de-DE"

  function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault()
    updateMutation.mutate({
      ...form,
      leagueShortName: form.leagueShortName || form.leagueName,
      locale: normalizedLocale,
      timezone: form.timezone || "Europe/Berlin",
      pointsWin: Number.isFinite(form.pointsWin) ? form.pointsWin : 2,
      pointsDraw: Number.isFinite(form.pointsDraw) ? form.pointsDraw : 1,
      pointsLoss: Number.isFinite(form.pointsLoss) ? form.pointsLoss : 0,
    })
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title={t("settings.title")} description={t("settings.description")} />
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
    )
  }

  if (!settings) {
    return (
      <div className="space-y-6">
        <PageHeader title={t("settings.title")} description={t("settings.description")} />
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">{t("settings.noSettings")}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t("settings.title")} description={t("settings.description")} />

      <form onSubmit={handleSubmit}>
        <Card>
          <CardContent className="p-6 space-y-6">
            <div>
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <Settings className="w-4 h-4 text-muted-foreground" />
                {t("settings.leagueInfo")}
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                    {t("settings.leagueName")}
                  </label>
                  <Input
                    data-testid="settings-league-name"
                    value={form.leagueName}
                    onChange={(e) => setForm({ ...form, leagueName: e.target.value })}
                    className="h-10"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                    {t("settings.leagueShortName")}
                  </label>
                  <Input
                    value={form.leagueShortName}
                    onChange={(e) => setForm({ ...form, leagueShortName: e.target.value })}
                    className="h-10"
                  />
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold mb-4">{t("settings.region")}</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                    {t("settings.language")}
                  </label>
                  <Select value={normalizedLocale} onValueChange={(v) => setForm({ ...form, locale: v })}>
                    <SelectTrigger className="w-full h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LOCALES.map((locale) => (
                        <SelectItem key={locale} value={locale}>
                          {t(`settings.localeOptions.${locale}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                    {t("settings.timezone")}
                  </label>
                  <Select value={form.timezone} onValueChange={(v) => setForm({ ...form, timezone: v })}>
                    <SelectTrigger className="w-full h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIMEZONES.map((tz) => (
                        <SelectItem key={tz.value} value={tz.value}>
                          {tz.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold mb-4">{t("settings.points")}</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">{t("settings.win")}</label>
                  <Input
                    type="number"
                    value={form.pointsWin}
                    onChange={(e) => setForm({ ...form, pointsWin: Number(e.target.value) })}
                    min={0}
                    className="h-10"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">{t("settings.draw")}</label>
                  <Input
                    type="number"
                    value={form.pointsDraw}
                    onChange={(e) => setForm({ ...form, pointsDraw: Number(e.target.value) })}
                    min={0}
                    className="h-10"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">{t("settings.loss")}</label>
                  <Input
                    type="number"
                    value={form.pointsLoss}
                    onChange={(e) => setForm({ ...form, pointsLoss: Number(e.target.value) })}
                    min={0}
                    className="h-10"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={updateMutation.isPending} data-testid="settings-save">
                <Save className="w-4 h-4 mr-2" />
                {updateMutation.isPending ? t("saving") : t("save")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>

      {/* Public Reports section */}
      {canUseFeature("featurePublicReports") && (
        <Card>
          <CardContent className="p-6 space-y-4">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Send className="w-4 h-4 text-muted-foreground" />
              {t("settingsPublicReports.title")}
            </h3>
            <p className="text-xs text-muted-foreground">{t("settingsPublicReports.description")}</p>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.publicReportsEnabled}
                onChange={(e) => {
                  const next = { ...form, publicReportsEnabled: e.target.checked }
                  setForm(next)
                  updateMutation.mutate(next)
                }}
                disabled={updateMutation.isPending}
                className="accent-primary w-4 h-4"
              />
              <div>
                <span className="text-sm font-medium">{t("settingsPublicReports.enableToggle")}</span>
                <p className="text-xs text-muted-foreground">{t("settingsPublicReports.enableDescription")}</p>
              </div>
            </label>

            {form.publicReportsEnabled && (
              <div className="space-y-3 pt-2 border-t border-border/50">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.publicReportsRequireEmail ?? true}
                    onChange={(e) => {
                      const next = { ...form, publicReportsRequireEmail: e.target.checked }
                      setForm(next)
                      updateMutation.mutate(next)
                    }}
                    disabled={updateMutation.isPending}
                    className="accent-primary w-4 h-4"
                  />
                  <div>
                    <span className="text-sm font-medium">{t("settingsPublicReports.requireEmail")}</span>
                    <p className="text-xs text-muted-foreground">
                      {t("settingsPublicReports.requireEmailDescription")}
                    </p>
                  </div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.publicReportsBotDetection ?? true}
                    onChange={(e) => {
                      const next = { ...form, publicReportsBotDetection: e.target.checked }
                      setForm(next)
                      updateMutation.mutate(next)
                    }}
                    disabled={updateMutation.isPending}
                    className="accent-primary w-4 h-4"
                  />
                  <div>
                    <span className="text-sm font-medium">{t("settingsPublicReports.botDetection")}</span>
                    <p className="text-xs text-muted-foreground">
                      {t("settingsPublicReports.botDetectionDescription")}
                    </p>
                  </div>
                </label>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* AI Features section */}
      {canUseFeature("featureAiRecaps") && <AiSettingsSection />}
    </div>
  )
}

function AiSettingsSection() {
  const { t } = useTranslation("common")
  const { t: tErrors } = useTranslation("errors")
  const utils = trpc.useUtils()

  const { data: aiUsage } = trpc.aiRecap.getUsage.useQuery(undefined, { staleTime: 30_000 })

  const setAiEnabled = trpc.organization.setAiEnabled.useMutation({
    onSuccess: () => {
      utils.aiRecap.getUsage.invalidate()
      toast.success(t("settings.saved"))
    },
    onError: (err) => toast.error(resolveTranslatedError(err, tErrors)),
  })

  if (!aiUsage) return null

  const usagePercent = aiUsage.limit ? Math.min(100, Math.round((aiUsage.used / aiUsage.limit) * 100)) : 0

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-500" />
          {t("settingsAi.title")}
        </h3>
        <p className="text-xs text-muted-foreground">{t("settingsAi.description")}</p>

        {/* Toggle */}
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={aiUsage.aiEnabled}
            onChange={(e) => setAiEnabled.mutate({ enabled: e.target.checked })}
            disabled={setAiEnabled.isPending}
            className="accent-primary w-4 h-4"
          />
          <div>
            <span className="text-sm font-medium">{t("settingsAi.enableToggle")}</span>
            <p className="text-xs text-muted-foreground">{t("settingsAi.enableDescription")}</p>
          </div>
        </label>

        {/* Token usage */}
        {aiUsage.aiEnabled && (
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{t("settingsAi.usage")}</span>
              <span className="text-muted-foreground tabular-nums">
                {aiUsage.limit
                  ? t("settingsAi.usageLabel", {
                      used: aiUsage.used.toLocaleString(),
                      limit: aiUsage.limit.toLocaleString(),
                    })
                  : t("settingsAi.usageUnlimited", { used: aiUsage.used.toLocaleString() })}
              </span>
            </div>
            {aiUsage.limit && (
              <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${usagePercent >= 80 ? `bg-amber-500` : `bg-primary`}`}
                  style={{ width: `${usagePercent}%` }}
                />
              </div>
            )}
            <p className="text-xs text-muted-foreground">{t("settingsAi.resetHint")}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
