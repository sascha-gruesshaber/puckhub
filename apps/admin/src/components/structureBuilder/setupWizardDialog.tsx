import { Button, toast } from "@puckhub/ui"
import { Check, ChevronRight, Copy, FileX, GitBranch, Layers, Sparkles } from "lucide-react"
import { useState } from "react"
import { trpc } from "@/trpc"
import { useTranslation } from "~/i18n/use-translation"

type Template = "standard" | "copy" | "empty"

interface SetupWizardDialogProps {
  seasonId: string
  seasonName: string
  onComplete: () => void
}

export function SetupWizardDialog({ seasonId, seasonName, onComplete }: SetupWizardDialogProps) {
  const { t } = useTranslation("common")
  const [selected, setSelected] = useState<Template | null>(null)
  const [sourceSeasonId, setSourceSeasonId] = useState<string>("")

  const { data: seasons } = trpc.season.list.useQuery()
  const { data: allTeams } = trpc.team.list.useQuery()

  const otherSeasons = seasons?.filter((s) => s.id !== seasonId) ?? []

  const scaffoldMutation = trpc.season.scaffoldFromTemplate.useMutation({
    onSuccess: (result) => {
      if (result.divisionsCreated > 0) {
        toast.success(t("seasonStructure.setup.toast.created"), {
          description: t("seasonStructure.setup.toast.createdDescription", {
            divisions: result.divisionsCreated,
            rounds: result.roundsCreated,
            teams: result.teamsAssigned,
          }),
        })
      }
      onComplete()
    },
    onError: (err) => toast.error(t("seasonStructure.toast.error"), { description: err.message }),
  })

  function handleConfirm() {
    if (selected === "empty") {
      onComplete()
      return
    }
    if (selected === "standard") {
      scaffoldMutation.mutate({ seasonId, template: "standard" })
      return
    }
    if (selected === "copy" && sourceSeasonId) {
      scaffoldMutation.mutate({ seasonId, template: "copy", sourceSeasonId })
    }
  }

  const canConfirm = selected === "empty" || selected === "standard" || (selected === "copy" && sourceSeasonId)

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-muted/30">
      {/* Subtle dot grid background */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: "radial-gradient(rgba(0,0,0,0.06) 1px, transparent 1px)",
          backgroundSize: "20px 20px",
        }}
      />

      <div className="relative z-10 w-full max-w-xl px-6">
        {/* Header */}
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-5"
            style={{
              background: "linear-gradient(135deg, rgba(244,211,94,0.15), rgba(244,211,94,0.06))",
              border: "1px solid rgba(244,211,94,0.2)",
            }}
          >
            <Layers className="w-6 h-6" style={{ color: "#D4A843" }} strokeWidth={1.5} />
          </div>
          <h2 className="text-xl font-bold text-foreground tracking-tight">{t("seasonStructure.setup.title")}</h2>
          <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto leading-relaxed">
            {t("seasonStructure.setup.descriptionPrefix", { season: seasonName })}{" "}
            {t("seasonStructure.setup.descriptionSuffix")}
          </p>
        </div>

        {/* Template cards */}
        <div className="flex flex-col gap-3 mb-6">
          {/* Standard template */}
          <TemplateCard
            selected={selected === "standard"}
            onClick={() => {
              setSelected("standard")
              setSourceSeasonId("")
            }}
            icon={<Sparkles className="w-5 h-5" strokeWidth={1.5} />}
            iconColor="#D4A843"
            iconBg="rgba(244,211,94,0.1)"
            title={t("seasonStructure.setup.templates.standard.title")}
            description={
              <>
                {t("seasonStructure.setup.templates.standard.description")}
                {allTeams && allTeams.length > 0 && (
                  <span className="text-foreground/70">
                    {" "}
                    {t("seasonStructure.setup.templates.standard.descriptionTeams", {
                      count: allTeams.length,
                    })}
                  </span>
                )}
              </>
            }
            badge={t("seasonStructure.setup.templates.standard.badge")}
          />

          {/* Copy from season */}
          <TemplateCard
            selected={selected === "copy"}
            onClick={() => setSelected("copy")}
            icon={<Copy className="w-5 h-5" strokeWidth={1.5} />}
            iconColor="#3B82F6"
            iconBg="rgba(59,130,246,0.1)"
            title={t("seasonStructure.setup.templates.copy.title")}
            description={t("seasonStructure.setup.templates.copy.description")}
            disabled={otherSeasons.length === 0}
            disabledReason={t("seasonStructure.setup.templates.copy.disabled")}
          >
            {selected === "copy" && otherSeasons.length > 0 && (
              <div className="mt-3 pt-3 border-t border-border">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">
                  {t("seasonStructure.setup.templates.copy.selectSource")}
                </label>
                <div className="flex flex-col gap-1.5 max-h-32 overflow-y-auto pr-1">
                  {otherSeasons.map((s) => (
                    <button
                      type="button"
                      key={s.id}
                      onClick={(e) => {
                        e.stopPropagation()
                        setSourceSeasonId(s.id)
                      }}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-colors"
                      style={{
                        background: sourceSeasonId === s.id ? "rgba(59,130,246,0.08)" : "#F8FAFC",
                        border: `1px solid ${sourceSeasonId === s.id ? "rgba(59,130,246,0.3)" : "#E2E8F0"}`,
                      }}
                    >
                      <div
                        className="w-6 h-6 rounded-md flex items-center justify-center text-[9px] font-bold shrink-0"
                        style={{
                          background: sourceSeasonId === s.id ? "linear-gradient(135deg, #60A5FA, #3B82F6)" : "#F1F5F9",
                          color: sourceSeasonId === s.id ? "#fff" : "#64748B",
                        }}
                      >
                        {String(new Date(s.seasonStart).getUTCFullYear()).slice(-2)}
                      </div>
                      <span className="text-xs text-foreground truncate">{s.name}</span>
                      {sourceSeasonId === s.id && <Check className="w-3.5 h-3.5 text-blue-500 ml-auto shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </TemplateCard>

          {/* Empty */}
          <TemplateCard
            selected={selected === "empty"}
            onClick={() => {
              setSelected("empty")
              setSourceSeasonId("")
            }}
            icon={<FileX className="w-5 h-5" strokeWidth={1.5} />}
            iconColor="#94A3B8"
            iconBg="rgba(148,163,184,0.1)"
            title={t("seasonStructure.setup.templates.empty.title")}
            description={t("seasonStructure.setup.templates.empty.description")}
          />
        </div>

        {/* Action */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <GitBranch className="w-3.5 h-3.5" />
            <span>{t("seasonStructure.setup.hint")}</span>
          </div>
          <Button
            variant="accent"
            size="sm"
            onClick={handleConfirm}
            disabled={!canConfirm || scaffoldMutation.isPending}
            className="text-xs h-9 px-5"
          >
            {scaffoldMutation.isPending ? (
              t("seasonStructure.setup.actions.creating")
            ) : (
              <>
                {selected === "empty"
                  ? t("seasonStructure.setup.actions.startEditor")
                  : t("seasonStructure.setup.actions.createAndStart")}
                <ChevronRight className="ml-1.5 w-3.5 h-3.5" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// TemplateCard
// ---------------------------------------------------------------------------
function TemplateCard({
  selected,
  onClick,
  icon,
  iconColor,
  iconBg,
  title,
  description,
  badge,
  disabled,
  disabledReason,
  children,
}: {
  selected: boolean
  onClick: () => void
  icon: React.ReactNode
  iconColor: string
  iconBg: string
  title: string
  description: React.ReactNode
  badge?: string
  disabled?: boolean
  disabledReason?: string
  children?: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className="text-left w-full rounded-xl p-4 transition-all duration-150"
      style={{
        background: selected ? "#FFFFFF" : "#FAFAFA",
        border: `1px solid ${selected ? `${iconColor}40` : disabled ? "#F1F5F9" : "#E2E8F0"}`,
        opacity: disabled ? 0.45 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
        boxShadow: selected ? `0 0 0 1px ${iconColor}15, 0 4px 16px rgba(0,0,0,0.06)` : "none",
      }}
    >
      <div className="flex items-start gap-3.5">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: iconBg, color: iconColor }}
        >
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">{title}</span>
            {badge && (
              <span
                className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                style={{ background: "rgba(244,211,94,0.15)", color: "#B8941F" }}
              >
                {badge}
              </span>
            )}
            {selected && (
              <div className="ml-auto shrink-0">
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center"
                  style={{ background: iconColor }}
                >
                  <Check className="w-3 h-3 text-white" strokeWidth={3} />
                </div>
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
            {disabled && disabledReason ? disabledReason : description}
          </p>
        </div>
      </div>
      {children}
    </button>
  )
}
