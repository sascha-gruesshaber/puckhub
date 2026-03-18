import { Button, Input } from "@puckhub/ui"
import { Mail } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "~/i18n/use-translation"
import { resolveTranslatedError } from "~/lib/errorI18n"
import { authClient } from "../../../lib/auth-client"

interface LoginFormProps {
  onError: (msg: string) => void
  redirect?: string
}

function LoginForm({ onError, redirect }: LoginFormProps) {
  const { t } = useTranslation("common")
  const { t: tErrors } = useTranslation("errors")
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onError("")
    setLoading(true)

    try {
      const result = await authClient.signIn.magicLink({
        email,
        callbackURL: redirect || `${window.location.origin}/`,
      })
      if (result.error) {
        const msg = result.error.message ?? ""
        onError(tErrors(msg, { defaultValue: "" }) || msg || tErrors("AUTH_NOT_AUTHENTICATED"))
      } else {
        setSent(true)
      }
    } catch (err) {
      onError(resolveTranslatedError(err, tErrors))
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="space-y-4 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Mail className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h3 className="text-base font-semibold">{t("login.magicLink.checkInbox")}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{t("login.magicLink.sentTo", { email })}</p>
        </div>
        <Button
          variant="outline"
          className="w-full"
          onClick={() => {
            setSent(false)
            setLoading(false)
          }}
        >
          {t("login.magicLink.resend")}
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-medium">
          {t("login.email")}
        </label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t("login.emailPlaceholder")}
          required
        />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? t("login.magicLink.submitting") : t("login.magicLink.submit")}
      </Button>
    </form>
  )
}

export { LoginForm }
