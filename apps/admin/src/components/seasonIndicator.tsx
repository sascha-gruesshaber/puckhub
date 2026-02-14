import { Link, useNavigate, useRouterState } from "@tanstack/react-router"
import { Calendar, Check, ChevronDown, Plus } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { trpc } from "@/trpc"
import { useWorkingSeason } from "~/contexts/seasonContext"
import { useTranslation } from "~/i18n/use-translation"

const SEASON_ROUTE_RE = /^\/seasons\/[^/]+\/(structure|roster)$/

function shortSeasonLabel(start: Date | string) {
  return String(new Date(start).getUTCFullYear()).slice(-2)
}

export function SeasonIndicator() {
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

  if (isLoading) return null

  // No season exists — show empty state with create button
  if (!season) {
    return (
      <div style={{ padding: "12px 12px 0" }}>
        <button
          type="button"
          onClick={() => navigate({ to: "/seasons", search: { create: true } })}
          className="flex items-center gap-3 w-full rounded-lg"
          style={{
            padding: "10px 12px",
            background: "rgba(255,255,255,0.03)",
            border: "1px dashed var(--sidebar-text-muted)",
            cursor: "pointer",
            transition: "background 150ms ease, border-color 150ms ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(244,211,94,0.06)"
            e.currentTarget.style.borderColor = "rgba(244,211,94,0.25)"
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.03)"
            e.currentTarget.style.borderColor = "var(--sidebar-text-muted)"
          }}
        >
          <div
            className="flex items-center justify-center shrink-0 rounded-md"
            style={{
              width: 34,
              height: 34,
              background: "rgba(255,255,255,0.04)",
              color: "var(--sidebar-text-muted)",
            }}
          >
            <Plus size={18} strokeWidth={1.5} />
          </div>
          <div className="flex-1 min-w-0 text-left">
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--sidebar-text)", lineHeight: 1.3 }}>
              {t("seasonIndicator.createFirst")}
            </div>
            <div style={{ fontSize: 10, color: "var(--sidebar-text-muted)", fontWeight: 500, lineHeight: 1.3 }}>
              {t("seasonIndicator.noSeason")}
            </div>
          </div>
        </button>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="relative" style={{ padding: "12px 12px 0" }}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="season-selector flex items-center gap-3 w-full rounded-lg"
        style={{
          padding: "10px 12px",
          cursor: "pointer",
        }}
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
        <div className="flex-1 min-w-0 text-left">
          <div className="truncate" style={{ fontSize: 14, fontWeight: 700, color: "#E2E8F0", lineHeight: 1.3 }}>
            {season.name}
          </div>
          <div style={{ fontSize: 10, color: "var(--sidebar-text-muted)", fontWeight: 500, lineHeight: 1.3 }}>
            {t("seasonIndicator.workingSeason")}
          </div>
        </div>
        {/* Seasons management link */}
        <Link
          to="/seasons"
          onClick={(e: React.MouseEvent) => e.stopPropagation()}
          className="flex items-center justify-center shrink-0 group/seasons-link relative"
          style={{
            width: 32,
            height: 32,
            borderRadius: 7,
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.06)",
            color: "var(--sidebar-text)",
            textDecoration: "none",
            transition: "all 150ms ease",
          }}
          onMouseEnter={(e: React.MouseEvent<HTMLAnchorElement>) => {
            e.currentTarget.style.background = "rgba(244,211,94,0.12)"
            e.currentTarget.style.borderColor = "rgba(244,211,94,0.2)"
            e.currentTarget.style.color = "#F4D35E"
          }}
          onMouseLeave={(e: React.MouseEvent<HTMLAnchorElement>) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.05)"
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"
            e.currentTarget.style.color = "var(--sidebar-text)"
          }}
        >
          <Calendar size={15} strokeWidth={1.5} />
          {/* Tooltip */}
          <span
            className="pointer-events-none absolute opacity-0 group-hover/seasons-link:opacity-100 transition-opacity"
            style={{
              top: "100%",
              left: "50%",
              transform: "translateX(-50%)",
              marginTop: 6,
              whiteSpace: "nowrap",
              fontSize: 11,
              fontWeight: 500,
              color: "#E2E8F0",
              background: "#1A2740",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 6,
              padding: "4px 8px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
            }}
          >
            {t("seasonIndicator.manageSeasons")}
          </span>
        </Link>
        <ChevronDown
          size={14}
          style={{
            color: "var(--sidebar-text-muted)",
            transition: "transform 150ms ease",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
          }}
        />
      </button>

      {/* Dropdown */}
      {open && seasons && (
        <div
          className="absolute left-3 right-3 z-50 flex flex-col overflow-hidden"
          style={{
            top: "calc(100% + 4px)",
            background: "#0F1A2E",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 10,
            boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
            maxHeight: 240,
            overflowY: "auto",
          }}
        >
          <div
            style={{
              padding: "8px 10px 4px",
              fontSize: 9,
              fontWeight: 650,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "var(--sidebar-text-muted)",
            }}
          >
            {t("seasonIndicator.switchSeason")}
          </div>
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
                  // Re-navigate if currently on a season-scoped page
                  const match = pathname.match(SEASON_ROUTE_RE)
                  if (match) {
                    navigate({
                      to: `/seasons/$seasonId/${match[1]}` as "/seasons/$seasonId/structure",
                      params: { seasonId: s.id },
                    })
                  }
                }}
                className="flex items-center gap-2.5 transition-colors"
                style={{
                  padding: "7px 10px",
                  margin: "0 4px 2px",
                  borderRadius: 7,
                  background: isSelected ? "rgba(244,211,94,0.08)" : "transparent",
                  border: "none",
                  cursor: "pointer",
                  textAlign: "left",
                  width: "calc(100% - 8px)",
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) e.currentTarget.style.background = "rgba(255,255,255,0.04)"
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) e.currentTarget.style.background = "transparent"
                }}
              >
                <div
                  className="flex items-center justify-center shrink-0 rounded-md"
                  style={{
                    width: 24,
                    height: 24,
                    background: isSelected ? "linear-gradient(135deg, #F4D35E, #D4A843)" : "rgba(255,255,255,0.04)",
                    color: isSelected ? "#0C1929" : "#475569",
                    fontSize: 9,
                    fontWeight: 800,
                  }}
                >
                  {shortSeasonLabel(s.seasonStart)}
                </div>
                <span
                  className="flex-1 truncate"
                  style={{
                    fontSize: 12,
                    fontWeight: isSelected ? 600 : 500,
                    color: isSelected ? "#F4D35E" : "#94A3B8",
                  }}
                >
                  {s.name}
                </span>
                {currentSeason?.id === s.id && (
                  <span
                    style={{
                      fontSize: 8.5,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      color: "#10B981",
                      background: "rgba(16,185,129,0.1)",
                      padding: "2px 6px",
                      borderRadius: 4,
                    }}
                  >
                    {t("seasonPicker.active")}
                  </span>
                )}
                {isSelected && <Check size={14} style={{ color: "#F4D35E", flexShrink: 0 }} />}
              </button>
            )
          })}
          <div style={{ height: 4 }} />
        </div>
      )}
    </div>
  )
}
