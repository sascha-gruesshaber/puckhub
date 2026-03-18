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
import { Calendar } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { trpc } from "@/trpc"
import { ConfirmDialog } from "~/components/confirmDialog"
import { PlayerCombobox } from "~/components/playerCombobox"
import { TeamCombobox } from "~/components/teamCombobox"
import { useTranslation } from "~/i18n/use-translation"
import { resolveTranslatedError } from "~/lib/errorI18n"

interface SignPlayerSheetBaseProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  seasonId: string
  onSuccess?: () => void
}

interface TeamCentricProps extends SignPlayerSheetBaseProps {
  /** Team-centric mode: team is fixed, user picks a player */
  teamId: string
  existingPlayerIds: string[]
  playerId?: never
  teams?: never
  defaultTeamId?: never
}

interface PlayerCentricProps extends SignPlayerSheetBaseProps {
  /** Player-centric mode: player is fixed, user picks a team */
  playerId: string
  teams: {
    id: string
    name: string
    shortName: string
    city?: string | null
    logoUrl?: string | null
    primaryColor?: string | null
  }[]
  teamId?: never
  existingPlayerIds?: never
  defaultTeamId?: never
}

interface RosterModeProps extends SignPlayerSheetBaseProps {
  /** Roster mode: user picks both player and team */
  teams: {
    id: string
    name: string
    shortName: string
    city?: string | null
    logoUrl?: string | null
    primaryColor?: string | null
  }[]
  defaultTeamId?: string | null
  teamId?: never
  playerId?: never
  existingPlayerIds?: never
}

type SignPlayerSheetProps = TeamCentricProps | PlayerCentricProps | RosterModeProps

function isTeamCentric(props: SignPlayerSheetProps): props is TeamCentricProps {
  return "teamId" in props && !!props.teamId
}

function isPlayerCentric(props: SignPlayerSheetProps): props is PlayerCentricProps {
  return "playerId" in props && !!props.playerId
}

function isRosterMode(props: SignPlayerSheetProps): props is RosterModeProps {
  return "teams" in props && !!props.teams && !("playerId" in props && props.playerId)
}

