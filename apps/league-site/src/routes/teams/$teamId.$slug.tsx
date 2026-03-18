import { createFileRoute } from "@tanstack/react-router"
import { TeamDetailPage } from "./$teamId"

export const Route = createFileRoute("/teams/$teamId/$slug")({
  component: TeamDetailPage,
  head: () => ({ meta: [{ title: "Team" }] }),
  validateSearch: (s: Record<string, unknown>): { from?: string } => ({
    ...(typeof s.from === "string" && s.from ? { from: s.from } : {}),
  }),
})
