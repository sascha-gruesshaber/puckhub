import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input } from "@puckhub/ui"
import { useEffect, useRef, useState } from "react"
import { useTranslation } from "~/i18n/use-translation"
import { resolveTranslatedError } from "~/lib/errorI18n"
import { authClient, useSession } from "../../../lib/auth-client"

type Phase = "idle" | "password" | "qr" | "backup-codes" | "disable-confirm"

function TwoFactorSection() {
  const { t } = useTranslation("common")
  const { t: tErrors } = useTranslation("errors")
  const { data: session } = useSession()
  const [phase, setPhase] = useState<Phase>("idle")
  const [password, setPassword] = useState("")
  const [totpURI, setTotpURI] = useState("")
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [verifyCode, setVerifyCode] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const qrCanvasRef = useRef<HTMLCanvasElement>(null)

  const is2FAEnabled = (session?.user as { twoFactorEnabled?: boolean } | undefined)?.twoFactorEnabled ?? false

  // Generate QR code when totpURI is set
  useEffect(() => {
    if (!totpURI || !qrCanvasRef.current) return
    let cancelled = false

    import("qrcode").then((QRCode) => {
      if (cancelled || !qrCanvasRef.current) return
      QRCode.toCanvas(qrCanvasRef.current, totpURI, { width: 200, margin: 2 })
    })

    return () => {
      cancelled = true
    }
  }, [totpURI])

  async function handleEnableStart() {
    setPhase("password")
    setPassword("")
    setError("")
  }

  async function handleEnableSubmitPassword(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const result = await authClient.twoFactor.enable({ password })
      if (result.error) {
        setError(result.error.message ?? tErrors("UNKNOWN"))
      } else {
        setTotpURI(result.data.totpURI)
        setBackupCodes(result.data.backupCodes)
        setPhase("qr")
        setVerifyCode("")
      }
    } catch (err) {
      setError(resolveTranslatedError(err, tErrors))
    } finally {
      setLoading(false)
    }
  }

  async function handleVerifyTotp(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const result = await authClient.twoFactor.verifyTotp({ code: verifyCode })
      if (result.error) {
        setError(result.error.message ?? tErrors("TWO_FACTOR_INVALID"))
      } else {
        setPhase("backup-codes")
      }
    } catch (err) {
      setError(resolveTranslatedError(err, tErrors))
    } finally {
      setLoading(false)
    }
  }

  async function handleDisable() {
    setPhase("disable-confirm")
    setPassword("")
    setError("")
  }

  async function handleDisableConfirm(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const result = await authClient.twoFactor.disable({ password })
      if (result.error) {
        setError(result.error.message ?? tErrors("UNKNOWN"))
      } else {
        setPhase("idle")
      }
    } catch (err) {
      setError(resolveTranslatedError(err, tErrors))
    } finally {
      setLoading(false)
    }
  }

  async function handleShowBackupCodes() {
    setPhase("password")
    setPassword("")
    setError("")
  }

  async function handleRegenerateBackupCodes(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const result = await authClient.twoFactor.generateBackupCodes({ password })
      if (result.error) {
        setError(result.error.message ?? tErrors("UNKNOWN"))
      } else {
        setBackupCodes(result.data.backupCodes)
        setPhase("backup-codes")
      }
    } catch (err) {
      setError(resolveTranslatedError(err, tErrors))
    } finally {
      setLoading(false)
    }
  }

  function reset() {
    setPhase("idle")
    setPassword("")
    setTotpURI("")
    setBackupCodes([])
    setVerifyCode("")
    setError("")
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{t("security.twoFactor.title")}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{t("security.twoFactor.description")}</p>
          </div>
          <Badge variant={is2FAEnabled ? "default" : "secondary"}>
            {is2FAEnabled ? t("security.twoFactor.enabled") : t("security.twoFactor.disabled")}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {error && <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

        {phase === "idle" && (
          <div className="flex gap-3">
            {!is2FAEnabled ? (
              <Button onClick={handleEnableStart}>{t("security.twoFactor.enable")}</Button>
            ) : (
              <>
                <Button variant="outline" onClick={handleShowBackupCodes}>
                  {t("security.twoFactor.showBackupCodes")}
                </Button>
                <Button variant="destructive" onClick={handleDisable}>
                  {t("security.twoFactor.disable")}
                </Button>
              </>
            )}
          </div>
        )}

        {/* Password prompt — for enable or backup code regeneration */}
        {phase === "password" && (
          <form
            onSubmit={is2FAEnabled ? handleRegenerateBackupCodes : handleEnableSubmitPassword}
            className="space-y-4 max-w-sm"
          >
            <div className="space-y-2">
              <label htmlFor="2fa-password" className="text-sm font-medium">
                {t("security.twoFactor.passwordRequired")}
              </label>
              <Input
                id="2fa-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t("security.twoFactor.passwordPlaceholder")}
                autoFocus
                required
              />
            </div>
            <div className="flex gap-3">
              <Button type="submit" disabled={loading}>
                {loading ? t("security.twoFactor.confirming") : t("security.twoFactor.confirm")}
              </Button>
              <Button type="button" variant="outline" onClick={reset}>
                {t("cancel")}
              </Button>
            </div>
          </form>
        )}

        {/* QR code + verify */}
        {phase === "qr" && (
          <div className="space-y-4">
            <p className="text-sm font-medium">{t("security.twoFactor.setupTitle")}</p>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">{t("security.twoFactor.setupStep1")}</p>
              <div className="flex justify-center">
                <canvas ref={qrCanvasRef} />
              </div>
              <details className="text-sm">
                <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                  {t("security.twoFactor.manualEntry")}
                </summary>
                <code className="mt-2 block break-all rounded bg-muted p-2 text-xs">{totpURI}</code>
              </details>
            </div>
            <form onSubmit={handleVerifyTotp} className="space-y-3 max-w-sm">
              <p className="text-sm text-muted-foreground">{t("security.twoFactor.setupStep2")}</p>
              <Input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={verifyCode}
                onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ""))}
                placeholder="000000"
                autoFocus
              />
              <div className="flex gap-3">
                <Button type="submit" disabled={loading || verifyCode.length < 6}>
                  {loading ? t("security.twoFactor.verifying") : t("security.twoFactor.verifyCode")}
                </Button>
                <Button type="button" variant="outline" onClick={reset}>
                  {t("cancel")}
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Backup codes display */}
        {phase === "backup-codes" && (
          <div className="space-y-4">
            <div className="rounded-md border border-yellow-500/30 bg-yellow-500/10 p-3">
              <p className="text-sm font-medium text-yellow-700 dark:text-yellow-400">
                {t("security.twoFactor.backupCodesWarning")}
              </p>
            </div>
            <p className="text-sm text-muted-foreground">{t("security.twoFactor.backupCodesDescription")}</p>
            <div className="grid grid-cols-2 gap-2 max-w-sm">
              {backupCodes.map((code) => (
                <code key={code} className="rounded bg-muted px-3 py-1.5 text-center text-sm font-mono">
                  {code}
                </code>
              ))}
            </div>
            <Button onClick={reset}>{t("security.twoFactor.done")}</Button>
          </div>
        )}

        {/* Disable confirmation */}
        {phase === "disable-confirm" && (
          <form onSubmit={handleDisableConfirm} className="space-y-4 max-w-sm">
            <p className="text-sm text-muted-foreground">{t("security.twoFactor.disableConfirm")}</p>
            <div className="space-y-2">
              <label htmlFor="disable-password" className="text-sm font-medium">
                {t("security.twoFactor.passwordRequired")}
              </label>
              <Input
                id="disable-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t("security.twoFactor.passwordPlaceholder")}
                autoFocus
                required
              />
            </div>
            <div className="flex gap-3">
              <Button type="submit" variant="destructive" disabled={loading}>
                {loading ? t("security.twoFactor.disabling") : t("security.twoFactor.disable")}
              </Button>
              <Button type="button" variant="outline" onClick={reset}>
                {t("cancel")}
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  )
}

export { TwoFactorSection }
