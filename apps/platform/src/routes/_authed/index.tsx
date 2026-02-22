import { createFileRoute, Link } from "@tanstack/react-router"
import { Building2, UserCheck, Users } from "lucide-react"
import { trpc } from "@/trpc"

export const Route = createFileRoute("/_authed/")({
  component: DashboardPage,
})

function DashboardPage() {
  const { data: orgs, isLoading: orgsLoading } = trpc.organization.listAll.useQuery()
  const { data: users, isLoading: usersLoading } = trpc.users.listAll.useQuery()

  const orgCount = orgs?.length ?? 0
  const totalMembers = orgs?.reduce((sum, o) => sum + o.memberCount, 0) ?? 0
  const userCount = users?.length ?? 0

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Platform Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">Overview of all leagues and users</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-8">
        <StatCard icon={<Building2 size={20} />} label="Leagues" value={orgsLoading ? "-" : String(orgCount)} />
        <StatCard icon={<UserCheck size={20} />} label="Total Memberships" value={orgsLoading ? "-" : String(totalMembers)} />
        <StatCard icon={<Users size={20} />} label="Users" value={usersLoading ? "-" : String(userCount)} />
      </div>

      {/* Recent orgs */}
      {orgs && orgs.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">Leagues</h2>
          <div className="bg-white rounded-xl shadow-sm border border-border/50 overflow-hidden">
            {orgs.map((org, i) => (
              <Link
                key={org.id}
                to="/organizations"
                className={`data-row flex items-center gap-4 px-4 py-3.5 hover:bg-accent/5 transition-colors cursor-pointer ${
                  i < orgs.length - 1 ? "border-b border-border/40" : ""
                }`}
                style={{ "--row-index": i } as React.CSSProperties}
              >
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                  style={{
                    background: "hsl(var(--muted))",
                    color: "hsl(var(--muted-foreground))",
                    fontSize: 14,
                    fontWeight: 700,
                  }}
                >
                  {org.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate">{org.name}</p>
                </div>
                <span className="text-xs text-muted-foreground">
                  {org.memberCount} {org.memberCount === 1 ? "member" : "members"}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-border/50 p-5">
      <div className="flex items-center gap-3">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-lg"
          style={{ background: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))" }}
        >
          {icon}
        </div>
        <div>
          <p className="text-2xl font-bold text-foreground">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </div>
    </div>
  )
}
