import { Badge } from "@puckhub/ui"
import { PlayerHoverCard } from "~/components/playerHoverCard"
import { TeamHoverCard } from "~/components/teamHoverCard"
import { useWorkingSeason } from "~/contexts/seasonContext"
import { useTranslation } from "~/i18n/use-translation"

interface PenaltyBreakdown {
  penaltyType: { name: string; shortName?: string | null } | null
  count: number
  minutes: number
}

interface PenaltyPlayerStat {
  player: { id: string; firstName: string; lastName: string } | null
  team: { id: string; name: string; shortName: string; logoUrl?: string | null } | null
  totalMinutes: number
  totalCount: number
  breakdown: PenaltyBreakdown[]
}

interface PenaltyPlayerTableProps {
  stats: PenaltyPlayerStat[]
  limit?: number
}

function PenaltyPlayerTable({ stats, limit }: PenaltyPlayerTableProps) {
  const { t } = useTranslation("common")
  const { season } = useWorkingSeason()
  const display = limit ? stats.slice(0, limit) : stats

  if (display.length === 0) return null

  return (
    <div className="bg-white rounded-xl border border-border/50 shadow-sm overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border/40 text-xs text-muted-foreground uppercase tracking-wider">
            <th className="text-left px-4 py-3 w-10">{t("statsPage.penalties.rank")}</th>
            <th className="text-left px-4 py-3">{t("statsPage.penalties.player")}</th>
            <th className="text-left px-4 py-3 hidden sm:table-cell">{t("statsPage.penalties.team")}</th>
            <th className="text-center px-3 py-3 w-14" title={t("statsPage.tooltips.pen")}>
              <span className="border-b border-dotted border-muted-foreground/50 cursor-help">
                {t("statsPage.penalties.totalCount")}
              </span>
            </th>
            <th className="text-center px-3 py-3 w-14 font-bold text-foreground" title={t("statsPage.tooltips.pim")}>
              <span className="border-b border-dotted border-muted-foreground/50 cursor-help">
                {t("statsPage.penalties.totalMinutes")}
              </span>
            </th>
            <th className="text-left px-4 py-3 hidden lg:table-cell">{t("statsPage.penalties.breakdown")}</th>
          </tr>
        </thead>
        <tbody>
          {display.map((stat, i) => (
            <tr
              key={`${stat.player?.id}-${stat.team?.id}-${i}`}
              className="border-b border-border/20 hover:bg-accent/5 transition-colors"
            >
              <td className="px-4 py-2.5 text-muted-foreground tabular-nums">{i + 1}</td>
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
              <td className="text-center px-3 py-2.5 text-muted-foreground tabular-nums">{stat.totalCount}</td>
              <td className="text-center px-3 py-2.5 font-bold tabular-nums">{stat.totalMinutes}</td>
              <td className="px-4 py-2.5 hidden lg:table-cell">
                <div className="flex flex-wrap gap-1">
                  {stat.breakdown
                    .sort((a, b) => b.minutes - a.minutes)
                    .slice(0, 3)
                    .map((b, bi) => (
                      <Badge key={bi} variant="secondary" className="text-xs font-normal">
                        {b.penaltyType?.shortName ?? b.penaltyType?.name ?? t("statsPage.penalties.unknownType")} (
                        {b.minutes}')
                      </Badge>
                    ))}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export { PenaltyPlayerTable }
export type { PenaltyPlayerStat }
