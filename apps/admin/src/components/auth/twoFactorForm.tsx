import { Button, Input } from "@puckhub/ui"
import { useNavigate } from "@tanstack/react-router"
import { useState } from "react"
import { useTranslation } from "~/i18n/use-translation"
import { resolveTranslatedError } from "~/lib/errorI18n"
import { authClient } from "../../../lib/auth-client"

interface TwoFactorFormProps {
  onError: (msg: string) => void
}

function TwoFactorForm({ onError }: TwoFactorFormProps) {
  const { t } = useTranslation("common")
  const { t: tErrors } = useTranslation("errors")
  const navigate = useNavigate()
  const [code, setCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [useBackup, setUseBackup] = useState(false)
  const [trustDevice, setTrustDevice] = useState(false)

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    onError("")
    setLoading(true)

    try {
      if (useBackup) {
        const result = await authClient.twoFactor.verifyBackupCode({ code, trustDevice })
        if (result.error) {
          onError(result.error.message ?? tErrors("BACKUP_CODE_INVALID"))
        } else {
          navigate({ to: "/" })
        }
      } else {
        const result = await authClient.twoFactor.verifyTotp({ code, trustDevice })
        if (result.error) {
          onError(result.error.message ?? tErrors("TWO_FACTOR_INVALID"))
        } else {
          navigate({ to: "/" })
        }
      }
    } catch (err) {
      onError(resolveTranslatedError(err, tErrors))
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleVerify} className="space-y-4">
      <div className="text-center space-y-1">
        <h2 className="text-lg font-semibold">{t("login.twoFactor.title")}</h2>
        <p className="text-sm text-muted-foreground">{t("login.twoFactor.subtitle")}</p>
      </div>

      <div className="space-y-2">
        <Input
          id="totp-code"
          type="text"
          inputMode={useBackup ? undefined : "numeric"}
          pattern={useBackup ? undefined : "[0-9]*"}
          maxLength={useBackup ? 20 : 6}
          value={code}
          onChange={(e) => setCode(useBackup ? e.target.value : e.target.value.replace(/\D/g, ""))}
          placeholder={useBackup ? t("login.twoFactor.backupCodePlaceholder") : t("login.twoFactor.codePlaceholder")}
          autoFocus
          required
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="trust-device"
          checked={trustDevice}
          onChange={(e) => setTrustDevice(e.target.checked)}
          className="rounded border-input"
        />
        <label htmlFor="trust-device" className="text-sm text-muted-foreground">
          {t("login.twoFactor.trustDevice")}
        </label>
      </div>

      <Button type="submit" className="w-full" disabled={loading || (!useBackup && code.length < 6)}>
        {loading ? t("login.twoFactor.verifying") : t("login.twoFactor.verify")}
      </Button>

      <button
        type="button"
        className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
        onClick={() => {
          setUseBackup(!useBackup)
          setCode("")
          onError("")
        }}
      >
        {useBackup ? t("login.twoFactor.subtitle") : t("login.twoFactor.useBackupCode")}
      </button>
    </form>
  )
}

export { TwoFactorForm }
