import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@puckhub/ui"
import { Calendar, Check } from "lucide-react"
import { trpc } from "@/trpc"
import { useWorkingSeason } from "~/contexts/seasonContext"
import { useTranslation } from "~/i18n/use-translation"

interface SeasonPickerModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (seasonId: string) => void
  targetLabel: string
}

export function SeasonPickerModal({ open, onOpenChange, onSelect, targetLabel }: SeasonPickerModalProps) {
  const { t } = useTranslation("common")
  const { season: workingSeason, setWorkingSeason } = useWorkingSeason()
  const { data: seasons, isLoading } = trpc.season.list.useQuery()

  const { data: currentSeason } = trpc.season.getCurrent.useQuery()

  function shortSeasonLabel(start: Date | string) {
    return String(new Date(start).getUTCFullYear()).slice(-2)
  }

  function handlePick(s: { id: string; name: string; seasonStart: Date | string; seasonEnd: Date | string }) {
    setWorkingSeason({
      id: s.id,
      name: s.name,
      seasonStart: new Date(s.seasonStart).toISOString(),
      seasonEnd: new Date(s.seasonEnd).toISOString(),
    })
    onSelect(s.id)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar size={18} strokeWidth={1.5} />
            {t("seasonPicker.title")}
          </DialogTitle>
          <DialogDescription>
            {t("seasonPicker.descriptionPrefix")} <strong>{targetLabel}</strong> {t("seasonPicker.descriptionSuffix")}
          </DialogDescription>
        </DialogHeader>
        <div className="px-6 pb-6">
          {isLoading ? (
            <div className="text-sm text-muted-foreground py-4 text-center" suppressHydrationWarning>
              {t("loading")}
            </div>
          ) : !seasons?.length ? (
            <div className="text-sm text-muted-foreground py-4 text-center">{t("seasonPicker.noSeasons")}</div>
          ) : (
            <div className="flex flex-col gap-1.5 max-h-64 overflow-y-auto">
              {seasons.map((s) => {
                const isSelected = s.id === workingSeason?.id
                return (
                  <button
                    type="button"
                    key={s.id}
                    onClick={() => handlePick(s)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors hover:bg-muted/60"
                    style={{
                      background: isSelected ? "hsl(var(--accent) / 0.1)" : undefined,
                      border: `1px solid ${isSelected ? "hsl(var(--accent) / 0.3)" : "hsl(var(--border))"}`,
                    }}
                  >
                    <div
                      className="flex items-center justify-center shrink-0 rounded-md"
                      style={{
                        width: 30,
                        height: 30,
                        background: isSelected ? "linear-gradient(135deg, #F4D35E, #D4A843)" : "hsl(var(--muted))",
                        color: isSelected ? "#0C1929" : "hsl(var(--muted-foreground))",
                        fontSize: 11,
                        fontWeight: 800,
                      }}
                    >
                      {shortSeasonLabel(s.seasonStart)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold truncate">{s.name}</div>
                    </div>
                    {currentSeason?.id === s.id && (
                      <span
                        className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0"
                        style={{ background: "rgba(16,185,129,0.1)", color: "#10B981" }}
                      >
                        {t("seasonPicker.active")}
                      </span>
                    )}
                    {isSelected && <Check size={16} className="shrink-0" style={{ color: "#D4A843" }} />}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
