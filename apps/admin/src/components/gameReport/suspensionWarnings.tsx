import { AlertTriangle, Calendar, Shield } from "lucide-react"
import { HoverCard } from "~/components/hoverCard"
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
  gameScheduledAt: Date | null
  gameHomeTeamName: string
  gameAwayTeamName: string
}

interface SuspensionWarningsProps {
  suspensions: ActiveSuspension[]
  homeTeamId: string
  awayTeamId: string
}

/** Visual dot indicator: filled dots = served, empty dots = remaining */
function ProgressDots({ served, total }: { served: number; total: number }) {
  return (
    <span className="inline-flex gap-1 items-center">
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={`inline-block w-2 h-2 rounded-full ${
            i < served ? "bg-orange-500 dark:bg-orange-400" : "bg-gray-300 dark:bg-gray-600"
          }`}
        />
      ))}
    </span>
  )
}

const suspensionTypeLabels: Record<string, { de: string; en: string }> = {
  match_penalty: { de: "Matchstrafe", en: "Match penalty" },
  game_misconduct: { de: "Spieldauer-Disziplinarstrafe", en: "Game misconduct" },
}

function SuspensionHoverContent({ suspension }: { suspension: ActiveSuspension }) {
  const { t } = useTranslation("common")

  const formattedDate = suspension.gameScheduledAt
    ? suspension.gameScheduledAt.toLocaleDateString("de-DE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—"

  const typeLabel = suspensionTypeLabels[suspension.suspensionType]?.de ?? suspension.suspensionType

  return (
    <div className="p-4 space-y-3 text-sm">
      <div className="flex items-center gap-2 font-semibold text-orange-700 dark:text-orange-300">
        <Shield className="w-4 h-4" />
        <span>
          {suspension.playerFirstName} {suspension.playerLastName}
        </span>
      </div>

      <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-[13px]">
        <span className="text-muted-foreground">{t("gameReport.suspensionWarnings.type")}:</span>
        <span className="font-medium">{typeLabel}</span>

        <span className="text-muted-foreground">{t("gameReport.suspensionWarnings.on")}:</span>
        <span className="flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
          {formattedDate}
        </span>

        <span className="text-muted-foreground">{t("gameReport.suspensionWarnings.originGame")}:</span>
        <span>
          {suspension.gameHomeTeamName} {t("gameReport.suspensionWarnings.vs")} {suspension.gameAwayTeamName}
        </span>

        {suspension.reason && (
          <>
            <span className="text-muted-foreground">{t("gameReport.suspensionWarnings.reason")}:</span>
            <span>{suspension.reason}</span>
          </>
        )}

        <span className="text-muted-foreground">{t("gameReport.suspensionWarnings.progressLabel")}:</span>
        <span className="flex items-center gap-2">
          <ProgressDots served={suspension.servedGames} total={suspension.suspendedGames} />
          <span className="text-xs text-muted-foreground">
            {t("gameReport.suspensionWarnings.progress", {
              served: suspension.servedGames,
              total: suspension.suspendedGames,
            })}
          </span>
        </span>
      </div>
    </div>
  )
}

function SuspensionPlayerRow({ suspension }: { suspension: ActiveSuspension }) {
  const typeLabel = suspensionTypeLabels[suspension.suspensionType]?.de ?? suspension.suspensionType

  return (
    <div className="flex items-center gap-3 py-1.5">
      <HoverCard content={<SuspensionHoverContent suspension={suspension} />} showDelay={200} hideDelay={100}>
        <span className="text-[13px] font-medium text-foreground cursor-default hover:underline decoration-dotted underline-offset-2">
          {suspension.playerFirstName} {suspension.playerLastName}
        </span>
      </HoverCard>

      <span className="text-xs text-muted-foreground">{typeLabel}</span>

      <span className="ml-auto flex items-center gap-1.5">
        <ProgressDots served={suspension.servedGames} total={suspension.suspendedGames} />
      </span>
    </div>
  )
}

function SuspensionWarnings({ suspensions, homeTeamId, awayTeamId }: SuspensionWarningsProps) {
  const { t } = useTranslation("common")

  const relevant = suspensions.filter((s) => s.teamId === homeTeamId || s.teamId === awayTeamId)

  if (relevant.length === 0) return null

  const homeSuspensions = relevant.filter((s) => s.teamId === homeTeamId)
  const awaySuspensions = relevant.filter((s) => s.teamId === awayTeamId)

  return (
    <div className="rounded-lg border-2 border-red-500 dark:border-red-500 bg-muted/50 dark:bg-muted/30 p-4">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
        <p className="font-semibold text-foreground text-sm">{t("gameReport.suspensionWarnings.title")}</p>
      </div>

      <div className="grid grid-cols-2 gap-8">
        {/* Home team (left) */}
        <div className="space-y-0.5 pr-4">
          {homeSuspensions.map((s) => (
            <SuspensionPlayerRow key={s.id} suspension={s} />
          ))}
        </div>

        {/* Away team (right) */}
        <div className="space-y-0.5 pl-4">
          {awaySuspensions.map((s) => (
            <SuspensionPlayerRow key={s.id} suspension={s} />
          ))}
        </div>
      </div>
    </div>
  )
}

export { SuspensionWarnings }
export type { ActiveSuspension }
