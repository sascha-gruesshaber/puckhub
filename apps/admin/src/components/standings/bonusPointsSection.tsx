import { Button, Card, CardContent, CardHeader, CardTitle, toast } from "@puckhub/ui"
import { Pencil, Plus, Trash2 } from "lucide-react"
import { useState } from "react"
import { trpc } from "@/trpc"
import { ConfirmDialog } from "~/components/confirmDialog"
import { BonusPointsDialog } from "~/components/standings/bonusPointsDialog"
import { useTranslation } from "~/i18n/use-translation"

interface Team {
  id: string
  name: string
  shortName: string
  city?: string | null
  logoUrl?: string | null
  primaryColor?: string | null
}

interface BonusPointsSectionProps {
  roundId: string
  teams: Team[]
}

function BonusPointsSection({ roundId, teams }: BonusPointsSectionProps) {
  const { t } = useTranslation("common")
  const utils = trpc.useUtils()

  const { data: bonusPoints } = trpc.bonusPoints.listByRound.useQuery({ roundId })

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<{
    id: string
    teamId: string
    points: number
    reason?: string | null
  } | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const createMutation = trpc.bonusPoints.create.useMutation({
    onSuccess: () => {
      utils.bonusPoints.listByRound.invalidate({ roundId })
      utils.standings.getByRound.invalidate({ roundId })
      setDialogOpen(false)
      toast.success(t("standingsPage.bonusPoints.created"))
    },
  })

  const updateMutation = trpc.bonusPoints.update.useMutation({
    onSuccess: () => {
      utils.bonusPoints.listByRound.invalidate({ roundId })
      utils.standings.getByRound.invalidate({ roundId })
      setEditingEntry(null)
      toast.success(t("standingsPage.bonusPoints.updated"))
    },
  })

  const deleteMutation = trpc.bonusPoints.delete.useMutation({
    onSuccess: () => {
      utils.bonusPoints.listByRound.invalidate({ roundId })
      utils.standings.getByRound.invalidate({ roundId })
      setDeleteId(null)
      toast.success(t("standingsPage.bonusPoints.deleted"))
    },
  })

  const teamMap = new Map(teams.map((t) => [t.id, t]))

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-base">{t("standingsPage.bonusPoints.title")}</CardTitle>
          <Button variant="outline" size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-1.5" />
            {t("standingsPage.bonusPoints.add")}
          </Button>
        </CardHeader>
        <CardContent>
          {!bonusPoints || bonusPoints.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("standingsPage.bonusPoints.noEntries")}</p>
          ) : (
            <div className="overflow-hidden rounded-lg border border-border/50">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/40 text-xs text-muted-foreground uppercase tracking-wider">
                    <th className="text-left px-4 py-2.5">{t("standingsPage.bonusPoints.team")}</th>
                    <th className="text-center px-3 py-2.5 w-20">{t("standingsPage.bonusPoints.points")}</th>
                    <th className="text-left px-3 py-2.5 hidden sm:table-cell">
                      {t("standingsPage.bonusPoints.reason")}
                    </th>
                    <th className="text-right px-4 py-2.5 w-24">{t("standingsPage.bonusPoints.actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {bonusPoints.map((bp) => {
                    const team = teamMap.get(bp.teamId)
                    return (
                      <tr key={bp.id} className="border-b border-border/20 last:border-b-0">
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            {team?.logoUrl && (
                              <img src={team.logoUrl} alt="" className="h-4 w-4 rounded-sm object-contain" />
                            )}
                            <span className="font-medium">{team?.name ?? "–"}</span>
                          </div>
                        </td>
                        <td className="text-center px-3 py-2.5 tabular-nums font-medium">
                          <span className={bp.points > 0 ? "text-green-600" : bp.points < 0 ? "text-red-500" : ""}>
                            {bp.points > 0 ? `+${bp.points}` : bp.points}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-muted-foreground hidden sm:table-cell">{bp.reason || "–"}</td>
                        <td className="px-4 py-2.5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => setEditingEntry(bp)}
                              className="p-1.5 rounded-md hover:bg-accent/10 text-muted-foreground hover:text-foreground transition-colors"
                              title={t("standingsPage.bonusPoints.edit")}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteId(bp.id)}
                              className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                              title={t("standingsPage.bonusPoints.delete")}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create dialog */}
      <BonusPointsDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        teams={teams}
        isPending={createMutation.isPending}
        onSave={(data) => createMutation.mutate({ ...data, roundId })}
      />

      {/* Edit dialog */}
      {editingEntry && (
        <BonusPointsDialog
          open={!!editingEntry}
          onOpenChange={() => setEditingEntry(null)}
          teams={teams}
          initialValues={editingEntry}
          isPending={updateMutation.isPending}
          onSave={(data) => updateMutation.mutate({ id: editingEntry.id, points: data.points, reason: data.reason })}
        />
      )}

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        title={t("standingsPage.bonusPoints.confirmDelete")}
        description={t("standingsPage.bonusPoints.confirmDeleteDescription")}
        confirmLabel={t("standingsPage.bonusPoints.delete")}
        onConfirm={() => deleteId && deleteMutation.mutate({ id: deleteId })}
        isPending={deleteMutation.isPending}
        variant="destructive"
      />
    </>
  )
}

export { BonusPointsSection }