function SignPlayerSheet(props: SignPlayerSheetProps) {
  const { open, onOpenChange, seasonId, onSuccess } = props
  const playerCentric = isPlayerCentric(props)
  const rosterMode = isRosterMode(props)

  const { t } = useTranslation("common")
  const { t: tErrors } = useTranslation("errors")
  const [selectedPlayerId, setSelectedPlayerId] = useState("")
  const [selectedTeamId, setSelectedTeamId] = useState("")
  const [position, setPosition] = useState<"forward" | "defense" | "goalie">("forward")
  const [jerseyNumber, setJerseyNumber] = useState("")
  const [selectedSeasonId, setSelectedSeasonId] = useState(seasonId)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false)

  const utils = trpc.useUtils()
  const needsPlayerPicker = !playerCentric
  const { data: allPlayers } = trpc.player.list.useQuery(undefined, { enabled: needsPlayerPicker })
  const { data: allSeasons } = trpc.season.list.useQuery(undefined, { enabled: open })

  // Pre-fill team from defaultTeamId in roster mode
  useEffect(() => {
    if (rosterMode && open && (props as RosterModeProps).defaultTeamId) {
      setSelectedTeamId((props as RosterModeProps).defaultTeamId!)
    }
  }, [open, rosterMode, props])

  const availableSeasons = useMemo(() => {
    if (!allSeasons) return []
    return [...allSeasons].sort((a, b) => new Date(a.seasonStart).getTime() - new Date(b.seasonStart).getTime())
  }, [allSeasons])

  const selectedSeason = availableSeasons.find((s) => s.id === selectedSeasonId) ?? null

  const resolvedTeamId = isTeamCentric(props) ? props.teamId : selectedTeamId
  const resolvedPlayerId = playerCentric ? props.playerId : selectedPlayerId

  const isDirty = playerCentric
    ? selectedTeamId !== ""
    : rosterMode
      ? selectedPlayerId !== "" || selectedTeamId !== ((props as RosterModeProps).defaultTeamId ?? "")
      : selectedPlayerId !== ""

  const signMutation = trpc.contract.signPlayer.useMutation({
    onSuccess: () => {
      if (resolvedTeamId) {
        utils.contract.rosterForSeason.invalidate({ teamId: resolvedTeamId, seasonId: selectedSeasonId })
        if (selectedSeasonId !== seasonId) {
          utils.contract.rosterForSeason.invalidate({ teamId: resolvedTeamId, seasonId })
        }
      }
      utils.contract.rosterForSeasonAllTeams.invalidate({ seasonId: selectedSeasonId })
      if (selectedSeasonId !== seasonId) {
        utils.contract.rosterForSeasonAllTeams.invalidate({ seasonId })
      }
      utils.player.getByIdWithHistory.invalidate()
      utils.player.listWithCurrentTeam.invalidate()
      close()
      onSuccess?.()
      toast.success(t("rosterPage.signDialog.toast.signed"))
    },
    onError: (err) => {
      toast.error(t("rosterPage.signDialog.toast.signError"), { description: resolveTranslatedError(err, tErrors) })
    },
  })

  const availablePlayers = useMemo(() => {
    if (playerCentric || !allPlayers) return []
    if (isTeamCentric(props)) {
      const existing = new Set(props.existingPlayerIds)
      return allPlayers.filter((p) => !existing.has(p.id))
    }
    return allPlayers
  }, [allPlayers, playerCentric, props])

  const selectedPlayer = allPlayers?.find((p) => p.id === selectedPlayerId) ?? null

  const teamsForPicker = playerCentric
    ? (props as PlayerCentricProps).teams
    : rosterMode
      ? (props as RosterModeProps).teams
      : []
  const selectedTeam = teamsForPicker.find((t) => t.id === selectedTeamId) ?? null

  function close() {
    onOpenChange(false)
    setSelectedPlayerId("")
    setSelectedTeamId("")
    setPosition("forward")
    setJerseyNumber("")
    setSelectedSeasonId(seasonId)
    setErrors({})
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const next: Record<string, string> = {}
    if (!resolvedPlayerId) next.player = t("rosterPage.signDialog.validation.playerRequired")
    if (!resolvedTeamId) next.team = t("rosterPage.transferDialog.validation.teamRequired")
    setErrors(next)
    if (Object.keys(next).length > 0) return

    signMutation.mutate({
      playerId: resolvedPlayerId!,
      teamId: resolvedTeamId!,
      seasonId: selectedSeasonId,
      position,
      jerseyNumber: jerseyNumber ? Number(jerseyNumber) : undefined,
    })
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange} dirty={isDirty} onDirtyClose={() => setConfirmCloseOpen(true)}>
        <SheetContent>
          <SheetClose />
          <SheetHeader>
            <SheetTitle>{t("rosterPage.signDialog.title")}</SheetTitle>
            <SheetDescription>{t("rosterPage.signDialog.description")}</SheetDescription>
          </SheetHeader>

          <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
            <SheetBody className="space-y-6">
              {/* Team selection (roster mode or player-centric mode) */}
              {(rosterMode || playerCentric) && (
                <FormField
                  label={
                    rosterMode ? t("rosterPage.signDialog.fields.team") : t("rosterPage.transferDialog.fields.newTeam")
                  }
                  error={errors.team}
                  required
                >
                  <TeamCombobox
                    teams={teamsForPicker.map((team) => ({
                      id: team.id,
                      name: team.name,
                      shortName: team.shortName,
                      city: team.city,
                      logoUrl: team.logoUrl,
                      primaryColor: team.primaryColor,
                    }))}
                    value={selectedTeamId}
                    onChange={(teamId) => {
                      setSelectedTeamId(teamId)
                      setErrors((prev) => ({ ...prev, team: "" }))
                    }}
                    placeholder={t("rosterPage.signDialog.fields.teamPlaceholder")}
                  />
                </FormField>
              )}

              {/* Player selection (team-centric or roster mode) */}
              {needsPlayerPicker && (
                <FormField label={t("rosterPage.signDialog.fields.player")} error={errors.player} required>
                  <PlayerCombobox
                    players={availablePlayers.map((p) => ({
                      id: p.id,
                      firstName: p.firstName,
                      lastName: p.lastName,
                      dateOfBirth: p.dateOfBirth,
                      nationality: p.nationality,
                      photoUrl: p.photoUrl,
                    }))}
                    value={selectedPlayerId}
                    onChange={(playerId) => {
                      setSelectedPlayerId(playerId)
                      setErrors((prev) => ({ ...prev, player: "" }))
                    }}
                    placeholder={t("rosterPage.signDialog.fields.playerSearchPlaceholder")}
                  />
                </FormField>
              )}

              {/* Season picker */}
              {availableSeasons.length > 0 && (
                <FormField label={t("rosterPage.signDialog.fields.season")}>
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

              {/* Position */}
              <FormField label={t("rosterPage.signDialog.fields.position")} required>
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

              {/* Jersey Number */}
              <FormField label={t("rosterPage.signDialog.fields.jerseyNumber")}>
                <Input
                  type="number"
                  min="1"
                  max="99"
                  value={jerseyNumber}
                  onChange={(e) => setJerseyNumber(e.target.value)}
                  placeholder={t("rosterPage.signDialog.fields.jerseyNumberPlaceholder")}
                />
              </FormField>

              {/* Summary */}
              {selectedSeason && (resolvedPlayerId || resolvedTeamId) && (
                <div className="p-3 rounded-md bg-emerald-500/5 border border-emerald-500/15">
                  <div className="flex items-center gap-2 text-sm text-foreground">
                    {needsPlayerPicker && selectedPlayer && (
                      <span className="font-medium truncate">
                        {selectedPlayer.firstName} {selectedPlayer.lastName}
                      </span>
                    )}
                    {(rosterMode || playerCentric) && selectedTeam && (
                      <>
                        {needsPlayerPicker && selectedPlayer && <span className="text-muted-foreground">→</span>}
                        <span className="font-medium truncate">{selectedTeam.name}</span>
                      </>
                    )}
                    {((needsPlayerPicker && selectedPlayer) || ((rosterMode || playerCentric) && selectedTeam)) && (
                      <>
                        <span className="text-muted-foreground">·</span>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                          <Calendar className="h-3 w-3" />
                          {selectedSeason.name}
                        </span>
                      </>
                    )}
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
              <Button type="submit" variant="accent" disabled={signMutation.isPending}>
                {signMutation.isPending
                  ? t("rosterPage.signDialog.actions.signing")
                  : t("rosterPage.signDialog.actions.sign")}
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

export type { SignPlayerSheetProps }
export { SignPlayerSheet }
