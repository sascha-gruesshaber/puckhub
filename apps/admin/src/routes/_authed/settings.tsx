import { Button, Card, CardContent, Input, toast } from "@puckhub/ui"
import { createFileRoute } from "@tanstack/react-router"
import { Save, Settings } from "lucide-react"
import { useEffect, useState } from "react"
import { trpc } from "@/trpc"
import { PageHeader } from "~/components/pageHeader"
import { usePermissionGuard } from "~/contexts/permissionsContext"
import { useTranslation } from "~/i18n/use-translation"
import { resolveTranslatedError } from "~/lib/errorI18n"

export const Route = createFileRoute("/_authed/settings")({
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

  const [form, setForm] = useState({
    leagueName: "",
    leagueShortName: "",
    locale: "de-DE",
    timezone: "Europe/Berlin",
    pointsWin: 2,
    pointsDraw: 1,
    pointsLoss: 0,
  })

  useEffect(() => {
    if (settings) {
      setForm({
        leagueName: settings.leagueName,
        leagueShortName: settings.leagueShortName,
        locale: settings.locale,
        timezone: settings.timezone,
        pointsWin: settings.pointsWin,
        pointsDraw: settings.pointsDraw,
        pointsLoss: settings.pointsLoss,
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

  function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault()
    updateMutation.mutate(form)
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
                  <select
                    value={form.locale}
                    onChange={(e) => setForm({ ...form, locale: e.target.value })}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    {LOCALES.map((locale) => (
                      <option key={locale} value={locale}>
                        {t(`settings.localeOptions.${locale}`)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                    {t("settings.timezone")}
                  </label>
                  <select
                    value={form.timezone}
                    onChange={(e) => setForm({ ...form, timezone: e.target.value })}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    {TIMEZONES.map((tz) => (
                      <option key={tz.value} value={tz.value}>
                        {tz.label}
                      </option>
                    ))}
                  </select>
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
              <Button type="submit" disabled={updateMutation.isPending}>
                <Save className="w-4 h-4 mr-2" />
                {updateMutation.isPending ? t("saving") : t("save")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}
