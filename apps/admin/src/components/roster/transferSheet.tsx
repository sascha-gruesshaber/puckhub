import {
  Button,
  FormField,
  Input,
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
import { ArrowRight, Calendar } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { trpc } from "@/trpc"
import { ConfirmDialog } from "~/components/confirmDialog"
import { PlayerInfoCard } from "~/components/player/playerInfoCard"
import { TeamCombobox } from "~/components/teamCombobox"
import { useTranslation } from "~/i18n/use-translation"
import { resolveTranslatedError } from "~/lib/errorI18n"
import type { ContractRow } from "./rosterTable"

interface TransferSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  contract: ContractRow | null
  seasonId: string
  teams: {
    id: string
    name: string
    shortName: string
    city?: string | null
    logoUrl?: string | null
    primaryColor?: string | null
  }[]
}

function TransferSheet({ open, onOpenChange, contract, seasonId, teams }: TransferSheetProps) {
  const currentTeamId = contract?.teamId ?? ""
  const { t } = useTranslation("common")
  const { t: tErrors } = useTranslation("errors")
  const [newTeamId, setNewTeamId] = useState("")
  const [position, setPosition] = useState<"forward" | "defense" | "goalie">("forward")
  const [jerseyNumber, setJerseyNumber] = useState("")
  const [selectedSeasonId, setSelectedSeasonId] = useState(seasonId)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false)

  const utils = trpc.useUtils()

  const { data: allSeasons } = trpc.season.list.useQuery(undefined, { enabled: open })

  // Seasons from contract start to current season (ascending)
  const availableSeasons = useMemo(() => {
    if (!allSeasons || !contract) return []
    const sorted = [...allSeasons].sort((a, b) => new Date(a.seasonStart).getTime() - new Date(b.seasonStart).getTime())
    const startIdx = sorted.findIndex((s) => s.id === contract.startSeasonId)
    const currentIdx = sorted.findIndex((s) => s.id === seasonId)
    if (startIdx === -1 || currentIdx === -1) return sorted
    return sorted.slice(startIdx, currentIdx + 1)
  }, [allSeasons, contract, seasonId])

  const selectedSeason = availableSeasons.find((s) => s.id === selectedSeasonId) ?? null

  const sinceSeasonName = useMemo(() => {
    if (!allSeasons || !contract) return null
    return allSeasons.find((s) => s.id === contract.startSeasonId)?.name ?? null
  }, [allSeasons, contract])

  useEffect(() => {
    if (contract) {
      setPosition(contract.position as "forward" | "defense" | "goalie")
      setJerseyNumber("")
      setNewTeamId("")
      setSelectedSeasonId(seasonId)
      setErrors({})
    }
  }, [contract, seasonId])

  const isDirty = newTeamId !== ""

  const otherTeams = teams.filter((t) => t.id !== currentTeamId)
  const currentTeam = teams.find((t) => t.id === currentTeamId)
  const selectedNewTeam = otherTeams.find((t) => t.id === newTeamId)

  const transferMutation = trpc.contract.transferPlayer.useMutation({
    onSuccess: () => {
      if (currentTeamId) {
        utils.contract.rosterForSeason.invalidate({ teamId: currentTeamId, seasonId: selectedSeasonId })
      }
      if (newTeamId) {
        utils.contract.rosterForSeason.invalidate({ teamId: newTeamId, seasonId: selectedSeasonId })
      }
      if (selectedSeasonId !== seasonId && currentTeamId) {
        utils.contract.rosterForSeason.invalidate({ teamId: currentTeamId, seasonId })
      }
      utils.contract.rosterForSeasonAllTeams.invalidate({ seasonId: selectedSeasonId })
      if (selectedSeasonId !== seasonId) {
        utils.contract.rosterForSeasonAllTeams.invalidate({ seasonId })
      }
      onOpenChange(false)
      toast.success(t("rosterPage.transferDialog.toast.transferred"))
    },
    onError: (err) => {
      toast.error(t("rosterPage.transferDialog.toast.transferError"), {
        description: resolveTranslatedError(err, tErrors),
      })
    },
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!contract) return

    const next: Record<string, string> = {}
    if (!newTeamId) next.team = t("rosterPage.transferDialog.validation.teamRequired")
    setErrors(next)
    if (Object.keys(next).length > 0) return

    transferMutation.mutate({
      contractId: contract.id,
      newTeamId,
      seasonId: selectedSeasonId,
      position,
      jerseyNumber: jerseyNumber ? Number(jerseyNumber) : undefined,
    })
  }

  if (!contract) return null

  function close() {
    onOpenChange(false)
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange} dirty={isDirty} onDirtyClose={() => setConfirmCloseOpen(true)}>
        <SheetContent>
          <SheetClose />
          <SheetHeader>
            <SheetTitle>{t("rosterPage.transferDialog.title")}</SheetTitle>
            <SheetDescription>
              {t("rosterPage.transferDialog.description", {
                player: `${contract.player.firstName} ${contract.player.lastName}`,
              })}
            </SheetDescription>
          </SheetHeader>

          <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
            <SheetBody className="space-y-6">
              <PlayerInfoCard
                player={contract.player}
                position={contract.position}
                jerseyNumber={contract.jerseyNumber}
                sinceSeasonName={sinceSeasonName}
              />

              <FormField label={t("rosterPage.transferDialog.fields.newTeam")} error={errors.team} required>
                <TeamCombobox
                  teams={otherTeams.map((t) => ({
                    id: t.id,
                    name: t.name,
                    shortName: t.shortName,
                    city: t.city,
                    logoUrl: t.logoUrl,
                    primaryColor: t.primaryColor,
                  }))}
                  value={newTeamId}
                  onChange={(teamId) => {
                    setNewTeamId(teamId)
                    setErrors((prev) => ({ ...prev, team: "" }))
                  }}
                  placeholder={t("rosterPage.transferDialog.fields.newTeamPlaceholder")}
                />
              </FormField>

              {/* Season picker */}
              {availableSeasons.length > 1 && (
                <FormField label={t("rosterPage.transferDialog.effectiveSeason")}>
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

              <FormField label={t("rosterPage.transferDialog.fields.position")}>
                <Select value={position} onValueChange={(v) => setPosition(v as "forward" | "defense" | "goalie")}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="goalie">{t("rosterPage.positions.goalie")}</SelectItem>
                    <SelectItem value="defense">{t("rosterPage.positions.defense")}</SelectItem>
                    <SelectItem value="forward">{t("rosterPage.positions.forward")}</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>

              <FormField label={t("rosterPage.transferDialog.fields.newJerseyNumber")}>
                <Input
                  type="number"
                  min="1"
                  max="99"
                  value={jerseyNumber}
                  onChange={(e) => setJerseyNumber(e.target.value)}
                  placeholder={t("rosterPage.transferDialog.fields.jerseyNumberPlaceholder")}
                />
              </FormField>

              {/* Transfer summary */}
              {selectedNewTeam && selectedSeason && (
                <div className="p-3 rounded-md bg-primary/5 border border-primary/15">
                  <div className="flex items-center gap-2 text-sm text-foreground">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {currentTeam?.logoUrl ? (
                        <img src={currentTeam.logoUrl} alt="" className="h-5 w-5 rounded-full object-cover shrink-0" />
                      ) : (
                        <div className="h-5 w-5 rounded-full bg-muted shrink-0" />
                      )}
                      <span className="font-medium truncate">{currentTeam?.shortName}</span>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <div className="flex items-center gap-1.5 min-w-0">
                      {selectedNewTeam.logoUrl ? (
                        <img
                          src={selectedNewTeam.logoUrl}
                          alt=""
                          className="h-5 w-5 rounded-full object-cover shrink-0"
                        />
                      ) : (
                        <div className="h-5 w-5 rounded-full bg-muted shrink-0" />
                      )}
                      <span className="font-medium truncate">{selectedNewTeam.shortName}</span>
                    </div>
                    <span className="text-muted-foreground mx-1">·</span>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                      <Calendar className="h-3 w-3" />
                      {selectedSeason.name}
                    </span>
                  </div>
                </div>
              )}
            </SheetBody>

            <SheetFooter>
              <div className="flex-1" />
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (isDirty) setConfirmCloseOpen(true)
                  else close()
                }}
              >
                {t("cancel")}
              </Button>
              <Button type="submit" variant="accent" disabled={transferMutation.isPending}>
                {transferMutation.isPending
                  ? t("rosterPage.transferDialog.actions.transferring")
                  : t("rosterPage.transferDialog.actions.transfer")}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={confirmCloseOpen}
        onOpenChange={setConfirmCloseOpen}
        title={t("unsavedChanges.title", { defaultValue: "Ungespeicherte Änderungen" })}
        description={t("unsavedChanges.description", {
          defaultValue: "Du hast ungespeicherte Änderungen. Möchtest du wirklich schließen?",
        })}
        confirmLabel={t("unsavedChanges.discard", { defaultValue: "Verwerfen" })}
        variant="destructive"
        onConfirm={() => {
          setConfirmCloseOpen(false)
          close()
        }}
      />
    </>
  )
}

export { TransferSheet }
