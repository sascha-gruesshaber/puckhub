import { Button, Card, CardContent, CardHeader, CardTitle, Input } from "@puckhub/ui"
import { Fingerprint, Trash2 } from "lucide-react"
import { useEffect, useState } from "react"
import { useTranslation } from "~/i18n/use-translation"
import { resolveTranslatedError } from "~/lib/errorI18n"
import { authClient } from "../../../lib/auth-client"

interface Passkey {
  id: string
  name: string | null
  credentialID: string
  deviceType: string
  createdAt: string | null
}

function PasskeySection() {
  const { t } = useTranslation("common")
  const { t: tErrors } = useTranslation("errors")
  const [passkeys, setPasskeys] = useState<Passkey[]>([])
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [addName, setAddName] = useState("")
  const [showAddForm, setShowAddForm] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Load passkeys on mount
  useEffect(() => {
    loadPasskeys()
  }, [])

  async function loadPasskeys() {
    try {
      const response = await authClient.$fetch("/passkey/list-user-passkeys", { method: "GET" })
      if (response.data) {
        setPasskeys(response.data as Passkey[])
      }
    } catch {
      // silently fail — list will be empty
    }
  }

  async function handleAddPasskey(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const result = await authClient.passkey.addPasskey({
        name: addName || undefined,
      })
      if (result?.error) {
        setError(result.error.message ?? tErrors("PASSKEY_FAILED"))
      } else {
        setShowAddForm(false)
        setAddName("")
        await loadPasskeys()
      }
    } catch (err) {
      setError(resolveTranslatedError(err, tErrors))
    } finally {
      setLoading(false)
    }
  }

  async function handleDeletePasskey(id: string) {
    if (!confirm(t("security.passkeys.deleteConfirm"))) return

    setDeletingId(id)
    setError("")

    try {
      const result = await authClient.$fetch("/passkey/delete-passkey", {
        method: "POST",
        body: { id },
      })
      if (result.error) {
        setError((result.error as { message?: string }).message ?? tErrors("UNKNOWN"))
      } else {
        await loadPasskeys()
      }
    } catch (err) {
      setError(resolveTranslatedError(err, tErrors))
    } finally {
      setDeletingId(null)
    }
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return "—"
    return new Date(dateStr).toLocaleDateString()
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{t("security.passkeys.title")}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{t("security.passkeys.description")}</p>
          </div>
          <Fingerprint size={24} className="text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent>
        {error && <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

        {/* Passkey list */}
        {passkeys.length > 0 ? (
          <div className="space-y-3 mb-4">
            {passkeys.map((pk) => (
              <div key={pk.id} className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-3">
                  <Fingerprint size={18} className="text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-sm font-medium">{pk.name || pk.credentialID.slice(0, 16) + "..."}</p>
                    <p className="text-xs text-muted-foreground">
                      {pk.deviceType === "singleDevice"
                        ? t("security.passkeys.platform")
                        : t("security.passkeys.crossPlatform")}
                      {" · "}
                      {formatDate(pk.createdAt)}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={deletingId === pk.id}
                  onClick={() => handleDeletePasskey(pk.id)}
                >
                  <Trash2 size={16} />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground mb-4">{t("security.passkeys.noPasskeys")}</p>
        )}

        {/* Add passkey */}
        {showAddForm ? (
          <form onSubmit={handleAddPasskey} className="space-y-3 max-w-sm">
            <div className="space-y-2">
              <label htmlFor="passkey-name" className="text-sm font-medium">
                {t("security.passkeys.name")}
              </label>
              <Input
                id="passkey-name"
                type="text"
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                placeholder={t("security.passkeys.namePlaceholder")}
                autoFocus
              />
            </div>
            <div className="flex gap-3">
              <Button type="submit" disabled={loading}>
                {loading ? t("security.passkeys.adding") : t("security.passkeys.add")}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowAddForm(false)
                  setAddName("")
                }}
              >
                {t("cancel")}
              </Button>
            </div>
          </form>
        ) : (
          <Button variant="outline" onClick={() => setShowAddForm(true)}>
            <Fingerprint size={16} className="mr-2" />
            {t("security.passkeys.add")}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

export { PasskeySection }
