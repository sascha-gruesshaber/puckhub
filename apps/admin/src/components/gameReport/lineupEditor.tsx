import { Button, toast } from "@puckhub/ui"
import { Check, Loader2, Save, Users } from "lucide-react"
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react"
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
  /** When true, save button is not rendered inline (caller renders it externally) */
  externalActions?: boolean
  /** When true, lineup is auto-saved on every change (debounced) */
  autoSave?: boolean
}

export interface LineupEditorHandle {
  save: () => void
  isSaving: boolean
}

const LineupEditor = forwardRef<LineupEditorHandle, LineupEditorProps>(function LineupEditor(
  {
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
    externalActions,
    autoSave,
  },
  ref,
) {
  const { t } = useTranslation("common")
  const utils = trpc.useUtils()
  const [changeCounter, setChangeCounter] = useState(0)
  const [autoSaveStatus, setAutoSaveStatus] = useState<"idle" | "saving" | "saved">("idle")

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
      if (autoSave) {
        setAutoSaveStatus("saved")
        setTimeout(() => setAutoSaveStatus("idle"), 3000)
      } else {
        toast.success(t("gameReport.toast.lineupSaved"))
      }
      utils.gameReport.getReport.invalidate({ gameId })
    },
    onError: () => {
      toast.error(t("gameReport.toast.lineupError"))
      setAutoSaveStatus("idle")
    },
  })

  const handleToggle = useCallback(
    (player: RosterPlayer, checked: boolean) => {
      if (autoSave) setChangeCounter((c) => c + 1)
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
    [homeTeamId, awayTeamId, startingGoalieHome, startingGoalieAway, autoSave],
  )

  const handleSelectAll = useCallback(
    (roster: RosterPlayer[]) => {
      if (autoSave) setChangeCounter((c) => c + 1)
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
    [homeTeamId, awayTeamId, startingGoalieHome, startingGoalieAway, autoSave],
  )

  // Wrap starting goalie setters to trigger auto-save
  const handleSetStartingGoalieHome = useCallback(
    (playerId: string | null) => {
      if (autoSave) setChangeCounter((c) => c + 1)
      setStartingGoalieHome(playerId)
    },
    [autoSave],
  )

  const handleSetStartingGoalieAway = useCallback(
    (playerId: string | null) => {
      if (autoSave) setChangeCounter((c) => c + 1)
      setStartingGoalieAway(playerId)
    },
    [autoSave],
  )

  const handleSave = () => {
    const players = selected.map((s) => ({
      ...s,
      isStartingGoalie:
        s.position === "goalie" && (s.playerId === startingGoalieHome || s.playerId === startingGoalieAway),
    }))

    setLineup.mutate({ gameId, players })
  }

  useImperativeHandle(ref, () => ({
    save: handleSave,
    isSaving: setLineup.isPending,
  }))

  // Auto-save: debounce mutations when the user changes anything
  const selectedRef = useRef(selected)
  selectedRef.current = selected
  const startingGoalieHomeRef = useRef(startingGoalieHome)
  startingGoalieHomeRef.current = startingGoalieHome
  const startingGoalieAwayRef = useRef(startingGoalieAway)
  startingGoalieAwayRef.current = startingGoalieAway

  useEffect(() => {
    if (!autoSave || changeCounter === 0) return

    setAutoSaveStatus("saving")
    const timer = setTimeout(() => {
      const players = selectedRef.current.map((s) => ({
        ...s,
        isStartingGoalie:
          s.position === "goalie" &&
          (s.playerId === startingGoalieHomeRef.current || s.playerId === startingGoalieAwayRef.current),
      }))
      setLineup.mutate({ gameId, players })
    }, 800)

    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [changeCounter, autoSave, gameId, setLineup.mutate])

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
            onSetStartingGoalie={handleSetStartingGoalieHome}
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
            onSetStartingGoalie={handleSetStartingGoalieAway}
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

      {!readOnly && !externalActions && !autoSave && (
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={setLineup.isPending}>
            <Save className="w-4 h-4 mr-2" />
            {setLineup.isPending ? t("gameReport.savingLineup") : t("gameReport.saveLineup")}
          </Button>
        </div>
      )}

      {autoSave && !readOnly && (
        <div className="flex items-center justify-end gap-1.5 h-5">
          {autoSaveStatus === "saving" && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" />
              {t("gameReport.savingLineup")}
            </span>
          )}
          {autoSaveStatus === "saved" && (
            <span className="text-xs text-emerald-600 flex items-center gap-1">
              <Check className="w-3 h-3" />
              {t("gameReport.toast.lineupSaved")}
            </span>
          )}
        </div>
      )}
    </div>
  )
})

export { LineupEditor }
