import {
  Button,
  FormField,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Sheet,
  SheetBody,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  toast,
} from "@puckhub/ui"
import { AlertTriangle, Merge } from "lucide-react"
import { useEffect, useState } from "react"
import { trpc } from "@/trpc"
import { TeamCombobox } from "~/components/teamCombobox"
import { useTranslation } from "~/i18n/use-translation"
import { resolveTranslatedError } from "~/lib/errorI18n"

interface MergeTeamsSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The team that survives the merge — the club under its current name. */
  targetTeam: { id: string; name: string; shortName: string }
  teams: Array<{
    id: string
    name: string
    shortName: string
    city?: string | null
    logoUrl?: string | null
    primaryColor?: string | null
  }>
  onMerged?: () => void
}

/**
 * Pulls a predecessor team record into this one.
 *
 * Legacy systems cannot rename a club: they leave the old record behind and create a
 * new one, so a single franchise ends up split across two teams with no link. This
 * moves everything the old record owns onto this team and remembers the old name for
 * the seasons it applied to.
 */
function MergeTeamsSheet({ open, onOpenChange, targetTeam, teams, onMerged }: MergeTeamsSheetProps) {
  const { t } = useTranslation("common")
  const { t: tErrors } = useTranslation("errors")
  const [sourceTeamId, setSourceTeamId] = useState("")
  const [untilSeasonId, setUntilSeasonId] = useState("")

  const utils = trpc.useUtils()
  const { data: seasons } = trpc.season.list.useQuery(undefined, { enabled: open })

  const { data: preview, isFetching: previewLoading } = trpc.team.mergePreview.useQuery(
    { sourceTeamId, targetTeamId: targetTeam.id },
    { enabled: open && sourceTeamId !== "" },
  )

  useEffect(() => {
    if (!open) {
      setSourceTeamId("")
      setUntilSeasonId("")
    }
  }, [open])

  useEffect(() => {
    if (preview?.suggestedNameChangeSeasonId) setUntilSeasonId(preview.suggestedNameChangeSeasonId)
  }, [preview?.suggestedNameChangeSeasonId])

  const mergeMutation = trpc.team.merge.useMutation({
    onSuccess: (result) => {
      utils.team.list.invalidate()
      utils.team.history.invalidate({ teamId: targetTeam.id })
      onMerged?.()
      onOpenChange(false)
      toast.success(t("teamsPage.teamDetail.mergeTeam.toast.merged"), {
        description: t("teamsPage.teamDetail.mergeTeam.toast.mergedDescription", {
          contracts: result.moved.contract ?? 0,
          games: result.moved.game ?? 0,
        }),
      })
    },
    onError: (err) => {
      toast.error(t("teamsPage.teamDetail.mergeTeam.toast.mergeError"), {
        description: resolveTranslatedError(err, tErrors),
      })
    },
  })

  const selectableTeams = teams.filter((team) => team.id !== targetTeam.id)
  const moves = preview ? Object.entries(preview.moves).filter(([, count]) => count > 0) : []
  const conflicts = preview?.conflicts

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetClose />
        <SheetHeader>
          <SheetTitle>{t("teamsPage.teamDetail.mergeTeam.title")}</SheetTitle>
          <SheetDescription>
            {t("teamsPage.teamDetail.mergeTeam.description", { team: targetTeam.name })}
          </SheetDescription>
        </SheetHeader>

        <SheetBody className="space-y-6">
          <FormField label={t("teamsPage.teamDetail.mergeTeam.fields.predecessor")} required>
            <TeamCombobox
              teams={selectableTeams}
              value={sourceTeamId}
              onChange={setSourceTeamId}
              placeholder={t("teamsPage.teamDetail.mergeTeam.fields.predecessorPlaceholder")}
            />
          </FormField>

          {sourceTeamId && previewLoading && (
            <p className="text-sm text-muted-foreground">{t("teamsPage.teamDetail.mergeTeam.loadingPreview")}</p>
          )}

          {preview && !previewLoading && (
            <>
              <div className="rounded-md border border-border bg-muted/40 p-3 space-y-1.5">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {t("teamsPage.teamDetail.mergeTeam.movesTitle")}
                </p>
                {moves.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t("teamsPage.teamDetail.mergeTeam.movesEmpty")}</p>
                ) : (
                  <ul className="text-sm space-y-0.5">
                    {moves.map(([key, count]) => (
                      <li key={key} className="flex items-center justify-between gap-3">
                        <span className="text-muted-foreground">
                          {t(`teamsPage.teamDetail.mergeTeam.moves.${key}`)}
                        </span>
                        <span className="font-mono font-medium">{count}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {conflicts && !preview.canMerge && (
                <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 space-y-2">
                  <p className="flex items-center gap-1.5 text-sm font-medium text-destructive">
                    <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                    {t("teamsPage.teamDetail.mergeTeam.conflicts.title")}
                  </p>
                  <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5">
                    {conflicts.sharedSeasons.length > 0 && (
                      <li>
                        {t("teamsPage.teamDetail.mergeTeam.conflicts.sharedSeasons", {
                          seasons: conflicts.sharedSeasons.map((s) => s.name).join(", "),
                        })}
                      </li>
                    )}
                    {conflicts.headToHeadGames > 0 && (
                      <li>
                        {t("teamsPage.teamDetail.mergeTeam.conflicts.headToHead", {
                          count: conflicts.headToHeadGames,
                        })}
                      </li>
                    )}
                    {conflicts.contractCollisions.length > 0 && (
                      <li>
                        {t("teamsPage.teamDetail.mergeTeam.conflicts.contracts", {
                          players: conflicts.contractCollisions
                            .map((c) => `${c.playerName} (${c.seasonName})`)
                            .join(", "),
                        })}
                      </li>
                    )}
                  </ul>
                </div>
              )}

              {preview.canMerge && (
                <>
                  <FormField
                    label={t("teamsPage.teamDetail.mergeTeam.fields.nameUntilSeason")}
                    description={t("teamsPage.teamDetail.mergeTeam.fields.nameUntilSeasonHint", {
                      name: preview.source.name,
                    })}
                  >
                    <Select value={untilSeasonId} onValueChange={setUntilSeasonId}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(seasons ?? []).map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormField>

                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {t("teamsPage.teamDetail.mergeTeam.warning", {
                      source: preview.source.name,
                      target: targetTeam.name,
                    })}
                  </p>
                </>
              )}
            </>
          )}
        </SheetBody>

        <SheetFooter>
          <div className="flex-1" />
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t("cancel")}
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={!preview?.canMerge || mergeMutation.isPending}
            onClick={() =>
              mergeMutation.mutate({
                sourceTeamId,
                targetTeamId: targetTeam.id,
                nameChangeUntilSeasonId: untilSeasonId || undefined,
              })
            }
          >
            <Merge className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
            {mergeMutation.isPending
              ? t("teamsPage.teamDetail.mergeTeam.actions.merging")
              : t("teamsPage.teamDetail.mergeTeam.actions.merge")}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

export { MergeTeamsSheet }
