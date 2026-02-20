import { createFileRoute } from "@tanstack/react-router"
import { PageHeader } from "~/components/pageHeader"
import { PasskeySection } from "~/components/security/passkeySection"
import { TwoFactorSection } from "~/components/security/twoFactorSection"
import { useTranslation } from "~/i18n/use-translation"

export const Route = createFileRoute("/_authed/security")({
  component: SecurityPage,
})

function SecurityPage() {
  const { t } = useTranslation("common")

  return (
    <div>
      <PageHeader title={t("security.title")} description={t("security.description")} />
      <div className="space-y-6 mt-6">
        <TwoFactorSection />
        <PasskeySection />
      </div>
    </div>
  )
}
