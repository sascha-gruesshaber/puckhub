import { type FormEvent, useState } from "react"
import { Button } from "./button"
import { Card, CardContent } from "./card"
import { Input } from "./input"

export interface ChangePasswordValues {
  currentPassword: string
  newPassword: string
}

export interface ChangePasswordCardProps {
  onSubmit: (values: ChangePasswordValues) => Promise<void>
  title?: string
  description?: string
  currentPasswordLabel?: string
  newPasswordLabel?: string
  confirmPasswordLabel?: string
  currentPasswordPlaceholder?: string
  newPasswordPlaceholder?: string
  confirmPasswordPlaceholder?: string
  submitLabel?: string
  submittingLabel?: string
  minLength?: number
  minLengthMessage?: string
  mismatchMessage?: string
  successMessage?: string
}

function formatUnknownError(err: unknown) {
  if (err instanceof Error && err.message) return err.message
  if (typeof err === "string") return err
  return "Could not update password."
}

export function ChangePasswordCard({
  onSubmit,
  title = "Change Password",
  description = "Update your sign-in password.",
  currentPasswordLabel = "Current password",
  newPasswordLabel = "New password",
  confirmPasswordLabel = "Confirm new password",
  currentPasswordPlaceholder = "Current password",
  newPasswordPlaceholder = "At least 6 characters",
  confirmPasswordPlaceholder = "Repeat new password",
  submitLabel = "Change password",
  submittingLabel = "Saving...",
  minLength = 6,
  minLengthMessage = "New password is too short.",
  mismatchMessage = "Passwords do not match.",
  successMessage = "Password updated.",
}: ChangePasswordCardProps) {
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError("")
    setSuccess("")

    if (newPassword.length < minLength) {
      setError(minLengthMessage)
      return
    }
    if (newPassword !== confirmPassword) {
      setError(mismatchMessage)
      return
    }

    setSubmitting(true)
    try {
      await onSubmit({ currentPassword, newPassword })
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
      setSuccess(successMessage)
    } catch (err) {
      setError(formatUnknownError(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="mb-4">
          <h2 className="text-base font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="current-password" className="mb-1.5 block text-sm font-medium">
              {currentPasswordLabel}
            </label>
            <Input
              id="current-password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder={currentPasswordPlaceholder}
              required
            />
          </div>

          <div>
            <label htmlFor="new-password" className="mb-1.5 block text-sm font-medium">
              {newPasswordLabel}
            </label>
            <Input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder={newPasswordPlaceholder}
              required
            />
          </div>

          <div>
            <label htmlFor="confirm-password" className="mb-1.5 block text-sm font-medium">
              {confirmPasswordLabel}
            </label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder={confirmPasswordPlaceholder}
              required
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
          {success && <p className="text-sm text-emerald-600">{success}</p>}

          <Button type="submit" disabled={submitting}>
            {submitting ? submittingLabel : submitLabel}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
