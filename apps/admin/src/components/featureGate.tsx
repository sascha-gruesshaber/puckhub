import type { ReactNode } from "react"
import { Lock } from "lucide-react"
import { usePlanLimits, type FeatureKey } from "~/hooks/usePlanLimits"
import { useTranslation } from "~/i18n/use-translation"

const FEATURE_LABELS: Record<FeatureKey, string> = {
  featureCustomDomain: "Custom Domain",
  featureWebsiteBuilder: "Website Builder",
  featureSponsorMgmt: "Sponsor Management",
  featureTrikotDesigner: "Jersey Designer",
  featureGameReports: "Game Reports",
  featurePlayerStats: "Player Statistics",
  featureScheduler: "Auto-Scheduler",
  featureScheduledNews: "Scheduled News",
  featureAdvancedRoles: "Advanced Roles",
  featureAdvancedStats: "Advanced Statistics",
  featureAiRecaps: "AI Recaps",
  featurePublicReports: "Public Game Reports",
}

interface FeatureGateProps {
  /** The feature flag key from the plan */
  feature: FeatureKey
  /** Content to render when the feature IS available */
  children: ReactNode
  /** Optional custom fallback when the feature is NOT available */
  fallback?: ReactNode
}

/**
 * Wraps content that requires a specific plan feature.
 * If the feature is disabled on the current plan, shows a locked state
 * instead of the children.
 */
export function FeatureGate({ feature, children, fallback }: FeatureGateProps) {
  const { canUseFeature, isLoading } = usePlanLimits()

  // While loading, render nothing to avoid flash of locked state
  if (isLoading) return null

  if (!canUseFeature(feature)) {
    return fallback ? <>{fallback}</> : <FeatureLockedState feature={feature} />
  }

  return <>{children}</>
}

function FeatureLockedState({ feature }: { feature: FeatureKey }) {
  const { t } = useTranslation("common")
  const label = FEATURE_LABELS[feature] ?? feature

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
        <Lock className="h-7 w-7 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">{label}</h3>
      <p className="text-sm text-muted-foreground max-w-sm">
        {t("plan.featureLocked", {
          defaultValue: "This feature is not available on your current plan. Contact your platform admin to upgrade.",
        })}
      </p>
    </div>
  )
}
