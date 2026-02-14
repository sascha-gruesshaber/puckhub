import { Badge, Button } from "@puckhub/ui"
import { ArrowRightLeft, Pencil, UserMinus } from "lucide-react"
import { useMemo } from "react"
import { PlayerHoverCard } from "~/components/playerHoverCard"
import { useTranslation } from "~/i18n/use-translation"

const POSITION_ORDER = ["goalie", "defense", "forward"] as const

const POSITION_BORDER_COLORS: Record<string, string> = {
  goalie: "border-l-blue-500",
  defense: "border-l-emerald-500",
  forward: "border-l-red-500",
}

interface ContractRow {
  id: string
  position: string
  jerseyNumber: number | null
  player: {
    id: string
    firstName: string
    lastName: string
    dateOfBirth: Date | null
    nationality: string | null
    photoUrl: string | null
  }
}

interface RosterTableProps {
  contracts: ContractRow[]
  onEdit: (contract: ContractRow) => void
  onRelease: (contract: ContractRow) => void
  onTransfer: (contract: ContractRow) => void
}

function RosterTable({ contracts, onEdit, onRelease, onTransfer }: RosterTableProps) {
  const { t } = useTranslation("common")
  const grouped = useMemo(() => {
    const map = new Map<string, ContractRow[]>()
    for (const pos of POSITION_ORDER) {
      map.set(pos, [])
    }
    for (const c of contracts) {
      const list = map.get(c.position) ?? []
      list.push(c)
      map.set(c.position, list)
    }
    // Sort each group by jersey number then last name
    for (const [, list] of map) {
      list.sort((a, b) => {
        if (a.jerseyNumber !== null && b.jerseyNumber !== null) {
          return a.jerseyNumber - b.jerseyNumber
        }
        if (a.jerseyNumber !== null) return -1
        if (b.jerseyNumber !== null) return 1
        return a.player.lastName.localeCompare(b.player.lastName)
      })
    }
    return map
  }, [contracts])

  let globalRowIndex = 0
  let sectionIndex = 0

  return (
    <div>
      {POSITION_ORDER.map((pos) => {
        const players = grouped.get(pos) ?? []
        if (players.length === 0) return null

        const currentSectionIndex = sectionIndex++

        return (
          <div
            key={pos}
            className={`data-section ${currentSectionIndex > 0 ? "mt-10" : ""}`}
            style={{ "--section-index": currentSectionIndex } as React.CSSProperties}
          >
            {/* Position section header */}
            <div className={`flex items-center gap-3 mb-3 pl-3 border-l-3 ${POSITION_BORDER_COLORS[pos]}`}>
              <h3 className="text-base font-bold tracking-wide uppercase text-foreground">
                {t(`rosterPage.positions.${pos}`)}
              </h3>
              <div className="flex-1" />
              <Badge variant="secondary" className="text-xs">
                {players.length}
              </Badge>
            </div>

            {/* Player rows */}
            <div className="bg-white rounded-xl shadow-sm border border-border/50 overflow-hidden">
              {players.map((c, i) => {
                const rowIndex = globalRowIndex++
                return (
                  <div
                    key={c.id}
                    className={`data-row group flex items-center gap-4 px-4 py-3.5 hover:bg-accent/5 transition-colors ${
                      i < players.length - 1 ? "border-b border-border/40" : ""
                    }`}
                    style={{ "--row-index": rowIndex } as React.CSSProperties}
                  >
                    {/* Jersey number badge */}
                    <div className="w-16 flex justify-center shrink-0">
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
                      <PlayerHoverCard player={c.player} position={c.position} jerseyNumber={c.jerseyNumber}>
                        <div className="flex items-center gap-3">
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
                      </PlayerHoverCard>
                    </div>

                    {/* Nationality */}
                    <div className="w-28 shrink-0">
                      {c.player.nationality ? (
                        <span className="inline-block bg-muted text-xs rounded px-1.5 py-0.5 font-medium">
                          {c.player.nationality}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">–</span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="shrink-0 flex justify-end">
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs h-8 px-2 md:px-3"
                          onClick={() => onEdit(c)}
                          title={t("rosterPage.table.actions.editContract")}
                          aria-label={t("rosterPage.table.actions.editContract")}
                        >
                          <Pencil className="h-3.5 w-3.5 md:mr-1.5" />
                          <span className="hidden md:inline">{t("rosterPage.table.actions.editContract")}</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs h-8 px-2 md:px-3"
                          onClick={() => onTransfer(c)}
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
                          onClick={() => onRelease(c)}
                          title={t("rosterPage.table.actions.releasePlayer")}
                          aria-label={t("rosterPage.table.actions.releasePlayer")}
                        >
                          <UserMinus className="h-3.5 w-3.5 md:mr-1.5" />
                          <span className="hidden md:inline">{t("rosterPage.table.actions.releasePlayer")}</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export { RosterTable, POSITION_ORDER }
export type { ContractRow }
