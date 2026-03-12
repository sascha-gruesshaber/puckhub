import { Badge } from "@puckhub/ui"
import { ArrowDownLeft, ArrowUpRight } from "lucide-react"
import { useMemo } from "react"
import { useTranslation } from "~/i18n/use-translation"

interface ContractInfo {
  id: string
  playerId: string
  position: string
  jerseyNumber: number | null
  startSeason: { id: string }
  endSeason: { id: string } | null
  player: { firstName: string; lastName: string; photoUrl: string | null }
}

interface RosterChangesProps {
  seasonId: string
  contracts: ContractInfo[]
}

const positionColors: Record<string, string> = {
  forward: "hsl(354, 85%, 42%)",
  defense: "hsl(142, 71%, 45%)",
  goalie: "hsl(199, 89%, 48%)",
}

function RosterChanges({ seasonId, contracts }: RosterChangesProps) {
  const { t } = useTranslation("common")

  const { joined, left } = useMemo(() => {
    const joined = contracts.filter((c) => c.startSeason.id === seasonId)
    const left = contracts.filter((c) => c.endSeason?.id === seasonId)
    return { joined, left }
  }, [contracts, seasonId])

  if (joined.length === 0 && left.length === 0) return null

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <p className="text-xs font-medium text-muted-foreground">{t("teamsPage.history.rosterChanges")}</p>
        <span className="text-[10px] text-muted-foreground tabular-nums">
          +{joined.length} / −{left.length}
        </span>
      </div>

      {joined.length > 0 && (
        <div className="space-y-1">
          {joined.map((c) => (
            <div key={c.id} className="flex items-center gap-2 text-xs">
              <ArrowDownLeft className="h-3 w-3 text-emerald-500 shrink-0" />
              <span className="font-medium">
                {c.player.firstName} {c.player.lastName}
              </span>
              <Badge
                variant="outline"
                className="text-[9px] px-1 py-0"
                style={{ borderColor: positionColors[c.position] ?? undefined }}
              >
                {t(`teamsPage.history.position.${c.position}`, { defaultValue: c.position })}
              </Badge>
              {c.jerseyNumber !== null && (
                <span className="text-muted-foreground tabular-nums">#{c.jerseyNumber}</span>
              )}
            </div>
          ))}
        </div>
      )}

      {left.length > 0 && (
        <div className="space-y-1">
          {left.map((c) => (
            <div key={`left-${c.id}`} className="flex items-center gap-2 text-xs">
              <ArrowUpRight className="h-3 w-3 text-red-500 shrink-0" />
              <span className="font-medium text-muted-foreground">
                {c.player.firstName} {c.player.lastName}
              </span>
              <Badge
                variant="outline"
                className="text-[9px] px-1 py-0"
                style={{ borderColor: positionColors[c.position] ?? undefined }}
              >
                {t(`teamsPage.history.position.${c.position}`, { defaultValue: c.position })}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export { RosterChanges }
