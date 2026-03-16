import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@puckhub/ui"
import { Link, useNavigate, useParams, useRouterState } from "@tanstack/react-router"
import { ArrowLeftRight, Calendar, Check, ChevronDown, LogOut, Menu, Plus, Sparkles, User } from "lucide-react"
import { trpc } from "@/trpc"
import { useMobileSidebar } from "~/contexts/mobileSidebarContext"
import { useOrganization } from "~/contexts/organizationContext"
import { useWorkingSeason } from "~/contexts/seasonContext"
import { useTranslation } from "~/i18n/use-translation"
import { signOut, useSession } from "../../lib/auth-client"

const SEASON_ROUTE_RE = /\/seasons\/[^/]+\/(structure|roster)$/
const TOPBAR_CONTROL_HEIGHT = "73px"

function shortSeasonLabel(start: Date | string) {
  return String(new Date(start).getUTCFullYear()).slice(-2)
}

export function TopBar() {
  const { toggle } = useMobileSidebar()
  return (
    <div className="topbar" style={{ height: TOPBAR_CONTROL_HEIGHT }}>
      <div className="flex items-center">
        <button
          type="button"
          onClick={toggle}
          className="lg:hidden mr-2 flex items-center justify-center rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label="Toggle sidebar"
        >
          <Menu size={20} />
        </button>
        <SeasonSection />
      </div>
      <div className="flex items-center gap-1">
        <AiUsageIndicator />
        <UserSection />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Season Section (left side) — now uses Radix Popover
// ---------------------------------------------------------------------------
function SeasonSection() {
  const { t } = useTranslation("common")
  const { season, setWorkingSeason, isLoading } = useWorkingSeason()
  const { orgSlug } = useParams({ strict: false }) as { orgSlug: string }
  const { data: seasons } = trpc.season.list.useQuery()
  const { data: currentSeason } = trpc.season.getCurrent.useQuery()
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  if (isLoading) return <div />

  // No season — show create button
  if (!season) {
    return (
      <button
        type="button"
        onClick={() => navigate({ to: "/$orgSlug/seasons", params: { orgSlug }, search: { edit: "new" } })}
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
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="topbar-season-trigger"
          style={{ height: TOPBAR_CONTROL_HEIGHT }}
        >
          {/* Year badge */}
          <div
            className="flex items-center justify-center shrink-0 rounded-md"
            style={{
              width: 34,
              height: 34,
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
          <ChevronDown size={14} className="text-muted-foreground transition-transform" />
        </button>
      </PopoverTrigger>

      <PopoverContent align="start" className="min-w-[280px] p-0 rounded-xl">
        <div className="topbar-season-dropdown-header">{t("seasonIndicator.switchSeason")}</div>
        <div className="topbar-season-list">
          {seasons?.map((s) => {
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
                  const match = pathname.match(SEASON_ROUTE_RE)
                  if (match) {
                    navigate({
                      to: `/$orgSlug/seasons/$seasonId/${match[1]}` as "/$orgSlug/seasons/$seasonId/structure",
                      params: { orgSlug, seasonId: s.id },
                    })
                  }
                }}
                className="topbar-season-item"
                data-selected={isSelected ? "true" : undefined}
                style={{ marginBottom: 2 }}
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
        <div className="h-px bg-border my-1" />
        <Link
          to="/$orgSlug/seasons"
          params={{ orgSlug }}
          className="flex items-center gap-2.5 w-full px-3.5 py-2 text-xs text-muted-foreground hover:bg-muted transition-colors"
        >
          <Calendar size={14} strokeWidth={1.5} />
          {t("seasonIndicator.manageSeasons")}
        </Link>
        <div style={{ height: 4 }} />
      </PopoverContent>
    </Popover>
  )
}

// ---------------------------------------------------------------------------
// AI Usage Indicator (between season and user)
// ---------------------------------------------------------------------------
function AiUsageIndicator() {
  const { orgSlug } = useParams({ strict: false }) as { orgSlug: string }
  const { data: aiUsage } = trpc.aiRecap.getUsage.useQuery(undefined, { staleTime: 60_000 })

  if (!aiUsage?.aiEnabled || !aiUsage?.featureAvailable) return null

  const percent = aiUsage.limit ? Math.min(100, Math.round((aiUsage.used / aiUsage.limit) * 100)) : null

  if (percent === null) return null

  return (
    <Link
      to="/$orgSlug/settings"
      params={{ orgSlug }}
      className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors ${
        percent >= 80
          ? "text-amber-600 bg-amber-50 hover:bg-amber-100"
          : "text-muted-foreground bg-muted/50 hover:bg-muted"
      }`}
      title={`AI: ${aiUsage.used.toLocaleString()} / ${aiUsage.limit?.toLocaleString()} tokens`}
    >
      <Sparkles className="w-3 h-3" />
      <span className="tabular-nums">{percent}%</span>
    </Link>
  )
}

// ---------------------------------------------------------------------------
// User Section (right side) — now uses Radix DropdownMenu
// ---------------------------------------------------------------------------
function UserSection() {
  const { t } = useTranslation("common")
  const { data: session } = useSession()
  const { organizations } = useOrganization()
  const { orgSlug } = useParams({ strict: false }) as { orgSlug: string }
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
        <button
          type="button"
          className="topbar-user-trigger"
          style={{ height: TOPBAR_CONTROL_HEIGHT }}
        >
          {/* Avatar */}
          <div
            className="flex items-center justify-center shrink-0"
            style={{
              width: 36,
              height: 36,
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
          <ChevronDown size={14} className="text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="min-w-[220px]">
        <DropdownMenuLabel className="font-normal">
          <div className="text-sm font-semibold">{session.user.name || session.user.email}</div>
          {session.user.name && (
            <div className="text-xs text-muted-foreground mt-0.5">{session.user.email}</div>
          )}
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link to="/$orgSlug/profile" params={{ orgSlug }}>
            <User size={15} strokeWidth={1.5} />
            {t("topBar.profile")}
          </Link>
        </DropdownMenuItem>

        {organizations.length > 1 && (
          <DropdownMenuItem onClick={() => navigate({ to: "/", search: { switchOrg: true, redirect: undefined } })}>
            <ArrowLeftRight size={15} strokeWidth={1.5} />
            {t("topBar.switchLeague")}
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
          <LogOut size={15} strokeWidth={1.5} />
          {t("topBar.logout")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
