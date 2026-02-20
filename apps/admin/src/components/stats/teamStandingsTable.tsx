import { TeamHoverCard } from "~/components/teamHoverCard"
import { useWorkingSeason } from "~/contexts/seasonContext"
import { useTranslation } from "~/i18n/use-translation"

interface Standing {
  id: string
  teamId: string
  gamesPlayed: number
  wins: number
  draws: number
  losses: number
  goalsFor: number
  goalsAgainst: number
  goalDifference: number
  totalPoints: number
  rank: number | null
}

interface TeamInfo {
  id: string
  name: string
  shortName: string
  logoUrl?: string | null
}

interface TeamStandingsTableProps {
  standings: Standing[]
  teams: TeamInfo[]
}

function TeamStandingsTable({ standings, teams }: TeamStandingsTableProps) {
  const { t } = useTranslation("common")
  const { season } = useWorkingSeason()
  const teamMap = new Map(teams.map((t) => [t.id, t]))

  if (standings.length === 0) return null

  return (
    <div className="bg-white rounded-xl border border-border/50 shadow-sm overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border/40 text-xs text-muted-foreground uppercase tracking-wider">
            <th className="text-left px-4 py-3 w-10">{t("statsPage.teamsTab.rank")}</th>
            <th className="text-left px-4 py-3">{t("statsPage.teamsTab.team")}</th>
            <th className="text-center px-3 py-3 w-12" title={t("statsPage.tooltips.gp")}>
              <span className="border-b border-dotted border-muted-foreground/50 cursor-help">
                {t("statsPage.teamsTab.gamesPlayed")}
              </span>
            </th>
            <th className="text-center px-3 py-3 w-10" title={t("statsPage.tooltips.w")}>
              <span className="border-b border-dotted border-muted-foreground/50 cursor-help">
                {t("statsPage.teamsTab.wins")}
              </span>
            </th>
            <th className="text-center px-3 py-3 w-10" title={t("statsPage.tooltips.d")}>
              <span className="border-b border-dotted border-muted-foreground/50 cursor-help">
                {t("statsPage.teamsTab.draws")}
              </span>
            </th>
            <th className="text-center px-3 py-3 w-10" title={t("statsPage.tooltips.l")}>
              <span className="border-b border-dotted border-muted-foreground/50 cursor-help">
                {t("statsPage.teamsTab.losses")}
              </span>
            </th>
            <th className="text-center px-3 py-3 w-12 hidden sm:table-cell" title={t("statsPage.tooltips.gf")}>
              <span className="border-b border-dotted border-muted-foreground/50 cursor-help">
                {t("statsPage.teamsTab.goalsFor")}
              </span>
            </th>
            <th className="text-center px-3 py-3 w-12 hidden sm:table-cell" title={t("statsPage.tooltips.gaTeam")}>
              <span className="border-b border-dotted border-muted-foreground/50 cursor-help">
                {t("statsPage.teamsTab.goalsAgainst")}
              </span>
            </th>
            <th className="text-center px-3 py-3 w-12 hidden md:table-cell" title={t("statsPage.tooltips.gd")}>
              <span className="border-b border-dotted border-muted-foreground/50 cursor-help">
                {t("statsPage.teamsTab.goalDifference")}
              </span>
            </th>
            <th className="text-center px-3 py-3 w-14 font-bold text-foreground" title={t("statsPage.tooltips.pts")}>
              <span className="border-b border-dotted border-muted-foreground/50 cursor-help">
                {t("statsPage.teamsTab.points")}
              </span>
            </th>
          </tr>
        </thead>
        <tbody>
          {standings.map((s, i) => {
            const team = teamMap.get(s.teamId)
            return (
              <tr key={s.id} className="border-b border-border/20 hover:bg-accent/5 transition-colors">
                <td className="px-4 py-2.5 text-muted-foreground tabular-nums font-medium">{s.rank ?? i + 1}</td>
                <td className="px-4 py-2.5">
                  {team ? (
                    <TeamHoverCard
                      teamId={team.id}
                      name={team.name}
                      shortName={team.shortName}
                      logoUrl={team.logoUrl}
                      seasonId={season?.id}
                    >
                      <div className="flex items-center gap-2.5 cursor-pointer hover:underline decoration-dotted underline-offset-2">
                        {team.logoUrl && (
                          <img src={team.logoUrl} alt="" className="h-5 w-5 rounded-sm object-contain shrink-0" />
                        )}
                        <span className="font-medium">{team.name}</span>
                      </div>
                    </TeamHoverCard>
                  ) : (
                    <span>–</span>
                  )}
                </td>
                <td className="text-center px-3 py-2.5 tabular-nums">{s.gamesPlayed}</td>
                <td className="text-center px-3 py-2.5 tabular-nums">{s.wins}</td>
                <td className="text-center px-3 py-2.5 tabular-nums">{s.draws}</td>
                <td className="text-center px-3 py-2.5 tabular-nums">{s.losses}</td>
                <td className="text-center px-3 py-2.5 tabular-nums hidden sm:table-cell">{s.goalsFor}</td>
                <td className="text-center px-3 py-2.5 tabular-nums hidden sm:table-cell">{s.goalsAgainst}</td>
                <td
                  className={`text-center px-3 py-2.5 tabular-nums hidden md:table-cell ${s.goalDifference > 0 ? "text-green-600" : s.goalDifference < 0 ? "text-red-500" : ""}`}
                >
                  {s.goalDifference > 0 ? `+${s.goalDifference}` : s.goalDifference}
                </td>
                <td className="text-center px-3 py-2.5 font-bold tabular-nums">{s.totalPoints}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export { TeamStandingsTable }
export type { Standing, TeamInfo }
