import { Button, Input } from "@puckhub/ui"
import { ArrowLeft, ArrowRight, Trophy } from "lucide-react"

export interface LeagueSettingsData {
  leagueName: string
  leagueShortName: string
  locale: string
  timezone: string
  pointsWin: number
  pointsDraw: number
  pointsLoss: number
}

interface LeagueSettingsStepProps {
  data: LeagueSettingsData
  onChange: (data: LeagueSettingsData) => void
  onNext: () => void
  onBack: () => void
}

const LOCALES = [
  { value: "de-DE", label: "Deutsch (Deutschland)" },
  { value: "de-AT", label: "Deutsch (Österreich)" },
  { value: "de-CH", label: "Deutsch (Schweiz)" },
  { value: "en-US", label: "English (US)" },
]

const TIMEZONES = [
  { value: "Europe/Berlin", label: "Europe/Berlin" },
  { value: "Europe/Vienna", label: "Europe/Vienna" },
  { value: "Europe/Zurich", label: "Europe/Zurich" },
  { value: "Europe/London", label: "Europe/London" },
  { value: "America/New_York", label: "America/New_York" },
]

export function LeagueSettingsStep({ data, onChange, onNext, onBack }: LeagueSettingsStepProps) {
  const inputStyle = {
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.1)",
    color: "#E2E8F0",
  }

  const selectStyle = {
    ...inputStyle,
    appearance: "none" as const,
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2394A3B8' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
    backgroundRepeat: "no-repeat",
    backgroundPosition: "right 12px center",
    paddingRight: "36px",
  }

  function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault()
    if (data.leagueName.trim() && data.leagueShortName.trim()) {
      onNext()
    }
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
          <Trophy className="w-6 h-6" style={{ color: "#F4D35E" }} strokeWidth={1.5} />
        </div>
        <h2 className="text-xl font-bold tracking-tight" style={{ color: "#E2E8F0" }}>
          Liga-Einstellungen
        </h2>
        <p className="text-sm mt-2" style={{ color: "#64748B" }}>
          Konfiguriere deine Liga. Diese Einstellungen kannst du später jederzeit ändern.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* League Name */}
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: "#94A3B8" }}>
            Liga-Name
          </label>
          <Input
            value={data.leagueName}
            onChange={(e) => onChange({ ...data, leagueName: e.target.value })}
            placeholder="z.B. Eishockey Regionalliga"
            className="h-10"
            style={inputStyle}
          />
        </div>

        {/* Short Name */}
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: "#94A3B8" }}>
            Kurzname
          </label>
          <Input
            value={data.leagueShortName}
            onChange={(e) => onChange({ ...data, leagueShortName: e.target.value })}
            placeholder="z.B. ERL"
            className="h-10"
            style={inputStyle}
          />
        </div>

        {/* Locale + Timezone */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "#94A3B8" }}>
              Sprache
            </label>
            <select
              value={data.locale}
              onChange={(e) => onChange({ ...data, locale: e.target.value })}
              className="w-full h-10 rounded-md px-3 text-sm"
              style={selectStyle}
            >
              {LOCALES.map((l) => (
                <option key={l.value} value={l.value} style={{ background: "#1a2744", color: "#E2E8F0" }}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "#94A3B8" }}>
              Zeitzone
            </label>
            <select
              value={data.timezone}
              onChange={(e) => onChange({ ...data, timezone: e.target.value })}
              className="w-full h-10 rounded-md px-3 text-sm"
              style={selectStyle}
            >
              {TIMEZONES.map((tz) => (
                <option key={tz.value} value={tz.value} style={{ background: "#1a2744", color: "#E2E8F0" }}>
                  {tz.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Points */}
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: "#94A3B8" }}>
            Punktevergabe
          </label>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] uppercase tracking-wider mb-1" style={{ color: "#475569" }}>
                Sieg
              </label>
              <Input
                type="number"
                value={data.pointsWin}
                onChange={(e) => onChange({ ...data, pointsWin: Number(e.target.value) })}
                min={0}
                className="h-10"
                style={inputStyle}
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider mb-1" style={{ color: "#475569" }}>
                Unentschieden
              </label>
              <Input
                type="number"
                value={data.pointsDraw}
                onChange={(e) => onChange({ ...data, pointsDraw: Number(e.target.value) })}
                min={0}
                className="h-10"
                style={inputStyle}
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider mb-1" style={{ color: "#475569" }}>
                Niederlage
              </label>
              <Input
                type="number"
                value={data.pointsLoss}
                onChange={(e) => onChange({ ...data, pointsLoss: Number(e.target.value) })}
                min={0}
                className="h-10"
                style={inputStyle}
              />
            </div>
          </div>
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
