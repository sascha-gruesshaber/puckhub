import { createFileRoute } from "@tanstack/react-router"
import { useTranslation } from "~/i18n/use-translation"

export const Route = createFileRoute("/_authed/standings")({
  component: StandingsPage,
})

function StandingsPage() {
  const { t } = useTranslation("common")

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">{t("standingsPage.title")}</h1>
      <p className="text-muted-foreground">{t("standingsPage.placeholder")}</p>
    </div>
  )
}
