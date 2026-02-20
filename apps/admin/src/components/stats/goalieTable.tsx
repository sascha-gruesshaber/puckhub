import { Badge } from "@puckhub/ui"
import { Info } from "lucide-react"
import { PlayerHoverCard } from "~/components/playerHoverCard"
import { TeamHoverCard } from "~/components/teamHoverCard"
import { useWorkingSeason } from "~/contexts/seasonContext"
import { useTranslation } from "~/i18n/use-translation"

interface GoalieStat {
  playerId: string
  teamId: string
  player: { id: string; firstName: string; lastName: string; photoUrl?: string | null } | null
  team: { id: string; name: string; shortName: string; logoUrl?: string | null } | null
  gamesPlayed: number
  goalsAgainst: number
  gaa: string | number | null
}

interface GoalieTableProps {
  qualified: GoalieStat[]
  belowThreshold: GoalieStat[]
  minGames: number
}

function GoalieRow({ stat, rank, seasonId }: { stat: GoalieStat; rank: number; seasonId?: string }) {
  return (
    <tr className="border-b border-border/20 hover:bg-accent/5 transition-colors">
      <td className="px-4 py-2.5 text-muted-foreground tabular-nums">
        {rank <= 3 ? (
          <span
            className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold"
            style={{
              background: rank === 1 ? "hsl(44, 87%, 66%)" : rank === 2 ? "hsl(0, 0%, 75%)" : "hsl(25, 60%, 60%)",
              color: rank === 1 ? "hsl(44, 87%, 15%)" : "white",
            }}
          >
            {rank}
          </span>
        ) : (
          rank
        )}
      </td>
      <td className="px-4 py-2.5">
        <div className="flex items-center gap-2.5">
          {stat.team?.logoUrl && (
            <img src={stat.team.logoUrl} alt="" className="h-5 w-5 rounded-sm object-contain shrink-0 sm:hidden" />
          )}
          {stat.player ? (
            <PlayerHoverCard
              playerId={stat.player.id}
              name={`${stat.player.firstName} ${stat.player.lastName}`}
              team={
                stat.team
                  ? {
                      id: stat.team.id,
                      name: stat.team.name,
                      shortName: stat.team.shortName,
                      logoUrl: stat.team.logoUrl,
                    }
                  : undefined
              }
              position="goalie"
            >
              <span className="cursor-pointer hover:underline decoration-dotted underline-offset-2">
                <span className="text-muted-foreground">{stat.player.firstName?.charAt(0)}.</span>{" "}
                <span className="font-semibold">{stat.player.lastName}</span>
              </span>
            </PlayerHoverCard>
          ) : (
            <span>–</span>
          )}
        </div>
      </td>
      <td className="px-4 py-2.5 hidden sm:table-cell">
        {stat.team ? (
          <TeamHoverCard
            teamId={stat.team.id}
            name={stat.team.name}
            shortName={stat.team.shortName}
            logoUrl={stat.team.logoUrl}
            seasonId={seasonId}
          >
            <div className="flex items-center gap-2 cursor-pointer hover:underline decoration-dotted underline-offset-2">
              {stat.team.logoUrl && (
                <img src={stat.team.logoUrl} alt="" className="h-5 w-5 rounded-sm object-contain" />
              )}
              <span className="text-muted-foreground">{stat.team.shortName}</span>
            </div>
          </TeamHoverCard>
        ) : (
          <span className="text-muted-foreground">–</span>
        )}
      </td>
      <td className="text-center px-3 py-2.5 tabular-nums">{stat.gamesPlayed}</td>
      <td className="text-center px-3 py-2.5 tabular-nums">{stat.goalsAgainst}</td>
      <td className="text-center px-3 py-2.5 font-bold tabular-nums">
        {stat.gaa != null ? Number(stat.gaa).toFixed(2) : "–"}
      </td>
      <td className="text-center px-3 py-2.5 tabular-nums hidden md:table-cell">
        {stat.gamesPlayed > 0 ? (stat.goalsAgainst / stat.gamesPlayed).toFixed(2) : "–"}
      </td>
    </tr>
  )
}

function GoalieTable({ qualified, belowThreshold, minGames }: GoalieTableProps) {
  const { t } = useTranslation("common")
  const { season } = useWorkingSeason()

  const headerRow = (
    <tr className="border-b border-border/40 text-xs text-muted-foreground uppercase tracking-wider">
      <th className="text-left px-4 py-3 w-10">{t("statsPage.goalies.rank")}</th>
      <th className="text-left px-4 py-3">{t("statsPage.goalies.player")}</th>
      <th className="text-left px-4 py-3 hidden sm:table-cell">{t("statsPage.goalies.team")}</th>
      <th className="text-center px-3 py-3 w-14" title={t("statsPage.tooltips.gp")}>
        <span className="border-b border-dotted border-muted-foreground/50 cursor-help">
          {t("statsPage.goalies.gamesPlayed")}
        </span>
      </th>
      <th className="text-center px-3 py-3 w-14" title={t("statsPage.tooltips.ga")}>
        <span className="border-b border-dotted border-muted-foreground/50 cursor-help">
          {t("statsPage.goalies.goalsAgainst")}
        </span>
      </th>
      <th className="text-center px-3 py-3 w-14 font-bold text-foreground" title={t("statsPage.tooltips.gaa")}>
        <span className="border-b border-dotted border-muted-foreground/50 cursor-help">
          {t("statsPage.goalies.gaa")}
        </span>
      </th>
      <th className="text-center px-3 py-3 w-20 hidden md:table-cell" title={t("statsPage.tooltips.gaPerGp")}>
        <span className="border-b border-dotted border-muted-foreground/50 cursor-help">GA/GP</span>
      </th>
    </tr>
  )

  return (
    <div className="space-y-4">
      {/* Min games info */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Info className="h-4 w-4" />
        <span>{t("statsPage.goalies.minGamesInfo", { min: String(minGames) })}</span>
      </div>

      {/* Qualified */}
      {qualified.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-sm font-semibold uppercase tracking-wide">{t("statsPage.goalies.qualified")}</h3>
            <Badge variant="secondary" className="text-xs">
              {qualified.length}
            </Badge>
          </div>
          <div className="bg-white rounded-xl border border-border/50 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>{headerRow}</thead>
              <tbody>
                {qualified.map((stat, i) => (
                  <GoalieRow key={`q-${stat.playerId}-${i}`} stat={stat} rank={i + 1} seasonId={season?.id} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Below threshold */}
      {belowThreshold.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {t("statsPage.goalies.belowThreshold")}
            </h3>
            <Badge variant="outline" className="text-xs">
              {belowThreshold.length}
            </Badge>
          </div>
          <div className="bg-white rounded-xl border border-border/50 shadow-sm overflow-hidden opacity-75">
            <table className="w-full text-sm">
              <thead>{headerRow}</thead>
              <tbody>
                {belowThreshold.map((stat, i) => (
                  <GoalieRow key={`bt-${stat.playerId}-${i}`} stat={stat} rank={i + 1} seasonId={season?.id} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

export { GoalieTable }
export type { GoalieStat }
