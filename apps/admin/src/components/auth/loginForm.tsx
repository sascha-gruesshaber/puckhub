import { Button, Input } from "@puckhub/ui"
import { useNavigate } from "@tanstack/react-router"
import { useState } from "react"
import { useTranslation } from "~/i18n/use-translation"
import { resolveTranslatedError } from "~/lib/errorI18n"
import { signIn } from "../../../lib/auth-client"

interface LoginFormProps {
  onError: (msg: string) => void
}

function LoginForm({ onError }: LoginFormProps) {
  const { t } = useTranslation("common")
  const { t: tErrors } = useTranslation("errors")
  const navigate = useNavigate()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onError("")
    setLoading(true)

    try {
      const result = await signIn.email({ email, password })
      if (result.error) {
        onError(result.error.message ?? tErrors("AUTH_NOT_AUTHENTICATED"))
      } else {
        navigate({ to: "/" })
      }
    } catch (err) {
      onError(resolveTranslatedError(err, tErrors))
    } finally {
      setLoading(false)
    }
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
      <div className="space-y-2">
        <label htmlFor="password" className="text-sm font-medium">
          {t("login.password")}
        </label>
        <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? t("login.submitting") : t("login.submit")}
      </Button>
    </form>
  )
}

export { LoginForm }
