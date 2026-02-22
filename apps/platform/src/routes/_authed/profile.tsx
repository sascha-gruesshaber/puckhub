import { Button, ChangePasswordCard, Input, toast } from "@puckhub/ui"
import { createFileRoute } from "@tanstack/react-router"
import { type FormEvent, useState } from "react"
import { authClient, useSession } from "@/auth-client"

export const Route = createFileRoute("/_authed/profile")({
  component: ProfilePage,
})

function ProfilePage() {
  const { data: session } = useSession()
  const [name, setName] = useState(session?.user.name ?? "")
  const [saving, setSaving] = useState(false)

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
  }

  return (
    <div className="space-y-6" style={{ maxWidth: 760 }}>
      <div>
        <h1 className="text-2xl font-bold text-foreground">Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage your personal account settings</p>
      </div>

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

      <ChangePasswordCard onSubmit={handleChangePassword} successMessage="Password updated successfully." />
    </div>
  )
}
