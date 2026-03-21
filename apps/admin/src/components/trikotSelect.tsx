import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@puckhub/ui"
import { useEffect, useRef } from "react"
import { trpc } from "@/trpc"
import { TrikotPreview } from "~/components/trikotPreview"
import { useTranslation } from "~/i18n/use-translation"

interface TrikotSelectProps {
  teamId: string
  value: string
  onChange: (trikotId: string) => void
  disabled?: boolean
  /** When set and no value is selected, auto-selects the trikot matching this assignment type */
  autoSelectType?: "home" | "away"
}

function TrikotSelect({ teamId, value, onChange, disabled, autoSelectType }: TrikotSelectProps) {
  const { t } = useTranslation("common")
  const { data: teamTrikots } = trpc.teamTrikot.listByTeam.useQuery({ teamId }, { enabled: !!teamId })

  const items = teamTrikots ?? []

  // Auto-select trikot by assignment type when data loads
  const didAutoSelect = useRef(false)
  useEffect(() => {
    if (!autoSelectType || value || didAutoSelect.current || items.length === 0) return
    const match = items.find((tt) => (tt as any).assignmentType === autoSelectType)
    if (match) {
      didAutoSelect.current = true
      onChange(match.trikot.id)
    }
  }, [autoSelectType, value, items, onChange])

  // Reset auto-select flag when team changes
  useEffect(() => {
    didAutoSelect.current = false
  }, [])

  function getLabel(tt: (typeof items)[number]) {
    const aType = (tt as any).assignmentType
    if (aType && aType !== "custom") {
      return t(`trikotsPage.assignmentTypes.${aType}`)
    }
    return tt.name
  }

  return (
    <Select
      value={value || "__none__"}
      onValueChange={(v) => onChange(v === "__none__" ? "" : v)}
      disabled={disabled || items.length === 0}
    >
      <SelectTrigger className="h-10 w-full">
        <SelectValue placeholder={t("gamesPage.placeholders.noTrikot")} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__none__">
          <span className="text-muted-foreground">{t("gamesPage.placeholders.noTrikot")}</span>
        </SelectItem>
        {items.map((tt) => (
          <SelectItem key={tt.trikot.id} value={tt.trikot.id}>
            <div className="flex items-center gap-2">
              <TrikotPreview
                svg={tt.trikot.template.svg}
                primaryColor={tt.trikot.primaryColor}
                secondaryColor={tt.trikot.secondaryColor}
                size="sm"
              />
              <span>{getLabel(tt)}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export { TrikotSelect }
