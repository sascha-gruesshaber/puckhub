import { Badge, Button, Card, CardContent, toast } from "@puckhub/ui"
import { createFileRoute, useParams } from "@tanstack/react-router"
import { AlertTriangle, FileText, RotateCcw } from "lucide-react"
import { useState } from "react"
import { trpc } from "@/trpc"
import { ConfirmDialog } from "~/components/confirmDialog"
import { EmptyState } from "~/components/emptyState"
import { PageHeader } from "~/components/pageHeader"
import { usePermissionGuard } from "~/contexts/permissionsContext"
import { useWorkingSeason } from "~/contexts/seasonContext"
import { useTranslation } from "~/i18n/use-translation"
import { resolveTranslatedError } from "~/lib/errorI18n"

export const Route = createFileRoute("/_authed/$orgSlug/games/public-reports")({
  component: PublicReportsPage,
})

function PublicReportsPage() {
  usePermissionGuard("games")
  const { orgSlug } = useParams({ strict: false }) as { orgSlug: string }
  const { t } = useTranslation("common")
  const { t: tErrors } = useTranslation("errors")
  const utils = trpc.useUtils()
  const { season } = useWorkingSeason()

  const { data: reports, isLoading } = trpc.publicGameReport.list.useQuery({
    seasonId: season?.id,
    limit: 50,
  })

  const [revertId, setRevertId] = useState<string | null>(null)
  const [revertNote, setRevertNote] = useState("")

  const revertMutation = trpc.publicGameReport.revert.useMutation({
    onSuccess: () => {
      toast.success(t("publicReports.revertSuccess"))
      setRevertId(null)
      setRevertNote("")
      void utils.publicGameReport.list.invalidate()
      void utils.publicGameReport.count.invalidate()
    },
    onError: (err) => {
      toast.error(resolveTranslatedError(err, tErrors))
    },
  })

  function handleRevert() {
    if (!revertId) return
    revertMutation.mutate({ id: revertId, revertNote: revertNote || undefined })
  }

  const formatDate = (date: string | Date) => {
    const d = typeof date === "string" ? new Date(date) : date
    return d.toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t("publicReports.title")} description={t("publicReports.description")} />

      {isLoading ? (
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-muted rounded" />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : !reports || reports.length === 0 ? (
        <EmptyState
          icon={<FileText className="w-7 h-7 text-muted-foreground" />}
          title={t("publicReports.empty")}
          description={t("publicReports.emptyDesc")}
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium">{t("publicReports.game")}</th>
                    <th className="px-4 py-3 text-center font-medium">{t("publicReports.score")}</th>
                    <th className="px-4 py-3 text-left font-medium">{t("publicReports.submitter")}</th>
                    <th className="px-4 py-3 text-left font-medium">{t("publicReports.date")}</th>
                    <th className="px-4 py-3 text-center font-medium">{t("publicReports.status")}</th>
                    <th className="px-4 py-3 text-right font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {reports.map((report: any) => (
                    <tr key={report.id} className={`border-b last:border-0 ${report.reverted ? `opacity-50` : ``}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {report.game?.homeTeam?.shortName} vs {report.game?.awayTeam?.shortName}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {report.game?.round?.division?.name} &middot; {report.game?.round?.name}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center font-bold tabular-nums">
                        {report.homeScore} : {report.awayScore}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs">{report.submitterEmail}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground tabular-nums">
                        {formatDate(report.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {report.reverted ? (
                          <Badge variant="outline" className="text-orange-600 border-orange-300">
                            {t("publicReports.reverted")}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-green-600 border-green-300">
                            {t("publicReports.active")}
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {!report.reverted && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setRevertId(report.id)
                              setRevertNote("")
                            }}
                          >
                            <RotateCcw className="w-3 h-3 mr-1" />
                            {t("publicReports.revert")}
                          </Button>
                        )}
                        {report.reverted && report.reverter && (
                          <span className="text-xs text-muted-foreground">{report.reverter.name}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <ConfirmDialog
        open={!!revertId}
        onOpenChange={(open) => {
          if (!open) setRevertId(null)
        }}
        title={t("publicReports.revertTitle")}
        description={
          <div className="space-y-3">
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <AlertTriangle className="w-4 h-4 mt-0.5 text-amber-500 shrink-0" />
              {t("publicReports.revertDescription")}
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                {t("publicReports.revertNote")}
              </label>
              <input
                type="text"
                value={revertNote}
                onChange={(e) => setRevertNote(e.target.value)}
                placeholder={t("publicReports.revertNotePlaceholder")}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>
        }
        confirmLabel={t("publicReports.revert")}
        onConfirm={handleRevert}
        isPending={revertMutation.isPending}
        variant="destructive"
      />
    </div>
  )
}
