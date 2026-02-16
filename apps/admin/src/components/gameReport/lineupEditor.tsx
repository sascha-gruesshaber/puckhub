import { Button, toast } from "@puckhub/ui"
import { Save, Users } from "lucide-react"
import { useCallback, useState } from "react"
import { trpc } from "@/trpc"
import { useTranslation } from "~/i18n/use-translation"
import type { ActiveSuspension } from "./suspensionWarnings"
import type { RosterPlayer, SelectedPlayer } from "./teamRosterChecklist"
import { TeamRosterChecklist } from "./teamRosterChecklist"

interface LineupEditorProps {
  gameId: string
  homeTeamId: string
  awayTeamId: string
  homeTeamName: string
  awayTeamName: string
  homeRoster: RosterPlayer[]
  awayRoster: RosterPlayer[]
  existingLineup: Array<{
    playerId: string
    teamId: string
    position: string
    jerseyNumber: number | null
    isStartingGoalie: boolean
  }>
  activeSuspensions: ActiveSuspension[]
  readOnly?: boolean
}

function LineupEditor({
  gameId,
  homeTeamId,
  awayTeamId,
  homeTeamName,
  awayTeamName,
  homeRoster,
  awayRoster,
  existingLineup,
  activeSuspensions,
  readOnly,
}: LineupEditorProps) {
  const { t } = useTranslation("common")
  const utils = trpc.useUtils()

  const [selected, setSelected] = useState<SelectedPlayer[]>(() =>
    existingLineup.map((l) => ({
      playerId: l.playerId,
      teamId: l.teamId,
      position: l.position as "forward" | "defense" | "goalie",
      jerseyNumber: l.jerseyNumber,
      isStartingGoalie: l.isStartingGoalie,
    })),
  )

  const [startingGoalieHome, setStartingGoalieHome] = useState<string | null>(
    () => existingLineup.find((l) => l.isStartingGoalie && l.teamId === homeTeamId)?.playerId ?? null,
  )
  const [startingGoalieAway, setStartingGoalieAway] = useState<string | null>(
    () => existingLineup.find((l) => l.isStartingGoalie && l.teamId === awayTeamId)?.playerId ?? null,
  )

  const setLineup = trpc.gameReport.setLineup.useMutation({
    onSuccess: () => {
      toast.success(t("gameReport.toast.lineupSaved"))
      utils.gameReport.getReport.invalidate({ gameId })
    },
    onError: () => {
      toast.error(t("gameReport.toast.lineupError"))
    },
  })

  const handleToggle = useCallback(
    (player: RosterPlayer, checked: boolean) => {
      setSelected((prev) => {
        if (checked) {
          return [
            ...prev,
            {
              playerId: player.playerId,
              teamId: player.teamId,
              position: player.position,
              jerseyNumber: player.jerseyNumber,
              isStartingGoalie: false,
            },
          ]
        }
        return prev.filter((s) => s.playerId !== player.playerId)
      })

      if (player.position === "goalie") {
        if (checked) {
          // Auto-set first goalie as starting goalie
          if (player.teamId === homeTeamId && !startingGoalieHome) {
            setStartingGoalieHome(player.playerId)
          } else if (player.teamId === awayTeamId && !startingGoalieAway) {
            setStartingGoalieAway(player.playerId)
          }
        } else {
          // Clear starting goalie when unchecking them
          if (player.playerId === startingGoalieHome) {
            setStartingGoalieHome(null)
          } else if (player.playerId === startingGoalieAway) {
            setStartingGoalieAway(null)
          }
        }
      }
    },
    [homeTeamId, awayTeamId, startingGoalieHome, startingGoalieAway],
  )

  const handleSelectAll = useCallback(
    (roster: RosterPlayer[]) => {
      setSelected((prev) => {
        const existingIds = new Set(prev.map((s) => s.playerId))
        const newPlayers = roster
          .filter((p) => !existingIds.has(p.playerId))
          .map((p) => ({
            playerId: p.playerId,
            teamId: p.teamId,
            position: p.position,
            jerseyNumber: p.jerseyNumber,
            isStartingGoalie: false,
          }))
        return [...prev, ...newPlayers]
      })

      // Auto-set first goalie as starter if none set
      const firstGoalie = roster.find((p) => p.position === "goalie")
      if (firstGoalie) {
        if (firstGoalie.teamId === homeTeamId && !startingGoalieHome) {
          setStartingGoalieHome(firstGoalie.playerId)
        } else if (firstGoalie.teamId === awayTeamId && !startingGoalieAway) {
          setStartingGoalieAway(firstGoalie.playerId)
        }
      }
    },
    [homeTeamId, awayTeamId, startingGoalieHome, startingGoalieAway],
  )

  const handleSave = () => {
    const players = selected.map((s) => ({
      ...s,
      isStartingGoalie:
        s.position === "goalie" && (s.playerId === startingGoalieHome || s.playerId === startingGoalieAway),
    }))

    setLineup.mutate({ gameId, players })
  }

  const homeSelected = selected.filter((s) => s.teamId === homeTeamId)
  const awaySelected = selected.filter((s) => s.teamId === awayTeamId)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-3">
          <TeamRosterChecklist
            teamName={homeTeamName}
            teamId={homeTeamId}
            roster={homeRoster}
            selected={homeSelected}
            activeSuspensions={activeSuspensions}
            onToggle={handleToggle}
            onSetStartingGoalie={setStartingGoalieHome}
            startingGoalieId={startingGoalieHome}
            readOnly={readOnly}
          />
          {!readOnly && (
            <Button variant="outline" size="sm" onClick={() => handleSelectAll(homeRoster)} className="w-full">
              <Users className="w-3.5 h-3.5 mr-1.5" />
              {t("gameReport.selectFullRoster")}
            </Button>
          )}
        </div>

        <div className="space-y-3">
          <TeamRosterChecklist
            teamName={awayTeamName}
            teamId={awayTeamId}
            roster={awayRoster}
            selected={awaySelected}
            activeSuspensions={activeSuspensions}
            onToggle={handleToggle}
            onSetStartingGoalie={setStartingGoalieAway}
            startingGoalieId={startingGoalieAway}
            readOnly={readOnly}
          />
          {!readOnly && (
            <Button variant="outline" size="sm" onClick={() => handleSelectAll(awayRoster)} className="w-full">
              <Users className="w-3.5 h-3.5 mr-1.5" />
              {t("gameReport.selectFullRoster")}
            </Button>
          )}
        </div>
      </div>

      {!readOnly && (
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={setLineup.isPending}>
            <Save className="w-4 h-4 mr-2" />
            {setLineup.isPending ? t("gameReport.savingLineup") : t("gameReport.saveLineup")}
          </Button>
        </div>
      )}
    </div>
  )
}

export { LineupEditor }
