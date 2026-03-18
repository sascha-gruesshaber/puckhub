import { AlertTriangle } from "lucide-react"
import { useTranslation } from "~/i18n/use-translation"

interface DangerZoneProps {
  /** Hint text suggesting a safer alternative (e.g. "release from team instead") */
  hint?: string
  /** The destructive action button(s) */
  children: React.ReactNode
}

function DangerZone({ hint, children }: DangerZoneProps) {
  const { t } = useTranslation("common")

  return (
    <div className="border-t border-border/40 pt-4 mt-4 space-y-3">
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
        <AlertTriangle className="h-3 w-3" />
        {t("dangerZone.title")}
      </div>
      {hint && <p className="text-xs text-muted-foreground leading-relaxed">{hint}</p>}
      {children}
    </div>
  )
}

export { DangerZone }
