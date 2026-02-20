import { Card, CardContent, CardHeader, CardTitle } from "@puckhub/ui"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useState } from "react"
import { LoginForm } from "~/components/auth/loginForm"
import { PasskeyButton } from "~/components/auth/passkeyButton"
import { TwoFactorForm } from "~/components/auth/twoFactorForm"
import { useTranslation } from "~/i18n/use-translation"
import { trpc } from "../../lib/trpc"

interface LoginSearch {
  mode?: "2fa"
}

export const Route = createFileRoute("/login")({
  component: LoginPage,
  validateSearch: (search: Record<string, unknown>): LoginSearch => ({
    mode: search.mode === "2fa" ? "2fa" : undefined,
  }),
})

function LoginPage() {
  const { t } = useTranslation("common")
  const navigate = useNavigate()
  const { mode } = Route.useSearch()
  const [error, setError] = useState("")

  // Check if setup is needed — redirect to wizard if so
  const { data: setupStatus, isLoading: setupLoading } = trpc.setup.status.useQuery()

  if (setupLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted">
        <div
          className="w-5 h-5 rounded-full border-2 animate-spin"
          style={{
            borderColor: "rgba(0,0,0,0.1)",
            borderTopColor: "rgba(0,0,0,0.4)",
          }}
        />
      </div>
    )
  }

  if (setupStatus?.needsSetup) {
    navigate({ to: "/setup" })
    return null
  }

  // 2FA verification mode
  if (mode === "2fa") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            {error && <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
            <TwoFactorForm onError={setError} />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">{t("login.title")}</CardTitle>
          <p className="text-sm text-muted-foreground">{t("login.subtitle")}</p>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Error display */}
          {error && <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

          {/* Password login */}
          <LoginForm onError={setError} />

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">oder</span>
            </div>
          </div>

          {/* Passkey */}
          <PasskeyButton onError={setError} />
        </CardContent>
      </Card>
    </div>
  )
}
