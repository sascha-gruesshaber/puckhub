import { Card, CardContent, Skeleton } from "@puckhub/ui"
import { useTranslation } from "~/i18n/use-translation"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SeasonInfo {
  id: string
  name: string
}

interface TeamInfo {
  id: string
  name: string
  shortName: string
  logoUrl: string | null
}

interface PlayerSeasonStatRow {
  id: string
  gamesPlayed: number
  goals: number
  assists: number
  totalPoints: number
  penaltyMinutes: number
  season: SeasonInfo
  team: TeamInfo
}

interface GoalieSeasonStatRow {
  id: string
  gamesPlayed: number
  goalsAgainst: number
  gaa: { toString(): string } | null
  season: SeasonInfo
  team: TeamInfo
}

// ---------------------------------------------------------------------------
// Team logo helper
// ---------------------------------------------------------------------------

function TeamCell({ team }: { team: TeamInfo }) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className="w-5 h-5 shrink-0 rounded-sm overflow-hidden flex items-center justify-center bg-muted">
        {team.logoUrl ? (
          <img src={team.logoUrl} alt="" className="w-full h-full object-contain" />
        ) : (
          <span className="text-[8px] font-bold text-muted-foreground">{team.shortName.slice(0, 2).toUpperCase()}</span>
        )}
      </div>
      <span className="truncate text-sm">{team.shortName}</span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Skater Season Stats Table
// ---------------------------------------------------------------------------

