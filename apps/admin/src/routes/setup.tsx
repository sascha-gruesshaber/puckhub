import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { GettingStartedWizard } from "~/components/gettingStarted/gettingStartedWizard"
import { trpc } from "../../lib/trpc"

export const Route = createFileRoute("/setup")({
  component: SetupPage,
})

function SetupPage() {
  const navigate = useNavigate()
  const { data, isLoading } = trpc.setup.status.useQuery()

  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ background: "#0A1220" }}>
        <div
          className="w-6 h-6 rounded-full border-2 animate-spin"
          style={{
            borderColor: "rgba(244,211,94,0.2)",
            borderTopColor: "#F4D35E",
          }}
        />
      </div>
    )
  }

  if (data && !data.needsSetup) {
    navigate({ to: "/login" })
    return null
  }

  return <GettingStartedWizard />
}
