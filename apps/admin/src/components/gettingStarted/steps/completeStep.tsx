import { Button } from "@puckhub/ui"
import { ArrowRight, CheckCircle2 } from "lucide-react"

interface CompleteStepProps {
  onFinish: () => void
}

export function CompleteStep({ onFinish }: CompleteStepProps) {
  return (
    <div className="text-center">
      {/* Success icon */}
      <div
        className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-6"
        style={{
          background: "linear-gradient(135deg, rgba(34,197,94,0.15), rgba(34,197,94,0.05))",
          border: "1px solid rgba(34,197,94,0.2)",
        }}
      >
        <CheckCircle2 className="w-8 h-8" style={{ color: "#22C55E" }} strokeWidth={1.5} />
      </div>

      <h2 className="text-xl font-bold tracking-tight mb-3" style={{ color: "#E2E8F0" }}>
        Alles bereit!
      </h2>

      <p className="text-sm leading-relaxed max-w-sm mx-auto mb-2" style={{ color: "#94A3B8" }}>
        Dein PuckHub-System ist erfolgreich eingerichtet.
      </p>
      <p className="text-sm leading-relaxed max-w-sm mx-auto mb-8" style={{ color: "#64748B" }}>
        Melde dich jetzt mit deinem neuen Admin-Account an.
      </p>

      <Button variant="accent" onClick={onFinish} className="h-11 px-8 text-sm">
        Zur Anmeldung
        <ArrowRight className="w-4 h-4 ml-2" />
      </Button>
    </div>
  )
}
