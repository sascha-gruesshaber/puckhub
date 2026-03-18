import { createFileRoute, redirect } from "@tanstack/react-router"

export const Route = createFileRoute("/stats/teams/$teamId")({
  beforeLoad: ({ params, search }) => {
    const from = typeof (search as any)?.from === "string" ? (search as any).from : undefined
    throw redirect({ to: "/teams/$teamId", params: { teamId: params.teamId }, search: { from } })
  },
  component: () => null,
})
