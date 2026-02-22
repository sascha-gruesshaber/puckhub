import { Link, useNavigate, useRouterState } from "@tanstack/react-router"
import { ArrowLeftRight, Calendar, Check, ChevronDown, LogOut, Plus, User } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { trpc } from "@/trpc"
import { useOrganization } from "~/contexts/organizationContext"
import { useWorkingSeason } from "~/contexts/seasonContext"
import { useTranslation } from "~/i18n/use-translation"
import { signOut, useSession } from "../../lib/auth-client"

const SEASON_ROUTE_RE = /^\/seasons\/[^/]+\/(structure|roster)$/
const TOPBAR_CONTROL_HEIGHT = "73px"

function shortSeasonLabel(start: Date | string) {
  return String(new Date(start).getUTCFullYear()).slice(-2)
}

export function TopBar() {
  return (
    <div className="topbar" style={{ height: TOPBAR_CONTROL_HEIGHT }}>
      <SeasonSection />
      <UserSection />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Season Section (left side)
// ---------------------------------------------------------------------------
function SeasonSection() {
  const { t } = useTranslation("common")
  const { season, setWorkingSeason, isLoading } = useWorkingSeason()
  const { data: seasons } = trpc.season.list.useQuery()
  const { data: currentSeason } = trpc.season.getCurrent.useQuery()
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  // Close dropdown on outside click
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

  if (isLoading) return <div />

  // No season — show create button
  if (!season) {
    return (
      <button
        type="button"
        onClick={() => navigate({ to: "/seasons", search: { create: true } })}
        className="topbar-season-trigger"
        style={{
          height: TOPBAR_CONTROL_HEIGHT,
          border: "1px dashed hsl(var(--border))",
          background: "white",
        }}
      >
        <Plus size={16} strokeWidth={1.5} style={{ color: "hsl(var(--muted-foreground))" }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: "hsl(var(--foreground))" }}>
          {t("seasonIndicator.createFirst")}
        </span>
      </button>
    )
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="topbar-season-trigger"
        style={{ height: TOPBAR_CONTROL_HEIGHT }}
      >
        {/* Year badge */}
        <div
          className="flex items-center justify-center shrink-0 rounded-md"
          style={{
            width: 28,
            height: 34,
            width: 34,
            background: "linear-gradient(135deg, #F4D35E, #D4A843)",
            color: "#0C1929",
            fontSize: 13,
            fontWeight: 800,
            letterSpacing: "-0.02em",
          }}
        >
          {shortSeasonLabel(season.seasonStart)}
        </div>
        <span style={{ fontSize: 13, fontWeight: 600, color: "hsl(var(--foreground))" }}>{season.name}</span>
        <ChevronDown
          size={14}
          style={{
            color: "hsl(var(--muted-foreground))",
            transition: "transform 150ms ease",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
          }}
        />
      </button>

      {/* Season Dropdown */}
      {open && seasons && (
        <div className="topbar-season-dropdown">
          <div className="topbar-season-dropdown-header">{t("seasonIndicator.switchSeason")}</div>
          <div className="topbar-season-list">
            {seasons.map((s) => {
              const isSelected = s.id === season.id
              return (
                <button
                  type="button"
                  key={s.id}
                  onClick={() => {
                    setWorkingSeason({
                      id: s.id,
                      name: s.name,
                      seasonStart: new Date(s.seasonStart).toISOString(),
                      seasonEnd: new Date(s.seasonEnd).toISOString(),
                    })
                    setOpen(false)
                    const match = pathname.match(SEASON_ROUTE_RE)
                    if (match) {
                      navigate({
                        to: `/seasons/$seasonId/${match[1]}` as "/seasons/$seasonId/structure",
                        params: { seasonId: s.id },
                      })
                    }
                  }}
                  className="topbar-season-item"
                  data-selected={isSelected ? "true" : undefined}
                  style={{
                    marginBottom: 2,
                  }}
                >
                  <div
                    className="flex items-center justify-center shrink-0 rounded-md"
                    style={{
                      width: 24,
                      height: 24,
                      background: isSelected ? "linear-gradient(135deg, #F4D35E, #D4A843)" : "hsl(var(--muted))",
                      color: isSelected ? "#0C1929" : "hsl(var(--muted-foreground))",
                      fontSize: 9,
                      fontWeight: 800,
                    }}
                  >
                    {shortSeasonLabel(s.seasonStart)}
                  </div>
                  <span
                    className="flex-1 truncate"
                    style={{
                      fontSize: 13,
                      fontWeight: isSelected ? 600 : 500,
                      color: isSelected ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))",
                    }}
                  >
                    {s.name}
                  </span>
                  {currentSeason?.id === s.id && (
                    <span className="topbar-season-item-badge">{t("seasonPicker.active")}</span>
                  )}
                  {isSelected && <Check size={14} style={{ color: "hsl(var(--accent-foreground))", flexShrink: 0 }} />}
                </button>
              )
            })}
          </div>
          {/* Manage seasons link */}
          <div className="topbar-dropdown-separator" />
          <Link
            to="/seasons"
            onClick={() => setOpen(false)}
            className="topbar-dropdown-item"
            style={{ fontSize: 12, color: "hsl(var(--muted-foreground))" }}
          >
            <Calendar size={14} strokeWidth={1.5} />
            {t("seasonIndicator.manageSeasons")}
          </Link>
          <div style={{ height: 4 }} />
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// User Section (right side)
// ---------------------------------------------------------------------------
function UserSection() {
  const { t } = useTranslation("common")
  const { data: session } = useSession()
  const { organizations, clearOrganization } = useOrganization()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
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
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="topbar-user-trigger"
        data-open={open ? "true" : undefined}
        style={{ height: TOPBAR_CONTROL_HEIGHT }}
      >
        {/* Avatar */}
        <div
          className="flex items-center justify-center shrink-0"
          style={{
            width: 30,
            height: 36,
            width: 36,
            borderRadius: "50%",
            background: "linear-gradient(135deg, hsl(var(--primary)), hsl(215 55% 30%))",
            color: "hsl(var(--primary-foreground))",
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          {initials}
        </div>
        <span
          className="hidden sm:block max-w-[120px] truncate"
          style={{ fontSize: 13, fontWeight: 500, color: "hsl(var(--foreground))" }}
        >
          {userName}
        </span>
        <ChevronDown
          size={14}
          style={{
            color: "hsl(var(--muted-foreground))",
            transition: "transform 150ms ease",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
          }}
        />
      </button>

      {/* User Dropdown */}
      {open && (
        <>
          {/* Backdrop for mobile */}
          {/* biome-ignore lint/a11y/useKeyWithClickEvents: backdrop overlay */}
          {/* biome-ignore lint/a11y/noNoninteractiveElementInteractions: backdrop overlay */}
          {/* biome-ignore lint/a11y/noStaticElementInteractions: backdrop overlay */}
          <div className="fixed inset-0 z-40 sm:hidden" onClick={() => setOpen(false)} />

          <div className="topbar-dropdown">
            {/* User info header */}
            <div style={{ padding: "12px 14px 8px" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "hsl(var(--foreground))" }}>
                {session.user.name || session.user.email}
              </div>
              {session.user.name && (
                <div style={{ fontSize: 12, color: "hsl(var(--muted-foreground))", marginTop: 1 }}>
                  {session.user.email}
                </div>
              )}
            </div>

            <div className="topbar-dropdown-separator" />

            {/* Profile link */}
            <Link to="/profile" onClick={() => setOpen(false)} className="topbar-dropdown-item">
              <User size={15} strokeWidth={1.5} />
              {t("topBar.profile")}
            </Link>

            {/* Switch league */}
            {organizations.length > 1 && (
              <button
                type="button"
                onClick={() => {
                  setOpen(false)
                  clearOrganization()
                }}
                className="topbar-dropdown-item"
              >
                <ArrowLeftRight size={15} strokeWidth={1.5} />
                {t("topBar.switchLeague")}
              </button>
            )}

            <div className="topbar-dropdown-separator" />

            {/* Logout */}
            <button type="button" onClick={handleSignOut} className="topbar-dropdown-item" data-destructive="">
              <LogOut size={15} strokeWidth={1.5} />
              {t("topBar.logout")}
            </button>
            <div style={{ height: 4 }} />
          </div>
        </>
      )}
    </div>
  )
}
