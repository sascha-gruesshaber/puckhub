import { AlertTriangle } from "lucide-react"
import { useTranslation } from "~/i18n/use-translation"

interface ActiveSuspension {
  id: string
  playerId: string
  teamId: string
  suspensionType: string
  suspendedGames: number
  servedGames: number
  reason: string | null
  playerFirstName: string
  playerLastName: string
}

interface SuspensionWarningsProps {
  suspensions: ActiveSuspension[]
  homeTeamId: string
  awayTeamId: string
  homeTeamName: string
  awayTeamName: string
}

function SuspensionWarnings({
  suspensions,
  homeTeamId,
  awayTeamId,
  homeTeamName,
  awayTeamName,
}: SuspensionWarningsProps) {
  const { t } = useTranslation("common")

  const relevant = suspensions.filter((s) => s.teamId === homeTeamId || s.teamId === awayTeamId)

  if (relevant.length === 0) return null

  const homeSuspensions = relevant.filter((s) => s.teamId === homeTeamId)
  const awaySuspensions = relevant.filter((s) => s.teamId === awayTeamId)

  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/30 p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
        <div className="space-y-2 text-sm">
          <p className="font-semibold text-amber-800 dark:text-amber-300">{t("gameReport.suspensionWarnings.title")}</p>
          {homeSuspensions.length > 0 && (
            <div>
              <span className="font-medium">{homeTeamName}:</span>{" "}
              {homeSuspensions.map((s) => (
                <span
                  key={s.id}
                  className="inline-flex items-center gap-1 mr-2 px-2 py-0.5 rounded bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 text-xs font-medium"
                >
                  {s.playerFirstName} {s.playerLastName}
                  <span className="text-[10px] opacity-70">
                    ({s.servedGames}/{s.suspendedGames})
                  </span>
                </span>
              ))}
            </div>
          )}
          {awaySuspensions.length > 0 && (
            <div>
              <span className="font-medium">{awayTeamName}:</span>{" "}
              {awaySuspensions.map((s) => (
                <span
                  key={s.id}
                  className="inline-flex items-center gap-1 mr-2 px-2 py-0.5 rounded bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 text-xs font-medium"
                >
                  {s.playerFirstName} {s.playerLastName}
                  <span className="text-[10px] opacity-70">
                    ({s.servedGames}/{s.suspendedGames})
                  </span>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export { SuspensionWarnings }
export type { ActiveSuspension }
