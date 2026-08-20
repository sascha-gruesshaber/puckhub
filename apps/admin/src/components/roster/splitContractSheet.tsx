import {
  Button,
  FormField,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Sheet,
  SheetBody,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  toast,
} from "@puckhub/ui"
import { ArrowDown } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { trpc } from "@/trpc"
import { PlayerInfoCard } from "~/components/player/playerInfoCard"
import { useTranslation } from "~/i18n/use-translation"
import { resolveTranslatedError } from "~/lib/errorI18n"
import type { ContractRow } from "./rosterTable"

interface SplitContractSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  contract: ContractRow | null
  /** Called after the split succeeded, so the caller can refresh its queries. */
  onSplit?: () => void
}

type PositionValue = "forward" | "defense" | "goalie"

/**
 * Splits one contract into two at a season boundary.
 *
 * Imported players carry a single contract with today's position for their whole
 * career, because the legacy leagues keep no history of a change. Splitting restores
 * what was true per season without touching any game data.
 */
function SplitContractSheet({ open, onOpenChange, contract, onSplit }: SplitContractSheetProps) {
  const { t } = useTranslation("common")
  const { t: tErrors } = useTranslation("errors")
  const [splitSeasonId, setSplitSeasonId] = useState("")
  const [position, setPosition] = useState<PositionValue>("forward")
  const [jerseyNumber, setJerseyNumber] = useState("")

  const { data: allSeasons } = trpc.season.list.useQuery(undefined, { enabled: open })

  const orderedSeasons = useMemo(() => {
    if (!allSeasons) return []
    return [...allSeasons].sort((a, b) => new Date(a.seasonStart).getTime() - new Date(b.seasonStart).getTime())
  }, [allSeasons])

  // A split takes effect after the contract started and no later than the season it
  // ended in — everything else would move the spell instead of dividing it.
  const splittableSeasons = useMemo(() => {
    if (!contract) return []
    const startIdx = orderedSeasons.findIndex((s) => s.id === contract.startSeasonId)
    if (startIdx === -1) return []
    const endIdx = contract.endSeasonId ? orderedSeasons.findIndex((s) => s.id === contract.endSeasonId) : -1
    const lastIdx = endIdx === -1 ? orderedSeasons.length - 1 : endIdx
    return orderedSeasons.slice(startIdx + 1, lastIdx + 1)
  }, [orderedSeasons, contract])

  useEffect(() => {
    if (!contract) return
    setPosition(contract.position as PositionValue)
    setJerseyNumber(contract.jerseyNumber?.toString() ?? "")
    setSplitSeasonId("")
  }, [contract])

  const startSeasonName = orderedSeasons.find((s) => s.id === contract?.startSeasonId)?.name ?? null
  const endSeasonName = contract?.endSeasonId
    ? (orderedSeasons.find((s) => s.id === contract.endSeasonId)?.name ?? null)
    : null
  const splitSeason = splittableSeasons.find((s) => s.id === splitSeasonId) ?? null
  const seasonBeforeSplit = useMemo(() => {
    if (!splitSeason) return null
    const idx = orderedSeasons.findIndex((s) => s.id === splitSeason.id)
    return idx > 0 ? (orderedSeasons[idx - 1] ?? null) : null
  }, [orderedSeasons, splitSeason])

  const splitMutation = trpc.contract.splitContract.useMutation({
    onSuccess: () => {
      onSplit?.()
      onOpenChange(false)
      toast.success(t("rosterPage.splitDialog.toast.split"))
    },
    onError: (err) => {
      toast.error(t("rosterPage.splitDialog.toast.splitError"), {
        description: resolveTranslatedError(err, tErrors),
      })
    },
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!contract || !splitSeasonId) return

    splitMutation.mutate({
      contractId: contract.id,
      splitAtSeasonId: splitSeasonId,
      position,
      jerseyNumber: jerseyNumber ? Number(jerseyNumber) : null,
    })
  }

  if (!contract) return null

  const earlierRange =
    seasonBeforeSplit && startSeasonName ? `${startSeasonName} – ${seasonBeforeSplit.name}` : (startSeasonName ?? "")
  const laterRange = splitSeason
    ? `${splitSeason.name} – ${endSeasonName ?? t("playersPage.playerDetail.ongoing")}`
    : ""

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetClose />
        <SheetHeader>
          <SheetTitle>{t("rosterPage.splitDialog.title")}</SheetTitle>
          <SheetDescription>
            {t("rosterPage.splitDialog.description", {
              player: `${contract.player.firstName} ${contract.player.lastName}`,
              team: contract.team.name,
            })}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
          <SheetBody className="space-y-6">
            <PlayerInfoCard
              player={contract.player}
              position={contract.position}
              jerseyNumber={contract.jerseyNumber}
              sinceSeasonName={startSeasonName}
            />

            {splittableSeasons.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("rosterPage.splitDialog.notSplittable")}</p>
            ) : (
              <>
                <FormField label={t("rosterPage.splitDialog.fields.effectiveSeason")} required>
                  <Select value={splitSeasonId} onValueChange={setSplitSeasonId}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={t("rosterPage.splitDialog.fields.effectiveSeasonPlaceholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      {splittableSeasons.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>

                <FormField label={t("rosterPage.splitDialog.fields.newPosition")} required>
                  <Select value={position} onValueChange={(v) => setPosition(v as PositionValue)}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="goalie">{t("rosterPage.positions.goalie")}</SelectItem>
                      <SelectItem value="defense">{t("rosterPage.positions.defense")}</SelectItem>
                      <SelectItem value="forward">{t("rosterPage.positions.forward")}</SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>

                <FormField label={t("rosterPage.splitDialog.fields.newJerseyNumber")}>
                  <Input
                    type="number"
                    min="1"
                    max="99"
                    value={jerseyNumber}
                    onChange={(e) => setJerseyNumber(e.target.value)}
                    placeholder={t("rosterPage.editDialog.fields.jerseyNumberPlaceholder")}
                  />
                </FormField>

                {splitSeason && (
                  <div className="p-3 rounded-md bg-primary/5 border border-primary/15 space-y-2 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-muted-foreground">{earlierRange}</span>
                      <span className="font-medium">
                        {t(`rosterPage.positions.${contract.position}`)}
                        {contract.jerseyNumber != null && ` · #${contract.jerseyNumber}`}
                      </span>
                    </div>
                    <ArrowDown className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-muted-foreground">{laterRange}</span>
                      <span className="font-medium">
                        {t(`rosterPage.positions.${position}`)}
                        {jerseyNumber && ` · #${jerseyNumber}`}
                      </span>
                    </div>
                  </div>
                )}

                <p className="text-xs text-muted-foreground leading-relaxed">{t("rosterPage.splitDialog.hint")}</p>
              </>
            )}
          </SheetBody>

          <SheetFooter>
            <div className="flex-1" />
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("cancel")}
            </Button>
            <Button type="submit" variant="accent" disabled={!splitSeasonId || splitMutation.isPending}>
              {splitMutation.isPending
                ? t("rosterPage.splitDialog.actions.splitting")
                : t("rosterPage.splitDialog.actions.split")}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}

export { SplitContractSheet }
