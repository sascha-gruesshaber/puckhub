import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@puckhub/ui"
import { Link, useNavigate } from "@tanstack/react-router"
import { ChevronDown, LogOut, Menu, User } from "lucide-react"
import { useSession } from "@/auth-client"
import { useMobileSidebar } from "~/contexts/mobileSidebarContext"
import { signOut } from "../../lib/auth-client"

export function TopBar() {
  const { toggle } = useMobileSidebar()
  return (
    <div className="topbar">
      <div className="flex items-center">
        <button
          type="button"
          onClick={toggle}
          className="lg:hidden mr-2 flex items-center justify-center rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label="Toggle sidebar"
        >
          <Menu size={20} />
        </button>
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
      </div>
      <UserMenu />
    </div>
  )
}

function UserMenu() {
  const { data: session } = useSession()
  const navigate = useNavigate()

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
    await signOut()
    navigate({ to: "/login" })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className="topbar-user-trigger">
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
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="min-w-[220px]">
        <DropdownMenuLabel className="font-normal">
          <div className="text-sm font-semibold">{userName}</div>
          {session.user.name && <div className="text-xs text-muted-foreground mt-0.5">{session.user.email}</div>}
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link to="/profile">
            <User size={15} strokeWidth={1.5} />
            Profile
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
          <LogOut size={15} strokeWidth={1.5} />
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
