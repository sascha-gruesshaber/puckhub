import { useMemo } from "react"
import { PlayerHoverCard } from "~/components/playerHoverCard"
import { TeamHoverCard } from "~/components/teamHoverCard"
import { useWorkingSeason } from "~/contexts/seasonContext"
import { useTranslation } from "~/i18n/use-translation"

interface PlayerStat {
  playerId: string
  teamId: string
  player: { id: string; firstName: string; lastName: string; photoUrl?: string | null } | null
  team: { id: string; name: string; shortName: string; logoUrl?: string | null } | null
  gamesPlayed: number
  goals: number
  assists: number
  totalPoints: number
}

type SortMode = "points" | "goals" | "assists"

interface ScorerTableProps {
  stats: PlayerStat[]
  sortBy: SortMode
  limit?: number
}

function ScorerTable({ stats, sortBy, limit }: ScorerTableProps) {
  const { t } = useTranslation("common")
  const { season } = useWorkingSeason()

  const sorted = useMemo(() => {
    const s = [...stats].sort((a, b) => {
      if (sortBy === "goals") return b.goals - a.goals || b.totalPoints - a.totalPoints
      if (sortBy === "assists") return b.assists - a.assists || b.totalPoints - a.totalPoints
      return b.totalPoints - a.totalPoints || b.goals - a.goals
    })
    return limit ? s.slice(0, limit) : s
  }, [stats, sortBy, limit])

  if (sorted.length === 0) return null

  return (
    <div className="bg-white rounded-xl border border-border/50 shadow-sm overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border/40 text-xs text-muted-foreground uppercase tracking-wider">
            <th className="text-left px-4 py-3 w-10">{t("statsPage.scorers.rank")}</th>
            <th className="text-left px-4 py-3">{t("statsPage.scorers.player")}</th>
            <th className="text-left px-4 py-3 hidden sm:table-cell">{t("statsPage.scorers.team")}</th>
            <th className="text-center px-3 py-3 w-14" title={t("statsPage.tooltips.gp")}>
              <span className="border-b border-dotted border-muted-foreground/50 cursor-help">
                {t("statsPage.scorers.gamesPlayed")}
              </span>
            </th>
            <th
              className={`text-center px-3 py-3 w-14 ${sortBy === "goals" ? "font-bold text-foreground" : ""}`}
              title={t("statsPage.tooltips.g")}
            >
              <span className="border-b border-dotted border-muted-foreground/50 cursor-help">
                {t("statsPage.scorers.goals")}
              </span>
            </th>
            <th
              className={`text-center px-3 py-3 w-14 ${sortBy === "assists" ? "font-bold text-foreground" : ""}`}
              title={t("statsPage.tooltips.a")}
            >
              <span className="border-b border-dotted border-muted-foreground/50 cursor-help">
                {t("statsPage.scorers.assists")}
              </span>
            </th>
            <th
              className={`text-center px-3 py-3 w-14 ${sortBy === "points" ? "font-bold text-foreground" : ""}`}
              title={t("statsPage.tooltips.pts")}
            >
              <span className="border-b border-dotted border-muted-foreground/50 cursor-help">
                {t("statsPage.scorers.totalPoints")}
              </span>
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((stat, i) => (
            <tr
              key={`${stat.playerId}-${stat.teamId}-${i}`}
              className={`border-b border-border/20 hover:bg-accent/5 transition-colors ${i < 3 ? "font-medium" : ""}`}
            >
              <td className="px-4 py-2.5 text-muted-foreground tabular-nums">
                {i < 3 ? (
                  <span
                    className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold"
                    style={{
                      background: i === 0 ? "hsl(44, 87%, 66%)" : i === 1 ? "hsl(0, 0%, 75%)" : "hsl(25, 60%, 60%)",
                      color: i === 0 ? "hsl(44, 87%, 15%)" : "white",
                    }}
                  >
                    {i + 1}
                  </span>
                ) : (
                  i + 1
                )}
              </td>
              <td className="px-4 py-2.5">
                <div className="flex items-center gap-2.5">
                  {stat.team?.logoUrl && (
                    <img
                      src={stat.team.logoUrl}
                      alt=""
                      className="h-5 w-5 rounded-sm object-contain shrink-0 sm:hidden"
                    />
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
                    seasonId={season?.id}
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
              <td className="text-center px-3 py-2.5 text-muted-foreground tabular-nums">{stat.gamesPlayed}</td>
              <td className={`text-center px-3 py-2.5 tabular-nums ${sortBy === "goals" ? "font-bold" : ""}`}>
                {stat.goals}
              </td>
              <td className={`text-center px-3 py-2.5 tabular-nums ${sortBy === "assists" ? "font-bold" : ""}`}>
                {stat.assists}
              </td>
              <td className={`text-center px-3 py-2.5 tabular-nums ${sortBy === "points" ? "font-bold" : ""}`}>
                {stat.totalPoints}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export { ScorerTable }
export type { PlayerStat, SortMode }
