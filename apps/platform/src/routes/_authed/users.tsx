import { Badge } from "@puckhub/ui"
import { createFileRoute } from "@tanstack/react-router"
import { Building2, Search, Shield, Users } from "lucide-react"
import { useState } from "react"
import { trpc } from "@/trpc"

export const Route = createFileRoute("/_authed/users")({
  component: UsersPage,
})

function UsersPage() {
  const { data: users, isLoading } = trpc.users.listAll.useQuery()
  const [search, setSearch] = useState("")

  const filtered = users?.filter((u) => {
    if (!search) return true
    const q = search.toLowerCase()
    return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
  })

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Users</h1>
        <p className="mt-1 text-sm text-muted-foreground">Global user management across all organizations</p>
      </div>

      {/* Search */}
      <div className="relative mb-6 max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-border/50 bg-white py-2 pl-9 pr-3 text-sm shadow-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      {isLoading ? (
        <div className="space-y-3 animate-pulse">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 rounded-xl bg-muted" />
          ))}
        </div>
      ) : !filtered || filtered.length === 0 ? (
        <div className="rounded-xl border border-border/50 bg-white p-8 text-center shadow-sm">
          <Users size={32} className="mx-auto mb-3 text-muted-foreground" />
          <p className="font-medium text-foreground">{search ? "No users found" : "No users yet"}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {search ? "Try a different search term." : "Users will appear here once they sign up."}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-border/50 overflow-hidden">
          {filtered.map((user, i) => (
            <div
              key={user.id}
              className={`flex items-center gap-4 px-4 py-3.5 hover:bg-accent/5 transition-colors ${
                i < filtered.length - 1 ? "border-b border-border/40" : ""
              }`}
            >
              {/* Avatar */}
              {user.image ? (
                <img src={user.image} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" />
              ) : (
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                  style={{ background: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))", fontSize: 16, fontWeight: 700 }}
                >
                  {user.name.charAt(0).toUpperCase()}
                </div>
              )}

              {/* Name + Email */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold truncate">{user.name}</p>
                  {user.role === "admin" && (
                    <Badge variant="secondary" className="gap-1 text-xs">
                      <Shield size={10} />
                      Platform Admin
                    </Badge>
                  )}
                  {user.banned && (
                    <Badge variant="destructive" className="text-xs">
                      Banned
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              </div>

              {/* Organizations */}
              <div className="hidden sm:flex items-center gap-1.5 shrink-0">
                {user.organizations.length === 0 ? (
                  <span className="text-xs text-muted-foreground">No organization</span>
                ) : (
                  user.organizations.map((org) => (
                    <span
                      key={org.organizationId}
                      className="inline-flex items-center gap-1 rounded-md bg-muted/60 px-2 py-0.5 text-xs text-muted-foreground"
                      title={`${org.organizationName} (${org.role})`}
                    >
                      <Building2 size={10} />
                      {org.organizationSlug}
                    </span>
                  ))
                )}
              </div>

              {/* Created date */}
              <div className="text-right shrink-0 hidden md:block">
                <p className="text-xs text-muted-foreground">
                  {new Date(user.createdAt).toLocaleDateString("de-DE")}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary */}
      {filtered && filtered.length > 0 && (
        <p className="mt-3 text-xs text-muted-foreground">
          {filtered.length} {filtered.length === 1 ? "user" : "users"}
          {search && users && filtered.length !== users.length ? ` (of ${users.length} total)` : ""}
        </p>
      )}
    </div>
  )
}
