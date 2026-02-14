import { Button, Input } from "@puckhub/ui"
import { ArrowLeft, ArrowRight, Calendar, SkipForward } from "lucide-react"
import { useState } from "react"

export interface SeasonData {
  name: string
  seasonStart: string
  seasonEnd: string
}

interface FirstSeasonStepProps {
  data: SeasonData | null
  onChange: (data: SeasonData | null) => void
  onNext: () => void
  onBack: () => void
}

export function FirstSeasonStep({ data, onChange, onNext, onBack }: FirstSeasonStepProps) {
  const [skip, setSkip] = useState(data === null)
  const currentYear = new Date().getFullYear()
  const defaultSeasonStart = `${currentYear}-09-01`
  const defaultSeasonEnd = `${currentYear + 1}-04-30`

  function suggestedSeasonName(seasonStart: string, seasonEnd: string) {
    const start = String(new Date(`${seasonStart}T00:00:00.000Z`).getUTCFullYear()).slice(-2)
    const end = String(new Date(`${seasonEnd}T00:00:00.000Z`).getUTCFullYear()).slice(-2)
    return `Season ${start}/${end}`
  }

  const localData = data ?? {
    seasonStart: defaultSeasonStart,
    seasonEnd: defaultSeasonEnd,
    name: suggestedSeasonName(defaultSeasonStart, defaultSeasonEnd),
  }

  function handleToggleSkip() {
    if (skip) {
      // Enable season creation
      setSkip(false)
      onChange(localData)
    } else {
      setSkip(true)
      onChange(null)
    }
  }

  function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault()
    if (!skip) {
      onChange(localData)
    }
    onNext()
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
          <Calendar className="w-6 h-6" style={{ color: "#F4D35E" }} strokeWidth={1.5} />
        </div>
        <h2 className="text-xl font-bold tracking-tight" style={{ color: "#E2E8F0" }}>
          Erste Saison anlegen
        </h2>
        <p className="text-sm mt-2" style={{ color: "#64748B" }}>
          Optional: Du kannst Saisons auch später erstellen.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Skip toggle */}
        <button
          type="button"
          onClick={handleToggleSkip}
          className="w-full flex items-center gap-3 p-3.5 rounded-xl mb-4 text-left transition-all"
          style={{
            background: skip
              ? "linear-gradient(135deg, rgba(26,39,68,0.9), rgba(15,23,42,0.95))"
              : "rgba(255,255,255,0.015)",
            border: `1px solid ${skip ? "rgba(100,116,139,0.4)" : "rgba(255,255,255,0.05)"}`,
            cursor: "pointer",
          }}
        >
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: "rgba(100,116,139,0.1)", color: "#64748B" }}
          >
            <SkipForward className="w-4 h-4" />
          </div>
          <div>
            <div className="text-sm font-medium" style={{ color: "#E2E8F0" }}>
              Überspringen
            </div>
            <div className="text-xs" style={{ color: "#64748B" }}>
              Saison später manuell anlegen
            </div>
          </div>
        </button>

        {/* Season form (shown when not skipping) */}
        {!skip && (
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "#94A3B8" }}>
                Saisonname
              </label>
              <Input
                value={localData.name}
                onChange={(e) => onChange({ ...localData, name: e.target.value })}
                placeholder={suggestedSeasonName(localData.seasonStart, localData.seasonEnd)}
                className="h-10"
                style={inputStyle}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "#94A3B8" }}>
                  Saisonstart
                </label>
                <Input
                  type="date"
                  value={localData.seasonStart}
                  onChange={(e) =>
                    onChange({
                      ...localData,
                      seasonStart: e.target.value,
                      name: localData.name.trim() || suggestedSeasonName(e.target.value, localData.seasonEnd),
                    })
                  }
                  className="h-10"
                  style={inputStyle}
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "#94A3B8" }}>
                  Saisonende
                </label>
                <Input
                  type="date"
                  value={localData.seasonEnd}
                  onChange={(e) =>
                    onChange({
                      ...localData,
                      seasonEnd: e.target.value,
                      name: localData.name.trim() || suggestedSeasonName(localData.seasonStart, e.target.value),
                    })
                  }
                  className="h-10"
                  style={inputStyle}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "#94A3B8" }}>
                Name-Vorschlag
              </label>
              <div className="h-10 px-3 rounded-md flex items-center text-sm" style={inputStyle}>
                {suggestedSeasonName(localData.seasonStart, localData.seasonEnd)}
              </div>
            </div>
          </div>
        )}

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
            Einrichtung abschließen
            <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
          </Button>
        </div>
      </form>
    </div>
  )
}
