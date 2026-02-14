import { createFileRoute } from "@tanstack/react-router"
import { BarChart3 } from "lucide-react"
import { useTranslation } from "~/i18n/use-translation"

export const Route = createFileRoute("/_authed/stats")({
  component: StatsPage,
})

function StatsPage() {
  const { t } = useTranslation("common")

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-3xl font-bold">{t("statsPage.title")}</h1>
        <span className="text-xs font-medium uppercase tracking-wider px-3 py-1 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
          Demnächst
        </span>
      </div>
      <div className="max-w-2xl mx-auto mt-12 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted/50 mb-4">
          <BarChart3 className="w-8 h-8 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground text-lg">{t("statsPage.placeholder")}</p>
        <p className="text-sm text-muted-foreground/70 mt-2">Die Statistikfunktionen werden in Kürze verfügbar sein.</p>
      </div>
    </div>
  )
}
