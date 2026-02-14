import { Button } from "@puckhub/ui"
import { Zap } from "lucide-react"

interface WelcomeStepProps {
  onNext: () => void
}

export function WelcomeStep({ onNext }: WelcomeStepProps) {
  return (
    <div className="text-center">
      {/* Brand icon */}
      <div
        className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-6"
        style={{
          background: "linear-gradient(135deg, rgba(244,211,94,0.12), rgba(244,211,94,0.04))",
          border: "1px solid rgba(244,211,94,0.15)",
        }}
      >
        <div
          className="flex items-center justify-center rounded-xl"
          style={{
            width: 40,
            height: 40,
            background: "linear-gradient(135deg, #F4D35E 0%, #D4A843 100%)",
            color: "#0C1929",
            fontWeight: 800,
            fontSize: 20,
          }}
        >
          P
        </div>
      </div>

      <h1 className="text-2xl font-bold tracking-tight mb-3" style={{ color: "#E2E8F0" }}>
        Willkommen bei PuckHub
      </h1>

      <p className="text-sm leading-relaxed max-w-sm mx-auto mb-2" style={{ color: "#94A3B8" }}>
        Dein Liga-Management-System ist bereit zur Einrichtung.
      </p>
      <p className="text-sm leading-relaxed max-w-sm mx-auto mb-8" style={{ color: "#64748B" }}>
        In wenigen Schritten erstellst du deinen Admin-Account und kannst direkt loslegen.
      </p>

      <Button variant="accent" onClick={onNext} className="h-11 px-8 text-sm">
        <Zap className="w-4 h-4 mr-2" strokeWidth={2} />
        Los geht's
      </Button>
    </div>
  )
}
