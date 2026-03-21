import { createFileRoute, Navigate } from "@tanstack/react-router"

export const Route = createFileRoute("/_authed/")({
  component: () => <Navigate to="/organizations" />,
})
