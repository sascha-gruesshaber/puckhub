import { Card, CardHeader, Skeleton } from "@puckhub/ui"
import { Goal, Shield, Swords, Target, Timer } from "lucide-react"
import { useTranslation } from "~/i18n/use-translation"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PlayerCareerStat {
  gamesPlayed: number
  goals: number
  assists: number
  totalPoints: number
  penaltyMinutes: number
}

interface GoalieCareerStat {
  gamesPlayed: number
  goalsAgainst: number
  gaa: { toString(): string } | null
}

interface CareerStatsSummaryProps {
  isGoalie: boolean
  playerStats: PlayerCareerStat[] | undefined
  goalieStats: GoalieCareerStat[] | undefined
  isLoading: boolean
}

// ---------------------------------------------------------------------------
// Stat Card (reuses dashboard pattern)
// ---------------------------------------------------------------------------

function StatCard({
  label,
  value,
  icon,
  color,
  isLoading,
  tooltip,
}: {
  label: string
  value: string | number
  icon: React.ReactNode
  color: string
  isLoading: boolean
  tooltip?: string
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3" title={tooltip}>
          <div
            className="flex h-9 w-9 items-center justify-center rounded-lg shrink-0"
            style={{ background: `${color}15`, color }}
          >
            {icon}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground truncate">{label}</p>
            {isLoading ? (
              <Skeleton className="h-7 w-14 mt-0.5" />
            ) : (
              <p className="text-2xl font-bold leading-tight tabular-nums">{value}</p>
            )}
          </div>
        </div>
      </CardHeader>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Career Stats Summary
// ---------------------------------------------------------------------------

function CareerStatsSummary({ isGoalie, playerStats, goalieStats, isLoading }: CareerStatsSummaryProps) {
  const { t } = useTranslation("common")

  if (isGoalie) {
    const totals = (goalieStats ?? []).reduce(
      (acc, s) => ({
        gamesPlayed: acc.gamesPlayed + s.gamesPlayed,
        goalsAgainst: acc.goalsAgainst + s.goalsAgainst,
      }),
      { gamesPlayed: 0, goalsAgainst: 0 },
    )

    // Weighted GAA: total goals against / total games
    const careerGaa =
      totals.gamesPlayed > 0 ? (totals.goalsAgainst / totals.gamesPlayed).toFixed(2) : "0.00"

    return (
      <div>
        <h2 className="text-lg font-semibold mb-3">{t("playersPage.history.careerStats")}</h2>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
          <StatCard
            label={t("playersPage.history.gp")}
            tooltip={t("playersPage.history.gpFull")}
            value={totals.gamesPlayed}
            icon={<Swords size={18} />}
            color="hsl(215, 55%, 23%)"
            isLoading={isLoading}
          />
          <StatCard
            label={t("playersPage.history.ga")}
            tooltip={t("playersPage.history.gaFull")}
            value={totals.goalsAgainst}
            icon={<Target size={18} />}
            color="hsl(354, 85%, 42%)"
            isLoading={isLoading}
          />
          <StatCard
            label={t("playersPage.history.gaa")}
            tooltip={t("playersPage.history.gaaFull")}
            value={careerGaa}
            icon={<Shield size={18} />}
            color="hsl(199, 89%, 48%)"
            isLoading={isLoading}
          />
        </div>
      </div>
    )
  }

  // Skater
  const totals = (playerStats ?? []).reduce(
    (acc, s) => ({
      gamesPlayed: acc.gamesPlayed + s.gamesPlayed,
      goals: acc.goals + s.goals,
      assists: acc.assists + s.assists,
      totalPoints: acc.totalPoints + s.totalPoints,
      penaltyMinutes: acc.penaltyMinutes + s.penaltyMinutes,
    }),
    { gamesPlayed: 0, goals: 0, assists: 0, totalPoints: 0, penaltyMinutes: 0 },
  )

  return (
    <div>
      <h2 className="text-lg font-semibold mb-3">{t("playersPage.history.careerStats")}</h2>
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard
          label={t("playersPage.history.gp")}
          tooltip={t("playersPage.history.gpFull")}
          value={totals.gamesPlayed}
          icon={<Swords size={18} />}
          color="hsl(215, 55%, 23%)"
          isLoading={isLoading}
        />
        <StatCard
          label={t("playersPage.history.goals")}
          tooltip={t("playersPage.history.goalsFull")}
          value={totals.goals}
          icon={<Goal size={18} />}
          color="hsl(142, 71%, 45%)"
          isLoading={isLoading}
        />
        <StatCard
          label={t("playersPage.history.assists")}
          tooltip={t("playersPage.history.assistsFull")}
          value={totals.assists}
          icon={<Target size={18} />}
          color="hsl(44, 87%, 50%)"
          isLoading={isLoading}
        />
        <StatCard
          label={t("playersPage.history.points")}
          tooltip={t("playersPage.history.pointsFull")}
          value={totals.totalPoints}
          icon={<Swords size={18} />}
          color="hsl(199, 89%, 48%)"
          isLoading={isLoading}
        />
        <StatCard
          label={t("playersPage.history.pim")}
          tooltip={t("playersPage.history.pimFull")}
          value={totals.penaltyMinutes}
          icon={<Timer size={18} />}
          color="hsl(354, 85%, 42%)"
          isLoading={isLoading}
        />
      </div>
    </div>
  )
}

export { CareerStatsSummary }
