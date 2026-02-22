import { ChangePasswordCard, toast } from "@puckhub/ui"
import { createFileRoute } from "@tanstack/react-router"
import { useMemo, useState } from "react"
import { trpc } from "@/trpc"
import { PageHeader } from "~/components/pageHeader"
import { PasskeySection } from "~/components/security/passkeySection"
import { TwoFactorSection } from "~/components/security/twoFactorSection"
import { useTranslation } from "~/i18n/use-translation"
import { resolveTranslatedError } from "~/lib/errorI18n"
import { authClient, useSession } from "../../../lib/auth-client"

export const Route = createFileRoute("/_authed/profile")({
  component: ProfilePage,
})

function ProfilePage() {
  const { t } = useTranslation("common")
  const { t: tErrors } = useTranslation("errors")
  const { data: session } = useSession()

  async function handleChangePassword(values: { currentPassword: string; newPassword: string }) {
    try {
      const result = await authClient.changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
        revokeOtherSessions: false,
      })
      if ((result as any)?.error) {
        throw new Error((result as any).error.message ?? "Could not update password.")
      }
    } catch (err) {
      throw new Error(resolveTranslatedError(err, tErrors))
    }
  }

  return (
    <div>
      <PageHeader title={t("profile.title")} description={t("profile.description")} />
      <div className="space-y-6 mt-6" style={{ maxWidth: 640 }}>
        {session && <PersonalInfoSection session={session} />}
        <ChangePasswordCard onSubmit={handleChangePassword} />
        <LanguageSection />
        <TwoFactorSection />
        <PasskeySection />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Personal Information
// ---------------------------------------------------------------------------
function PersonalInfoSection({ session }: { session: { user: { name?: string; email: string } } }) {
  const { t } = useTranslation("common")
  const { t: tErrors } = useTranslation("errors")
  const [name, setName] = useState(session.user.name ?? "")
  const [saving, setSaving] = useState(false)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await authClient.updateUser({ name })
      toast.success(t("profile.saved"))
    } catch (err) {
      toast.error(resolveTranslatedError(err, tErrors))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-xl border bg-card" style={{ borderColor: "hsl(var(--border))" }}>
      <div style={{ padding: "20px 24px 0" }}>
        <h2 style={{ fontSize: 16, fontWeight: 600 }}>{t("profile.personalInfo")}</h2>
        <p style={{ fontSize: 13, color: "hsl(var(--muted-foreground))", marginTop: 2 }}>
          {t("profile.personalInfoDescription")}
        </p>
      </div>
      <form onSubmit={handleSave} style={{ padding: "16px 24px 20px" }}>
        <div className="space-y-4">
          {/* Name */}
          <div>
            <label htmlFor="profile-name" style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 6 }}>
              {t("profile.name")}
            </label>
            <input
              id="profile-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("profile.namePlaceholder")}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>

          {/* Email (read-only) */}
          <div>
            <label htmlFor="profile-email" style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 6 }}>
              {t("profile.email")}
            </label>
            <input
              id="profile-email"
              type="email"
              value={session.user.email}
              readOnly
              className="flex h-9 w-full rounded-md border border-input bg-muted px-3 py-1 text-sm shadow-xs text-muted-foreground cursor-not-allowed"
            />
            <p style={{ fontSize: 12, color: "hsl(var(--muted-foreground))", marginTop: 4 }}>
              {t("profile.emailReadOnly")}
            </p>
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring bg-primary text-primary-foreground shadow-xs hover:bg-primary/90 h-9 px-4"
            style={{ opacity: saving ? 0.6 : 1 }}
          >
            {saving ? t("saving") : t("save")}
          </button>
        </div>
      </form>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Language Preference
// ---------------------------------------------------------------------------
function LanguageSection() {
  const { t, i18n } = useTranslation("common")
  const { t: tErrors } = useTranslation("errors")
  const utils = trpc.useUtils()

  const { data: preference } = trpc.userPreferences.getMyLocale.useQuery(undefined, {
    retry: false,
  })

  const mutation = trpc.userPreferences.setMyLocale.useMutation({
    onSuccess: async ({ success }, variables) => {
      if (!success) return
      await utils.userPreferences.getMyLocale.invalidate()
      if (variables.locale) {
        await i18n.changeLanguage(variables.locale)
      }
    },
    onError: (err) => {
      toast.error(resolveTranslatedError(err, tErrors))
    },
  })

  const currentLocale = useMemo(() => {
    const raw = preference?.locale ?? i18n.language
    return raw?.startsWith("en") ? "en-US" : "de-DE"
  }, [i18n.language, preference?.locale])

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    mutation.mutate({ locale: e.target.value as "de-DE" | "en-US" })
  }

  return (
    <div className="rounded-xl border bg-card" style={{ borderColor: "hsl(var(--border))" }}>
      <div style={{ padding: "20px 24px 0" }}>
        <h2 style={{ fontSize: 16, fontWeight: 600 }}>{t("profile.languagePreference")}</h2>
        <p style={{ fontSize: 13, color: "hsl(var(--muted-foreground))", marginTop: 2 }}>
          {t("profile.languagePreferenceDescription")}
        </p>
      </div>
      <div style={{ padding: "16px 24px 20px" }}>
        <label htmlFor="profile-language" style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 6 }}>
          {t("profile.language")}
        </label>
        <select
          id="profile-language"
          value={currentLocale}
          onChange={handleChange}
          disabled={mutation.isPending}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          style={{ maxWidth: 240, opacity: mutation.isPending ? 0.6 : 1 }}
        >
          <option value="de-DE">{t("profile.languageOptions.de-DE")}</option>
          <option value="en-US">{t("profile.languageOptions.en-US")}</option>
        </select>
      </div>
    </div>
  )
}
