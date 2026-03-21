import { Zap } from "lucide-react"
import { useTranslation } from "~/i18n/use-translation"

interface UpgradeBannerProps {
  /** Optional plan name to display in the message */
  planName?: string | null
  /** Override the default message */
  message?: string
  className?: string
}

export function UpgradeBanner({ planName, message, className }: UpgradeBannerProps) {
  const { t } = useTranslation("common")

  return (
    <div
      className={`rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 flex items-center gap-3 ${className ?? ""}`}
    >
      <Zap className="h-5 w-5 text-amber-400 shrink-0" />
      <div>
        <p className="text-sm font-medium text-amber-300">
          {t("plan.limitReached", { defaultValue: "Plan limit reached" })}
        </p>
        <p className="text-xs text-amber-400/80">
          {message ??
            t("plan.upgradeHint", {
              defaultValue: "Upgrade your plan to add more. Contact your platform admin.",
            })}
          {planName && (
            <span className="ml-1 text-amber-400">
              ({t("plan.currentPlan", { defaultValue: "Current" })}: {planName})
            </span>
          )}
        </p>
      </div>
    </div>
  )
}
