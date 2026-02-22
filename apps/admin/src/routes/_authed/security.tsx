import { createFileRoute, redirect } from "@tanstack/react-router"

export const Route = createFileRoute("/_authed/security")({
  beforeLoad: () => {
    throw redirect({ to: "/profile" })
  },
  component: () => null,
})
