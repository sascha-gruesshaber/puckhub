import { Skeleton } from "@puckhub/ui"
import { createFileRoute } from "@tanstack/react-router"
import { lazy, Suspense } from "react"
import { PageHeader } from "~/components/pageHeader"
import { useTranslation } from "~/i18n/use-translation"

const StructureCanvas = lazy(() =>
  import("~/components/structureBuilder/structureCanvas").then((m) => ({ default: m.StructureCanvas })),
)

export const Route = createFileRoute("/_authed/seasons/$seasonId/structure")({
  loader: async ({ context, params }) => {
    await context.trpcQueryUtils?.season.getFullStructure.ensureData({ id: params.seasonId })
  },
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
        <Suspense fallback={<Skeleton className="h-full w-full" />}>
          <StructureCanvas seasonId={seasonId} />
        </Suspense>
      </div>
    </div>
  )
}
