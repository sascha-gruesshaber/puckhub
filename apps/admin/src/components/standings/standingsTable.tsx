import { cn } from "@puckhub/ui"
import { ArrowDown, ArrowUp, Minus } from "lucide-react"
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
  points: number
  bonusPoints: number
  totalPoints: number
  rank: number | null
  previousRank: number | null
}

interface TeamInfo {
  id: string
  name: string
  shortName: string
  logoUrl?: string | null
}

interface FormEntry {
  result: "W" | "D" | "L"
  opponentId: string
  goalsFor: number
  goalsAgainst: number
}

interface TeamFormEntry {
  teamId: string
  form: FormEntry[]
}

interface StandingsTableProps {
  standings: Standing[]
  teams: TeamInfo[]
  teamForm?: TeamFormEntry[]
  promotionZoneSize?: number
  relegationZoneSize?: number
  showBonusPoints?: boolean
}

function PositionChange({ rank, previousRank }: { rank: number | null; previousRank: number | null }) {
  if (rank == null || previousRank == null) {
    return <Minus className="h-3 w-3 text-muted-foreground/40" />
  }

  const diff = previousRank - rank
  if (diff > 0) {
    return (
      <span className="flex items-center text-green-600" title={`+${diff}`}>
        <ArrowUp className="h-3 w-3" />
      </span>
    )
  }
  if (diff < 0) {
    return (
      <span className="flex items-center text-red-500" title={`${diff}`}>
        <ArrowDown className="h-3 w-3" />
      </span>
    )
  }
  return <Minus className="h-3 w-3 text-muted-foreground/40" />
}

function FormIndicator({ form, teamMap }: { form: FormEntry[]; teamMap: Map<string, TeamInfo> }) {
  const { t } = useTranslation("common")

  const colorMap = {
    W: "bg-green-500 text-white",
    D: "bg-amber-400 text-white",
    L: "bg-red-500 text-white",
  }

  const letterMap = {
    W: t("standingsPage.form.win"),
    D: t("standingsPage.form.draw"),
    L: t("standingsPage.form.loss"),
  }

  const tooltipLabelMap = {
    W: t("standingsPage.tooltips.formWin"),
    D: t("standingsPage.tooltips.formDraw"),
    L: t("standingsPage.tooltips.formLoss"),
  }

  return (
    <div className="flex items-center gap-1">
      {form.map((entry, i) => {
        const opponent = teamMap.get(entry.opponentId)
        const opponentName = opponent?.shortName ?? opponent?.name ?? "?"
        const tooltip = `${entry.goalsFor}:${entry.goalsAgainst} – ${tooltipLabelMap[entry.result]} vs. ${opponentName}`
        return (
          <span
            key={i}
            className={cn(
              "inline-flex items-center justify-center h-5 w-5 rounded-full text-[10px] font-bold cursor-default",
              colorMap[entry.result],
            )}
            title={tooltip}
          >
            {letterMap[entry.result]}
          </span>
        )
      })}
    </div>
  )
}

