import { createFileRoute, redirect } from "@tanstack/react-router"

export const Route = createFileRoute("/stats/players/$playerId/$slug")({
  beforeLoad: ({ params, search }) => {
    const from = typeof (search as any)?.from === "string" ? (search as any).from : undefined
    throw redirect({
      to: "/players/$playerId/$slug",
      params: { playerId: params.playerId, slug: params.slug },
      search: from ? { from } : {},
    })
  },
  component: () => null,
})
