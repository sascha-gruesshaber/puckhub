import { Button } from "@puckhub/ui"
import { useNavigate } from "@tanstack/react-router"
import { Fingerprint } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "~/i18n/use-translation"
import { resolveTranslatedError } from "~/lib/errorI18n"
import { authClient } from "../../../lib/auth-client"

interface PasskeyButtonProps {
  onError: (msg: string) => void
}

function PasskeyButton({ onError }: PasskeyButtonProps) {
  const { t } = useTranslation("common")
  const { t: tErrors } = useTranslation("errors")
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)

  async function handlePasskeySignIn() {
    onError("")
    setLoading(true)

    try {
      const result = await authClient.signIn.passkey()
      if (result?.error) {
        onError(result.error.message ?? tErrors("PASSKEY_FAILED"))
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
    <Button type="button" variant="outline" className="w-full" disabled={loading} onClick={handlePasskeySignIn}>
      <Fingerprint size={18} className="mr-2" />
      {loading ? t("login.passkey.signingIn") : t("login.passkey.signIn")}
    </Button>
  )
}

export { PasskeyButton }
