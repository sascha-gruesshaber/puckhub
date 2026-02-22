import { Link, useNavigate } from "@tanstack/react-router"
import { ChevronDown, LogOut, User } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { useSession } from "@/auth-client"
import { signOut } from "../../lib/auth-client"

export function TopBar() {
  return (
    <div className="topbar">
      <div className="topbar-season-trigger" style={{ cursor: "default" }}>
        <div
          className="flex h-8 w-8 items-center justify-center rounded-md shrink-0"
          style={{
            background: "linear-gradient(135deg, #F4D35E, #D4A843)",
            color: "#0C1929",
            fontSize: 12,
            fontWeight: 800,
          }}
        >
          P
        </div>
        <span className="truncate text-sm font-semibold">Platform Administration</span>
      </div>
      <UserMenu />
    </div>
  )
}

function UserMenu() {
  const { data: session } = useSession()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [open])

  if (!session) return null

  const userName = session.user.name || session.user.email
  const initials = session.user.name
    ? session.user.name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : session.user.email.substring(0, 2).toUpperCase()

  async function handleSignOut() {
    setOpen(false)
    await signOut()
    navigate({ to: "/login" })
  }

  return (
    <div ref={containerRef} className="relative">
      <button type="button" onClick={() => setOpen((v) => !v)} className="topbar-user-trigger" data-open={open ? "true" : undefined}>
        <div
          className="flex h-9 w-9 items-center justify-center rounded-full shrink-0"
          style={{
            background: "linear-gradient(135deg, hsl(var(--primary)), hsl(215 55% 30%))",
            color: "hsl(var(--primary-foreground))",
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          {initials}
        </div>
        <span className="hidden sm:block max-w-[140px] truncate text-sm font-medium">{userName}</span>
        <ChevronDown size={14} className="text-muted-foreground" />
      </button>

      {open && (
        <div className="topbar-dropdown">
          <div style={{ padding: "12px 14px 8px" }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "hsl(var(--foreground))" }}>{userName}</div>
            {session.user.name && (
              <div style={{ fontSize: 12, color: "hsl(var(--muted-foreground))", marginTop: 1 }}>{session.user.email}</div>
            )}
          </div>

          <div className="topbar-dropdown-separator" />

          <Link to="/profile" onClick={() => setOpen(false)} className="topbar-dropdown-item">
            <User size={15} strokeWidth={1.5} />
            Profile
          </Link>

          <button type="button" onClick={handleSignOut} className="topbar-dropdown-item" data-destructive="">
            <LogOut size={15} strokeWidth={1.5} />
            Logout
          </button>
          <div style={{ height: 4 }} />
        </div>
      )}
    </div>
  )
}