function SkaterSeasonStatsTable({ stats, isLoading }: { stats: PlayerSeasonStatRow[]; isLoading: boolean }) {
  const { t } = useTranslation("common")

  const totals = stats.reduce(
    (acc, s) => ({
      gamesPlayed: acc.gamesPlayed + s.gamesPlayed,
      goals: acc.goals + s.goals,
      assists: acc.assists + s.assists,
      totalPoints: acc.totalPoints + s.totalPoints,
      penaltyMinutes: acc.penaltyMinutes + s.penaltyMinutes,
    }),
    { gamesPlayed: 0, goals: 0, assists: 0, totalPoints: 0, penaltyMinutes: 0 },
  )

  if (isLoading) return <TableSkeleton cols={7} />

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="py-2 pr-3 font-medium">{t("playersPage.history.season")}</th>
            <th className="py-2 pr-3 font-medium">{t("playersPage.history.team")}</th>
            <th className="py-2 pr-3 font-medium text-right" title={t("playersPage.history.gpFull")}>{t("playersPage.history.gp")}</th>
            <th className="py-2 pr-3 font-medium text-right" title={t("playersPage.history.goalsFull")}>{t("playersPage.history.goals")}</th>
            <th className="py-2 pr-3 font-medium text-right" title={t("playersPage.history.assistsFull")}>{t("playersPage.history.assists")}</th>
            <th className="py-2 pr-3 font-medium text-right" title={t("playersPage.history.pointsFull")}>{t("playersPage.history.points")}</th>
            <th className="py-2 font-medium text-right" title={t("playersPage.history.pimFull")}>{t("playersPage.history.pim")}</th>
          </tr>
        </thead>
        <tbody>
          {stats.map((s) => (
            <tr key={s.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
              <td className="py-2 pr-3 whitespace-nowrap">{s.season.name}</td>
              <td className="py-2 pr-3"><TeamCell team={s.team} /></td>
              <td className="py-2 pr-3 text-right tabular-nums">{s.gamesPlayed}</td>
              <td className="py-2 pr-3 text-right tabular-nums">{s.goals}</td>
              <td className="py-2 pr-3 text-right tabular-nums">{s.assists}</td>
              <td className="py-2 pr-3 text-right tabular-nums font-semibold">{s.totalPoints}</td>
              <td className="py-2 text-right tabular-nums">{s.penaltyMinutes}</td>
            </tr>
          ))}
        </tbody>
        {stats.length > 1 && (
          <tfoot>
            <tr className="font-bold">
              <td className="py-2 pr-3">{t("playersPage.history.careerTotals")}</td>
              <td className="py-2 pr-3" />
              <td className="py-2 pr-3 text-right tabular-nums">{totals.gamesPlayed}</td>
              <td className="py-2 pr-3 text-right tabular-nums">{totals.goals}</td>
              <td className="py-2 pr-3 text-right tabular-nums">{totals.assists}</td>
              <td className="py-2 pr-3 text-right tabular-nums">{totals.totalPoints}</td>
              <td className="py-2 text-right tabular-nums">{totals.penaltyMinutes}</td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Goalie Season Stats Table
// ---------------------------------------------------------------------------

function GoalieSeasonStatsTable({ stats, isLoading }: { stats: GoalieSeasonStatRow[]; isLoading: boolean }) {
  const { t } = useTranslation("common")

  const totals = stats.reduce(
    (acc, s) => ({
      gamesPlayed: acc.gamesPlayed + s.gamesPlayed,
      goalsAgainst: acc.goalsAgainst + s.goalsAgainst,
    }),
    { gamesPlayed: 0, goalsAgainst: 0 },
  )

  const careerGaa = totals.gamesPlayed > 0 ? (totals.goalsAgainst / totals.gamesPlayed).toFixed(2) : "0.00"

  if (isLoading) return <TableSkeleton cols={5} />

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="py-2 pr-3 font-medium">{t("playersPage.history.season")}</th>
            <th className="py-2 pr-3 font-medium">{t("playersPage.history.team")}</th>
            <th className="py-2 pr-3 font-medium text-right" title={t("playersPage.history.gpFull")}>{t("playersPage.history.gp")}</th>
            <th className="py-2 pr-3 font-medium text-right" title={t("playersPage.history.gaFull")}>{t("playersPage.history.ga")}</th>
            <th className="py-2 font-medium text-right" title={t("playersPage.history.gaaFull")}>{t("playersPage.history.gaa")}</th>
          </tr>
        </thead>
        <tbody>
          {stats.map((s) => (
            <tr key={s.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
              <td className="py-2 pr-3 whitespace-nowrap">{s.season.name}</td>
              <td className="py-2 pr-3"><TeamCell team={s.team} /></td>
              <td className="py-2 pr-3 text-right tabular-nums">{s.gamesPlayed}</td>
              <td className="py-2 pr-3 text-right tabular-nums">{s.goalsAgainst}</td>
              <td className="py-2 text-right tabular-nums font-semibold">{s.gaa ? Number(s.gaa.toString()).toFixed(2) : "–"}</td>
            </tr>
          ))}
        </tbody>
        {stats.length > 1 && (
          <tfoot>
            <tr className="font-bold">
              <td className="py-2 pr-3">{t("playersPage.history.careerTotals")}</td>
              <td className="py-2 pr-3" />
              <td className="py-2 pr-3 text-right tabular-nums">{totals.gamesPlayed}</td>
              <td className="py-2 pr-3 text-right tabular-nums">{totals.goalsAgainst}</td>
              <td className="py-2 text-right tabular-nums">{careerGaa}</td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Wrapper component
// ---------------------------------------------------------------------------

function PlayerSeasonStatsTable({
  isGoalie,
  playerStats,
  goalieStats,
  isLoading,
}: {
  isGoalie: boolean
  playerStats: PlayerSeasonStatRow[] | undefined
  goalieStats: GoalieSeasonStatRow[] | undefined
  isLoading: boolean
}) {
  const { t } = useTranslation("common")

  return (
    <div>
      <h2 className="text-lg font-semibold mb-3">{t("playersPage.history.seasonStats")}</h2>
      <Card>
        <CardContent className="p-4">
          {isGoalie ? (
            <GoalieSeasonStatsTable stats={goalieStats ?? []} isLoading={isLoading} />
          ) : (
            <SkaterSeasonStatsTable stats={playerStats ?? []} isLoading={isLoading} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Table Skeleton
// ---------------------------------------------------------------------------

function TableSkeleton({ cols }: { cols: number }) {
  return (
    <div className="space-y-3">
      <div className="flex gap-4">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1 rounded" />
        ))}
      </div>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex gap-4">
          {Array.from({ length: cols }).map((_, j) => (
            <Skeleton key={j} className="h-5 flex-1 rounded" />
          ))}
        </div>
      ))}
    </div>
  )
}

export { PlayerSeasonStatsTable }
