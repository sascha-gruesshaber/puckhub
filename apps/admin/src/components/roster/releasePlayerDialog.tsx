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
import { Calendar, UserMinus } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { trpc } from "@/trpc"
import { ConfirmDialog } from "~/components/confirmDialog"
import { PlayerInfoCard } from "~/components/player/playerInfoCard"
import { useTranslation } from "~/i18n/use-translation"
import { resolveTranslatedError } from "~/lib/errorI18n"
import type { ContractRow } from "./rosterTable"

interface ReleasePlayerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  contract: ContractRow | null
  teamId: string
  seasonId: string
}

function ReleasePlayerDialog({ open, onOpenChange, contract, teamId, seasonId }: ReleasePlayerDialogProps) {
  const { t } = useTranslation("common")
  const { t: tErrors } = useTranslation("errors")
  const utils = trpc.useUtils()

  const { data: allSeasons } = trpc.season.list.useQuery(undefined, { enabled: open })

  // Seasons from contract start to current season (ascending)
  const availableSeasons = useMemo(() => {
    if (!allSeasons || !contract) return []
    const sorted = [...allSeasons].sort(
      (a, b) => new Date(a.seasonStart).getTime() - new Date(b.seasonStart).getTime(),
    )
    const startIdx = sorted.findIndex((s) => s.id === contract.startSeasonId)
    const currentIdx = sorted.findIndex((s) => s.id === seasonId)
    if (startIdx === -1 || currentIdx === -1) return sorted
    return sorted.slice(startIdx, currentIdx + 1)
  }, [allSeasons, contract, seasonId])

  // Default: one before current season (= remove from current roster)
  const defaultSeasonId = useMemo(() => {
    if (availableSeasons.length === 0) return seasonId
    const idx = Math.max(0, availableSeasons.length - 2)
    return availableSeasons[idx]?.id ?? seasonId
  }, [availableSeasons, seasonId])

  const [selectedSeasonId, setSelectedSeasonId] = useState(defaultSeasonId)
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false)

  useEffect(() => {
    setSelectedSeasonId(defaultSeasonId)
  }, [defaultSeasonId])

  const selectedSeason = availableSeasons.find((s) => s.id === selectedSeasonId) ?? null
  const selectedIdx = availableSeasons.findIndex((s) => s.id === selectedSeasonId)
  const firstRemovedSeason =
    selectedIdx >= 0 && selectedIdx < availableSeasons.length - 1 ? availableSeasons[selectedIdx + 1] : null
  const startSeasonName = availableSeasons[0]?.name ?? ""

  const releaseMutation = trpc.contract.releasePlayer.useMutation({
    onSuccess: () => {
      utils.contract.rosterForSeason.invalidate({ teamId, seasonId })
      onOpenChange(false)
      toast.success(t("rosterPage.toast.released"))
    },
    onError: (err) => {
      toast.error(t("rosterPage.toast.releaseError"), {
        description: resolveTranslatedError(err, tErrors),
      })
    },
  })

  const isDirty = selectedSeasonId !== defaultSeasonId

  if (!contract) return null

  const playerName = `${contract.player.firstName} ${contract.player.lastName}`

  return (
    <>
    <Sheet open={open} onOpenChange={onOpenChange} dirty={isDirty} onDirtyClose={() => setConfirmCloseOpen(true)}>
      <SheetContent>
        <SheetClose />
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <UserMinus className="h-5 w-5 text-destructive" />
            {t("rosterPage.releaseDialog.title")}
          </SheetTitle>
          <SheetDescription>
            {t("rosterPage.releaseDialog.description", { player: playerName })}
          </SheetDescription>
        </SheetHeader>

        <SheetBody className="space-y-5">
          {/* Player info card */}
          <PlayerInfoCard
            player={contract.player}
            position={contract.position}
            jerseyNumber={contract.jerseyNumber}
            sinceSeasonName={startSeasonName}
          />

          {/* Season picker */}
          {availableSeasons.length > 0 && (
            <FormField label={t("rosterPage.releaseDialog.lastActiveSeason")}>
              <Select value={selectedSeasonId} onValueChange={(v) => setSelectedSeasonId(v)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableSeasons.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          )}

          {/* Impact summary */}
          {firstRemovedSeason ? (
            <div className="p-3 rounded-md bg-destructive/5 border border-destructive/15">
              <div className="flex items-center gap-2 text-sm text-destructive">
                <Calendar className="h-3.5 w-3.5 shrink-0" />
                <p>
                  {t("rosterPage.releaseDialog.removeFromSeason", {
                    player: contract.player.lastName,
                    season: firstRemovedSeason.name,
                  })}
                </p>
              </div>
            </div>
          ) : selectedSeason ? (
            <div className="p-3 rounded-md bg-muted/60 border border-border">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-3.5 w-3.5 shrink-0" />
                <p>
                  {t("rosterPage.releaseDialog.keepCurrentSeason", {
                    player: contract.player.lastName,
                    season: selectedSeason.name,
                  })}
                </p>
              </div>
            </div>
          ) : null}
        </SheetBody>

        <SheetFooter>
          <div className="flex-1" />
          <Button type="button" variant="outline" onClick={() => { if (isDirty) setConfirmCloseOpen(true); else onOpenChange(false) }}>
            {t("cancel")}
          </Button>
          <Button
            variant="destructive"
            disabled={releaseMutation.isPending || !selectedSeason}
            onClick={() => {
              if (contract && selectedSeason) {
                releaseMutation.mutate({
                  contractId: contract.id,
                  seasonId: selectedSeason.id,
                })
              }
            }}
          >
            {releaseMutation.isPending
              ? t("rosterPage.releaseDialog.releasing")
              : t("rosterPage.releaseDialog.confirm")}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>

    <ConfirmDialog
      open={confirmCloseOpen}
      onOpenChange={setConfirmCloseOpen}
      title={t("unsavedChanges.title", { defaultValue: "Ungespeicherte Änderungen" })}
      description={t("unsavedChanges.description", { defaultValue: "Du hast ungespeicherte Änderungen. Möchtest du wirklich schließen?" })}
      confirmLabel={t("unsavedChanges.discard", { defaultValue: "Verwerfen" })}
      variant="destructive"
      onConfirm={() => {
        setConfirmCloseOpen(false)
        onOpenChange(false)
      }}
    />
    </>
  )
}

export { ReleasePlayerDialog }
