import { Button, ChangePasswordCard, Input, toast } from "@puckhub/ui"
import { createFileRoute } from "@tanstack/react-router"
import { AlertTriangle } from "lucide-react"
import { type FormEvent, useState } from "react"
import { authClient, useSession } from "@/auth-client"
import { trpc } from "@/trpc"

export const Route = createFileRoute("/_authed/profile")({
  component: ProfilePage,
})

function ProfilePage() {
  const { data: session } = useSession()
  const [name, setName] = useState(session?.user.name ?? "")
  const [saving, setSaving] = useState(false)
  const { data: me } = trpc.users.me.useQuery()
  const utils = trpc.useUtils()
  const clearFlagMutation = trpc.users.clearMustChangePassword.useMutation({
    onSuccess: () => utils.users.me.invalidate(),
  })

  async function handleSaveProfile(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const result = await authClient.updateUser({ name })
      if ((result as any)?.error) {
        throw new Error((result as any).error.message ?? "Could not update profile.")
      }
      toast.success("Profile saved")
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not update profile."
      toast.error("Error", { description: message })
    } finally {
      setSaving(false)
    }
  }

  async function handleChangePassword(values: { currentPassword: string; newPassword: string }) {
    const result = await authClient.changePassword({
      currentPassword: values.currentPassword,
      newPassword: values.newPassword,
      revokeOtherSessions: false,
    })

    if ((result as any)?.error) {
      throw new Error((result as any).error.message ?? "Could not update password.")
    }

    // Clear the mustChangePassword flag after successful password change
    clearFlagMutation.mutate()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage your personal account settings</p>
      </div>

      {me?.mustChangePassword && (
        <div className="flex items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
          <p className="text-sm font-medium text-amber-800">
            You must change your password before continuing.
          </p>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-2 items-start">
        <ProfileSection title="Account" description="Name and email settings">
          <div className="rounded-xl border bg-card" style={{ borderColor: "hsl(var(--border))" }}>
            <div style={{ padding: "20px 24px 0" }}>
              <h2 style={{ fontSize: 16, fontWeight: 600 }}>Personal Information</h2>
              <p style={{ fontSize: 13, color: "hsl(var(--muted-foreground))", marginTop: 2 }}>
                Update your account details.
              </p>
            </div>
            <form onSubmit={handleSaveProfile} style={{ padding: "16px 24px 20px" }}>
              <div className="space-y-4">
                <div>
                  <label htmlFor="platform-profile-name" style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 6 }}>
                    Name
                  </label>
                  <Input
                    id="platform-profile-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                  />
                </div>

                <div>
                  <label htmlFor="platform-profile-email" style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 6 }}>
                    Email
                  </label>
                  <Input id="platform-profile-email" type="email" value={session?.user.email ?? ""} readOnly className="bg-muted" />
                </div>
              </div>

              <div style={{ marginTop: 16 }}>
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving..." : "Save"}
                </Button>
              </div>
            </form>
          </div>
        </ProfileSection>

        <ProfileSection title="Security" description="Password and sign-in protection">
          <ChangePasswordCard onSubmit={handleChangePassword} successMessage="Password updated successfully." />
        </ProfileSection>
      </div>
    </div>
  )
}

function ProfileSection({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-2xl border border-border/60 bg-muted/20 p-4 md:p-5">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  )
}
