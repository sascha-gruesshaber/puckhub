import { useNavigate } from "@tanstack/react-router"
import { useState } from "react"
import { trpc } from "../../../lib/trpc"
import { StepIndicator } from "./stepIndicator"
import { AdminAccountStep, type AdminData } from "./steps/adminAccountStep"
import { CompleteStep } from "./steps/completeStep"
import { FirstSeasonStep, type SeasonData } from "./steps/firstSeasonStep"
import { type LeagueSettingsData, LeagueSettingsStep } from "./steps/leagueOverviewStep"
import { WelcomeStep } from "./steps/welcomeStep"
import { WizardLayout } from "./wizardLayout"

const TOTAL_STEPS = 5

export function GettingStartedWizard() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [error, setError] = useState("")

  const [adminData, setAdminData] = useState<AdminData>({
    name: "",
    email: "",
    password: "",
  })
  const [leagueSettings, setLeagueSettings] = useState<LeagueSettingsData>({
    leagueName: "",
    leagueShortName: "",
    locale: "de-DE",
    timezone: "Europe/Berlin",
    pointsWin: 2,
    pointsDraw: 1,
    pointsLoss: 0,
  })
  const [seasonData, setSeasonData] = useState<SeasonData | null>({
    name: `Season ${String(new Date().getFullYear()).slice(-2)}/${String(new Date().getFullYear() + 1).slice(-2)}`,
    seasonStart: `${new Date().getFullYear()}-09-01`,
    seasonEnd: `${new Date().getFullYear() + 1}-04-30`,
  })

  const initializeMutation = trpc.setup.initialize.useMutation({
    onSuccess: () => {
      setError("")
      setStep(4)
    },
    onError: (err) => {
      setError(err.message)
    },
  })

  function handleFinalizeSeason() {
    setError("")
    initializeMutation.mutate({
      admin: adminData,
      leagueSettings,
      season: seasonData ?? undefined,
    })
  }

  function handleFinish() {
    navigate({ to: "/login" })
  }

  return (
    <WizardLayout>
      <StepIndicator totalSteps={TOTAL_STEPS} currentStep={step} />

      {/* Error display */}
      {error && (
        <div
          className="rounded-lg p-3 mb-6 text-sm text-center"
          style={{
            background: "rgba(239,68,68,0.1)",
            border: "1px solid rgba(239,68,68,0.2)",
            color: "#EF4444",
          }}
        >
          {error}
        </div>
      )}

      {/* Steps */}
      <div
        className="transition-all duration-300"
        style={{
          opacity: initializeMutation.isPending ? 0.6 : 1,
          pointerEvents: initializeMutation.isPending ? "none" : "auto",
        }}
      >
        {step === 0 && <WelcomeStep onNext={() => setStep(1)} />}

        {step === 1 && (
          <AdminAccountStep
            data={adminData}
            onChange={setAdminData}
            onNext={() => setStep(2)}
            onBack={() => setStep(0)}
          />
        )}

        {step === 2 && (
          <LeagueSettingsStep
            data={leagueSettings}
            onChange={setLeagueSettings}
            onNext={() => setStep(3)}
            onBack={() => setStep(1)}
          />
        )}

        {step === 3 && (
          <FirstSeasonStep
            data={seasonData}
            onChange={setSeasonData}
            onNext={handleFinalizeSeason}
            onBack={() => setStep(2)}
          />
        )}

        {step === 4 && <CompleteStep onFinish={handleFinish} />}
      </div>

      {/* Loading indicator */}
      {initializeMutation.isPending && (
        <div className="text-center mt-6">
          <div
            className="inline-block w-5 h-5 rounded-full border-2 animate-spin"
            style={{
              borderColor: "rgba(244,211,94,0.2)",
              borderTopColor: "#F4D35E",
            }}
          />
          <p className="text-xs mt-2" style={{ color: "#64748B" }}>
            Einrichtung wird durchgeführt...
          </p>
        </div>
      )}
    </WizardLayout>
  )
}
