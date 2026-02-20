import { createFileRoute } from "@tanstack/react-router"
import { Users } from "lucide-react"

export const Route = createFileRoute("/_authed/users")({
  component: UsersPage,
})

function UsersPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Users</h1>
        <p className="mt-1 text-sm text-muted-foreground">Global user management across all organizations</p>
      </div>

      <div className="rounded-xl border border-border/50 bg-white p-8 text-center shadow-sm">
        <Users size={32} className="mx-auto mb-3 text-muted-foreground" />
        <p className="font-medium text-foreground">User management</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Global user list and management coming soon. Use organization member management in the admin app for now.
        </p>
      </div>
    </div>
  )
}
