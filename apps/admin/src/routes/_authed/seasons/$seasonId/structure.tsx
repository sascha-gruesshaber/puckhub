import { createFileRoute } from "@tanstack/react-router"
import { PageHeader } from "~/components/pageHeader"
import { StructureCanvas } from "~/components/structureBuilder/structureCanvas"
import { useTranslation } from "~/i18n/use-translation"

export const Route = createFileRoute("/_authed/seasons/$seasonId/structure")({
  component: StructurePage,
})

function StructurePage() {
  const { t } = useTranslation("common")
  const { seasonId } = Route.useParams()

  return (
    <div className="space-y-6">
      <PageHeader title={t("seasonStructure.title")} description={t("seasonStructure.description")} />

      <div
        className="bg-white rounded-xl border border-border/50 shadow-sm overflow-hidden"
        style={{ height: "calc(100vh - 200px)" }}
      >
        <StructureCanvas seasonId={seasonId} />
      </div>
    </div>
  )
}
