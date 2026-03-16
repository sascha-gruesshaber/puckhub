import { createFileRoute, redirect } from "@tanstack/react-router"

export const Route = createFileRoute("/stats/players/$playerId")({
  beforeLoad: ({ params, search }) => {
    const from = typeof (search as any)?.from === "string" ? (search as any).from : undefined
    throw redirect({ to: "/players/$playerId", params: { playerId: params.playerId }, search: from ? { from } : {} })
  },
  component: () => null,
})
