import { Button, Input } from "@puckhub/ui"
import { ArrowLeft, ArrowRight, Eye, EyeOff, UserPlus } from "lucide-react"
import { useState } from "react"

export interface AdminData {
  name: string
  email: string
  password: string
}

interface AdminAccountStepProps {
  data: AdminData
  onChange: (data: AdminData) => void
  onNext: () => void
  onBack: () => void
}

export function AdminAccountStep({ data, onChange, onNext, onBack }: AdminAccountStepProps) {
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  function validate(): boolean {
    const e: Record<string, string> = {}

    if (!data.name.trim()) e.name = "Name ist erforderlich"
    if (!data.email.trim()) {
      e.email = "E-Mail ist erforderlich"
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      e.email = "Ungültige E-Mail-Adresse"
    }
    if (data.password.length < 6) {
      e.password = "Mindestens 6 Zeichen"
    }
    if (data.password !== confirmPassword) {
      e.confirm = "Passwörter stimmen nicht überein"
    }

    setErrors(e)
    return Object.keys(e).length === 0
  }

  function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault()
    if (validate()) onNext()
  }

  const inputStyle = {
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.1)",
    color: "#E2E8F0",
  }

  return (
    <div>
      {/* Header */}
      <div className="text-center mb-8">
        <div
          className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-5"
          style={{
            background: "linear-gradient(135deg, rgba(244,211,94,0.12), rgba(244,211,94,0.04))",
            border: "1px solid rgba(244,211,94,0.15)",
          }}
        >
          <UserPlus className="w-6 h-6" style={{ color: "#F4D35E" }} strokeWidth={1.5} />
        </div>
        <h2 className="text-xl font-bold tracking-tight" style={{ color: "#E2E8F0" }}>
          Admin-Account erstellen
        </h2>
        <p className="text-sm mt-2" style={{ color: "#64748B" }}>
          Der erste Benutzer erhält automatisch Super-Admin-Rechte.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: "#94A3B8" }}>
            Name
          </label>
          <Input
            value={data.name}
            onChange={(e) => onChange({ ...data, name: e.target.value })}
            placeholder="Max Mustermann"
            className="h-10"
            style={inputStyle}
          />
          {errors.name && (
            <p className="text-xs mt-1" style={{ color: "#EF4444" }}>
              {errors.name}
            </p>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: "#94A3B8" }}>
            E-Mail
          </label>
          <Input
            type="email"
            value={data.email}
            onChange={(e) => onChange({ ...data, email: e.target.value })}
            placeholder="admin@liga.de"
            className="h-10"
            style={inputStyle}
          />
          {errors.email && (
            <p className="text-xs mt-1" style={{ color: "#EF4444" }}>
              {errors.email}
            </p>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: "#94A3B8" }}>
            Passwort
          </label>
          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              value={data.password}
              onChange={(e) => onChange({ ...data, password: e.target.value })}
              placeholder="Mindestens 6 Zeichen"
              className="h-10 pr-10"
              style={inputStyle}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2"
              style={{ color: "#64748B", background: "none", border: "none", cursor: "pointer" }}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.password && (
            <p className="text-xs mt-1" style={{ color: "#EF4444" }}>
              {errors.password}
            </p>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: "#94A3B8" }}>
            Passwort bestätigen
          </label>
          <Input
            type={showPassword ? "text" : "password"}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Passwort wiederholen"
            className="h-10"
            style={inputStyle}
          />
          {errors.confirm && (
            <p className="text-xs mt-1" style={{ color: "#EF4444" }}>
              {errors.confirm}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 text-xs"
            style={{ color: "#64748B", background: "none", border: "none", cursor: "pointer" }}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Zurück
          </button>
          <Button type="submit" variant="accent" className="h-9 px-5 text-xs">
            Weiter
            <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
          </Button>
        </div>
      </form>
    </div>
  )
}
