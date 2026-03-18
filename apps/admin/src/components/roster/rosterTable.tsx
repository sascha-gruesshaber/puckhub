import { Badge, Button } from "@puckhub/ui"
import { ArrowRightLeft, UserMinus } from "lucide-react"
import { useMemo } from "react"
import { useTranslation } from "~/i18n/use-translation"

const POSITION_ORDER = ["goalie", "defense", "forward"] as const

const POSITION_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  goalie: { bg: "bg-blue-500/10", text: "text-blue-700", border: "border-l-blue-500" },
  defense: { bg: "bg-emerald-500/10", text: "text-emerald-700", border: "border-l-emerald-500" },
  forward: { bg: "bg-red-500/10", text: "text-red-700", border: "border-l-red-500" },
}

interface ContractRow {
  id: string
  position: string
  jerseyNumber: number | null
  startSeasonId: string
  endSeasonId: string | null
  teamId: string
  team: {
    id: string
    name: string
    shortName: string
    logoUrl: string | null
    primaryColor: string | null
  }
  player: {
    id: string
    firstName: string
    lastName: string
    dateOfBirth: Date | null
    nationality: string | null
    photoUrl: string | null
  }
}

interface TeamInfo {
  id: string
  name: string
  shortName: string
  logoUrl: string | null
  primaryColor: string | null
}

interface RosterTableProps {
  contracts: ContractRow[]
  teams: TeamInfo[]
  onEdit: (contract: ContractRow) => void
  onRelease: (contract: ContractRow) => void
  onTransfer: (contract: ContractRow) => void
  /** Hide team section headers (useful when only one team is shown in context) */
  hideTeamHeaders?: boolean
}

function RosterTable({ contracts, teams, onEdit, onRelease, onTransfer, hideTeamHeaders }: RosterTableProps) {
  const { t } = useTranslation("common")

  // Group contracts by team, ordered by the teams array
  const groupedByTeam = useMemo(() => {
    const teamMap = new Map<string, ContractRow[]>()
    for (const c of contracts) {
      const list = teamMap.get(c.teamId) ?? []
      list.push(c)
      teamMap.set(c.teamId, list)
    }

    // Sort players within each team: by position order, then jersey number, then last name
    for (const [, list] of teamMap) {
      list.sort((a, b) => {
        const posA = POSITION_ORDER.indexOf(a.position as (typeof POSITION_ORDER)[number])
        const posB = POSITION_ORDER.indexOf(b.position as (typeof POSITION_ORDER)[number])
        if (posA !== posB) return posA - posB
        if (a.jerseyNumber !== null && b.jerseyNumber !== null) return a.jerseyNumber - b.jerseyNumber
        if (a.jerseyNumber !== null) return -1
        if (b.jerseyNumber !== null) return 1
        return a.player.lastName.localeCompare(b.player.lastName)
      })
    }

    // Return in team order (matching the teams prop order)
    return teams
      .filter((team) => teamMap.has(team.id))
      .map((team) => ({
        team,
        players: teamMap.get(team.id)!,
      }))
  }, [contracts, teams])

  let globalRowIndex = 0

  return (
    <div>
      {groupedByTeam.map((group, sectionIndex) => (
        <div
          key={group.team.id}
          className={`data-section ${sectionIndex > 0 ? "mt-10" : ""}`}
          style={{ "--section-index": sectionIndex } as React.CSSProperties}
        >
          {/* Team section header */}
          {!hideTeamHeaders && (
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted overflow-hidden">
                {group.team.logoUrl ? (
                  <img src={group.team.logoUrl} alt="" className="h-full w-full object-contain" />
                ) : (
                  <span
                    className="flex h-full w-full items-center justify-center text-[10px] font-bold text-white"
                    style={{ backgroundColor: group.team.primaryColor ?? undefined }}
                  >
                    {group.team.shortName.slice(0, 2).toUpperCase()}
                  </span>
                )}
              </div>
              <h3 className="text-base font-bold tracking-wide text-foreground">{group.team.name}</h3>
              <div className="flex-1" />
              <Badge variant="secondary" className="text-xs">
                {group.players.length} {t("rosterPage.count.players")}
              </Badge>
            </div>
          )}

          {/* Player rows */}
          <div className="bg-white rounded-xl shadow-sm border border-border/50 overflow-hidden">
            {group.players.map((c, i) => {
              const rowIndex = globalRowIndex++
              const posColors = POSITION_COLORS[c.position] ?? POSITION_COLORS.forward
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => onEdit(c)}
                  className={`data-row group flex items-center gap-2 sm:gap-4 px-3 sm:px-4 py-2.5 sm:py-3.5 hover:bg-accent/5 transition-colors cursor-pointer w-full text-left ${
                    i < group.players.length - 1 ? "border-b border-border/40" : ""
                  }`}
                  style={{ "--row-index": rowIndex } as React.CSSProperties}
                >
                  {/* Jersey number badge */}
                  <div className="w-10 sm:w-16 flex justify-center shrink-0">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${
                        c.jerseyNumber !== null ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {c.jerseyNumber ?? "–"}
                    </div>
                  </div>

                  {/* Avatar + Name */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted overflow-hidden">
                      {c.player.photoUrl ? (
                        <img
                          src={c.player.photoUrl}
                          alt={`${c.player.firstName} ${c.player.lastName}`}
                          className="h-full w-full rounded-lg object-cover"
                        />
                      ) : (
                        <span className="text-xs font-bold text-muted-foreground">
                          {c.player.firstName[0]}
                          {c.player.lastName[0]}
                        </span>
                      )}
                    </div>
                    <span className="text-sm truncate">
                      <span className="text-muted-foreground">{c.player.firstName}</span>{" "}
                      <span className="font-semibold text-foreground">{c.player.lastName}</span>
                    </span>
                  </div>

                  {/* Position badge */}
                  <div className="w-20 shrink-0 hidden sm:flex justify-center">
                    <span
                      className={`inline-block text-[11px] font-semibold rounded-full px-2.5 py-0.5 ${posColors?.bg ?? ""} ${posColors?.text ?? ""}`}
                    >
                      {t(`rosterPage.positions.${c.position}`)}
                    </span>
                  </div>

                  {/* Nationality */}
                  <div className="w-20 shrink-0 hidden md:block">
                    {c.player.nationality ? (
                      <span className="inline-block bg-muted text-xs rounded px-1.5 py-0.5 font-medium">
                        {c.player.nationality}
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">–</span>
                    )}
                  </div>

                  {/* Transfer + Release actions */}
                  <div className="shrink-0 flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs h-8 px-2 md:px-3"
                      onClick={(e) => {
                        e.stopPropagation()
                        onTransfer(c)
                      }}
                      title={t("rosterPage.table.actions.transfer")}
                      aria-label={t("rosterPage.table.actions.transfer")}
                    >
                      <ArrowRightLeft className="h-3.5 w-3.5 md:mr-1.5" />
                      <span className="hidden md:inline">{t("rosterPage.table.actions.transfer")}</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs h-8 px-2 md:px-3 text-destructive hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation()
                        onRelease(c)
                      }}
                      title={t("rosterPage.table.actions.releasePlayer")}
                      aria-label={t("rosterPage.table.actions.releasePlayer")}
                    >
                      <UserMinus className="h-3.5 w-3.5 md:mr-1.5" />
                      <span className="hidden md:inline">{t("rosterPage.table.actions.releasePlayer")}</span>
                    </Button>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

export type { ContractRow }
export { POSITION_ORDER, RosterTable }