function StandingsTable({
  standings,
  teams,
  teamForm,
  promotionZoneSize = 0,
  relegationZoneSize = 0,
  showBonusPoints,
}: StandingsTableProps) {
  const { t } = useTranslation("common")
  const { season } = useWorkingSeason()
  const teamMap = new Map(teams.map((t) => [t.id, t]))
  const formMap = new Map<string, FormEntry[]>(teamForm?.map((f) => [f.teamId, f.form]) ?? [])

  const hasBonusPoints = showBonusPoints ?? standings.some((s) => s.bonusPoints !== 0)

  if (standings.length === 0) return null

  function getZoneClass(index: number) {
    if (promotionZoneSize > 0 && index < promotionZoneSize) {
      return "border-l-2 border-l-green-500 bg-green-50/50"
    }
    if (relegationZoneSize > 0 && index >= standings.length - relegationZoneSize) {
      return "border-l-2 border-l-red-500 bg-red-50/50"
    }
    return ""
  }

  return (
    <div className="bg-white rounded-xl border border-border/50 shadow-sm overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border/40 text-xs text-muted-foreground uppercase tracking-wider">
            <th className="text-left px-4 py-3 w-14">
              <span title={t("standingsPage.tooltips.rank")}>{t("standingsPage.columns.rank")}</span>
            </th>
            <th className="text-left px-4 py-3">{t("standingsPage.columns.team")}</th>
            {teamForm && teamForm.length > 0 && (
              <th className="text-center px-3 py-3 hidden lg:table-cell">{t("standingsPage.columns.form")}</th>
            )}
            <th className="text-center px-3 py-3 w-12" title={t("standingsPage.tooltips.gamesPlayed")}>
              <span className="border-b border-dotted border-muted-foreground/50 cursor-help">
                {t("standingsPage.columns.gamesPlayed")}
              </span>
            </th>
            <th className="text-center px-3 py-3 w-10" title={t("standingsPage.tooltips.wins")}>
              <span className="border-b border-dotted border-muted-foreground/50 cursor-help">
                {t("standingsPage.columns.wins")}
              </span>
            </th>
            <th className="text-center px-3 py-3 w-10" title={t("standingsPage.tooltips.draws")}>
              <span className="border-b border-dotted border-muted-foreground/50 cursor-help">
                {t("standingsPage.columns.draws")}
              </span>
            </th>
            <th className="text-center px-3 py-3 w-10" title={t("standingsPage.tooltips.losses")}>
              <span className="border-b border-dotted border-muted-foreground/50 cursor-help">
                {t("standingsPage.columns.losses")}
              </span>
            </th>
            <th
              className="text-center px-3 py-3 w-12 hidden sm:table-cell"
              title={t("standingsPage.tooltips.goalsFor")}
            >
              <span className="border-b border-dotted border-muted-foreground/50 cursor-help">
                {t("standingsPage.columns.goalsFor")}
              </span>
            </th>
            <th
              className="text-center px-3 py-3 w-12 hidden sm:table-cell"
              title={t("standingsPage.tooltips.goalsAgainst")}
            >
              <span className="border-b border-dotted border-muted-foreground/50 cursor-help">
                {t("standingsPage.columns.goalsAgainst")}
              </span>
            </th>
            <th
              className="text-center px-3 py-3 w-12 hidden md:table-cell"
              title={t("standingsPage.tooltips.goalDifference")}
            >
              <span className="border-b border-dotted border-muted-foreground/50 cursor-help">
                {t("standingsPage.columns.goalDifference")}
              </span>
            </th>
            {hasBonusPoints ? (
              <>
                <th className="text-center px-3 py-3 w-12" title={t("standingsPage.tooltips.points")}>
                  <span className="border-b border-dotted border-muted-foreground/50 cursor-help">
                    {t("standingsPage.columns.points")}
                  </span>
                </th>
                <th
                  className="text-center px-3 py-3 w-12 hidden md:table-cell"
                  title={t("standingsPage.tooltips.bonusPoints")}
                >
                  <span className="border-b border-dotted border-muted-foreground/50 cursor-help">
                    {t("standingsPage.columns.bonusPoints")}
                  </span>
                </th>
                <th
                  className="text-center px-3 py-3 w-14 font-bold text-foreground"
                  title={t("standingsPage.tooltips.totalPoints")}
                >
                  <span className="border-b border-dotted border-muted-foreground/50 cursor-help">
                    {t("standingsPage.columns.totalPoints")}
                  </span>
                </th>
              </>
            ) : (
              <th
                className="text-center px-3 py-3 w-14 font-bold text-foreground"
                title={t("standingsPage.tooltips.points")}
              >
                <span className="border-b border-dotted border-muted-foreground/50 cursor-help">
                  {t("standingsPage.columns.points")}
                </span>
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {standings.map((s, i) => {
            const team = teamMap.get(s.teamId)
            const form = formMap.get(s.teamId)
            const zoneClass = getZoneClass(i)

            return (
              <tr key={s.id} className={cn("border-b border-border/20 hover:bg-accent/5 transition-colors", zoneClass)}>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-muted-foreground tabular-nums font-medium w-5">{s.rank ?? i + 1}</span>
                    <PositionChange rank={s.rank} previousRank={s.previousRank} />
                  </div>
                </td>
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
                {teamForm && teamForm.length > 0 && (
                  <td className="text-center px-3 py-2.5 hidden lg:table-cell">
                    {form ? <FormIndicator form={form} teamMap={teamMap} /> : null}
                  </td>
                )}
                <td className="text-center px-3 py-2.5 tabular-nums">{s.gamesPlayed}</td>
                <td className="text-center px-3 py-2.5 tabular-nums">{s.wins}</td>
                <td className="text-center px-3 py-2.5 tabular-nums">{s.draws}</td>
                <td className="text-center px-3 py-2.5 tabular-nums">{s.losses}</td>
                <td className="text-center px-3 py-2.5 tabular-nums hidden sm:table-cell">{s.goalsFor}</td>
                <td className="text-center px-3 py-2.5 tabular-nums hidden sm:table-cell">{s.goalsAgainst}</td>
                <td
                  className={cn(
                    "text-center px-3 py-2.5 tabular-nums hidden md:table-cell",
                    s.goalDifference > 0 ? "text-green-600" : s.goalDifference < 0 ? "text-red-500" : "",
                  )}
                >
                  {s.goalDifference > 0 ? `+${s.goalDifference}` : s.goalDifference}
                </td>
                {hasBonusPoints ? (
                  <>
                    <td className="text-center px-3 py-2.5 tabular-nums">{s.points}</td>
                    <td
                      className={cn(
                        "text-center px-3 py-2.5 tabular-nums hidden md:table-cell",
                        s.bonusPoints > 0 ? "text-green-600" : s.bonusPoints < 0 ? "text-red-500" : "",
                      )}
                    >
                      {s.bonusPoints > 0 ? `+${s.bonusPoints}` : s.bonusPoints !== 0 ? s.bonusPoints : "–"}
                    </td>
                    <td className="text-center px-3 py-2.5 font-bold tabular-nums">{s.totalPoints}</td>
                  </>
                ) : (
                  <td className="text-center px-3 py-2.5 font-bold tabular-nums">{s.totalPoints}</td>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export { StandingsTable }
export type { Standing, TeamInfo, TeamFormEntry }
