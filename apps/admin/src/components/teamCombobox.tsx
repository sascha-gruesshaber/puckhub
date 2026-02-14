import { cn } from "@puckhub/ui"
import { Check, ChevronDown, Search, X } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"

interface Team {
  id: string
  name: string
  shortName: string
  city?: string | null
  logoUrl?: string | null
  primaryColor?: string | null
}

interface TeamComboboxProps {
  teams: Team[]
  value: string
  onChange: (teamId: string) => void
  placeholder?: string
  label?: string
  required?: boolean
  className?: string
}

export function TeamCombobox({
  teams,
  value,
  onChange,
  placeholder = "Wähle ein Team...",
  label: _label,
  required: _required,
  className,
}: TeamComboboxProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 })
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Find the dialog element to portal into
  useEffect(() => {
    if (isOpen && containerRef.current) {
      // Find the closest dialog ancestor
      const dialog = containerRef.current.closest("dialog")
      setPortalContainer(dialog || document.body)
    }
  }, [isOpen])

  const selectedTeam = teams.find((t) => t.id === value)

  const filteredTeams = useMemo(() => {
    if (!search.trim()) return teams
    const q = search.toLowerCase()
    return teams.filter(
      (t) =>
        t.name.toLowerCase().includes(q) || t.shortName.toLowerCase().includes(q) || t.city?.toLowerCase().includes(q),
    )
  }, [teams, search])

  // Update dropdown position when opened
  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const updatePosition = () => {
        if (!triggerRef.current) return
        const rect = triggerRef.current.getBoundingClientRect()
        const spaceBelow = window.innerHeight - rect.bottom
        const spaceAbove = rect.top
        const dropdownHeight = 400 // Approximate max height

        // Position below if there's space, otherwise above
        const shouldPositionAbove = spaceBelow < dropdownHeight && spaceAbove > spaceBelow

        setDropdownPosition({
          top: shouldPositionAbove ? rect.top - dropdownHeight - 8 : rect.bottom + 8,
          left: rect.left,
          width: rect.width,
        })
      }

      updatePosition()
      window.addEventListener("scroll", updatePosition, true)
      window.addEventListener("resize", updatePosition)

      if (searchInputRef.current) {
        searchInputRef.current.focus()
      }

      return () => {
        window.removeEventListener("scroll", updatePosition, true)
        window.removeEventListener("resize", updatePosition)
      }
    }
  }, [isOpen])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
      return () => document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isOpen])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!isOpen) {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
        e.preventDefault()
        setIsOpen(true)
        setFocusedIndex(0)
      }
      return
    }

    switch (e.key) {
      case "Escape":
        e.preventDefault()
        setIsOpen(false)
        setSearch("")
        setFocusedIndex(-1)
        break
      case "ArrowDown":
        e.preventDefault()
        setFocusedIndex((prev) => Math.min(prev + 1, filteredTeams.length - 1))
        break
      case "ArrowUp":
        e.preventDefault()
        setFocusedIndex((prev) => Math.max(prev - 1, 0))
        break
      case "Enter":
        e.preventDefault()
        if (focusedIndex >= 0 && filteredTeams[focusedIndex]) {
          onChange(filteredTeams[focusedIndex]?.id)
          setIsOpen(false)
          setSearch("")
          setFocusedIndex(-1)
        }
        break
    }
  }

  function handleSelect(teamId: string) {
    onChange(teamId)
    setIsOpen(false)
    setSearch("")
    setFocusedIndex(-1)
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation()
    onChange("")
    setSearch("")
  }

  // Scroll focused item into view
  useEffect(() => {
    if (focusedIndex >= 0 && dropdownRef.current) {
      const item = dropdownRef.current.querySelector(`[data-index="${focusedIndex}"]`)
      item?.scrollIntoView({ block: "nearest", behavior: "smooth" })
    }
  }, [focusedIndex])

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <style>{`
        @keyframes teamComboboxSlideIn {
          from {
            opacity: 0;
            transform: translateY(-8px) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes teamComboboxPulse {
          0%, 100% {
            box-shadow: 0 0 0 0 hsla(var(--primary), 0.4);
          }
          50% {
            box-shadow: 0 0 0 4px hsla(var(--primary), 0);
          }
        }

        .team-combobox-dropdown {
          animation: teamComboboxSlideIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          z-index: 999999 !important;
        }

        .team-combobox-item {
          transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .team-logo-container {
          position: relative;
          overflow: hidden;
        }

        .team-logo-container::before {
          content: '';
          position: absolute;
          inset: -50%;
          background: conic-gradient(
            from 0deg,
            transparent,
            hsla(var(--primary), 0.1),
            transparent
          );
          animation: rotate 3s linear infinite;
          opacity: 0;
          transition: opacity 0.3s;
        }

        .team-combobox-item:hover .team-logo-container::before,
        .team-combobox-item[data-focused="true"] .team-logo-container::before {
          opacity: 1;
        }

        @keyframes rotate {
          to {
            transform: rotate(360deg);
          }
        }

        .team-color-accent {
          position: relative;
          overflow: hidden;
        }

        .team-color-accent::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, transparent, rgba(255, 255, 255, 0.1));
          opacity: 0;
          transition: opacity 0.3s;
        }

        .team-combobox-item:hover .team-color-accent::before,
        .team-combobox-item[data-focused="true"] .team-color-accent::before {
          opacity: 1;
        }
      `}</style>

      {/* Trigger */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        className={cn(
          "relative w-full h-12 px-4 rounded-lg border-2 transition-all duration-200",
          "bg-white hover:bg-gray-50",
          "text-left flex items-center justify-between gap-3",
          isOpen
            ? "border-primary shadow-lg shadow-primary/10 ring-4 ring-primary/5"
            : "border-border/40 hover:border-border shadow-sm",
          "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:border-primary",
        )}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className="flex-1 min-w-0">
          {selectedTeam ? (
            <div className="flex items-center gap-3">
              {/* Team Logo */}
              <div
                className="h-8 w-8 shrink-0 rounded-md flex items-center justify-center overflow-hidden"
                style={{
                  background: selectedTeam.logoUrl
                    ? "transparent"
                    : `linear-gradient(135deg, ${selectedTeam.primaryColor || "hsl(var(--primary))"}22, ${selectedTeam.primaryColor || "hsl(var(--primary))"}44)`,
                }}
              >
                {selectedTeam.logoUrl ? (
                  <img src={selectedTeam.logoUrl} alt="" className="h-full w-full object-contain" />
                ) : (
                  <span
                    className="text-xs font-bold"
                    style={{ color: selectedTeam.primaryColor || "hsl(var(--primary))" }}
                  >
                    {selectedTeam.shortName.substring(0, 2).toUpperCase()}
                  </span>
                )}
              </div>

              {/* Team Info */}
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-sm text-foreground truncate">{selectedTeam.name}</div>
                {selectedTeam.city && <div className="text-xs text-muted-foreground truncate">{selectedTeam.city}</div>}
              </div>

              {/* Team Color Indicator */}
              {selectedTeam.primaryColor && (
                <div
                  className="h-8 w-1 rounded-full shrink-0"
                  style={{
                    background: `linear-gradient(to bottom, ${selectedTeam.primaryColor}, ${selectedTeam.primaryColor}88)`,
                  }}
                />
              )}
            </div>
          ) : (
            <span className="text-sm text-muted-foreground">{placeholder}</span>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1 shrink-0">
          {selectedTeam && (
            <button
              type="button"
              onClick={handleClear}
              className="h-6 w-6 rounded-md flex items-center justify-center hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
              aria-label="Clear selection"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <ChevronDown
            className={cn("h-4 w-4 text-muted-foreground transition-transform duration-200", isOpen && "rotate-180")}
          />
        </div>
      </button>

      {/* Dropdown - Rendered via Portal */}
      {isOpen &&
        portalContainer &&
        createPortal(
          <div
            ref={dropdownRef}
            className="team-combobox-dropdown fixed bg-white rounded-xl border-2 border-primary/20 shadow-2xl overflow-hidden"
            role="listbox"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            style={{
              top: `${dropdownPosition.top}px`,
              left: `${dropdownPosition.left}px`,
              width: `${dropdownPosition.width}px`,
              zIndex: 99999,
              boxShadow: "0 20px 60px -15px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(0, 0, 0, 0.05)",
            }}
          >
            {/* Search Bar */}
            <div className="sticky top-0 z-10 bg-gradient-to-b from-white via-white to-white/95 backdrop-blur-sm border-b border-border/40 p-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value)
                    setFocusedIndex(0)
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="Team suchen..."
                  className="w-full h-10 pl-10 pr-4 rounded-lg border border-border/40 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
                />
              </div>
            </div>

            {/* Team List */}
            <div className="max-h-[320px] overflow-y-auto p-2">
              {filteredTeams.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <div className="text-muted-foreground/40 text-sm">Keine Teams gefunden</div>
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredTeams.map((team, index) => {
                    const isSelected = team.id === value
                    const isFocused = index === focusedIndex
                    const teamColor = team.primaryColor || "hsl(var(--primary))"

                    return (
                      <button
                        key={team.id}
                        type="button"
                        onClick={() => handleSelect(team.id)}
                        data-index={index}
                        data-focused={isFocused}
                        className={cn(
                          "team-combobox-item w-full px-3 py-2.5 rounded-lg",
                          "flex items-center gap-3 text-left",
                          "focus:outline-none",
                          isFocused || isSelected ? "bg-primary/5" : "hover:bg-gray-50",
                        )}
                        role="option"
                        aria-selected={isSelected}
                      >
                        {/* Color Accent Bar */}
                        <div
                          className="team-color-accent h-12 w-1 rounded-full shrink-0"
                          style={{
                            background: `linear-gradient(to bottom, ${teamColor}, ${teamColor}66)`,
                          }}
                        />

                        {/* Team Logo */}
                        <div
                          className="team-logo-container h-11 w-11 shrink-0 rounded-lg flex items-center justify-center overflow-hidden"
                          style={{
                            background: team.logoUrl
                              ? "white"
                              : `linear-gradient(135deg, ${teamColor}18, ${teamColor}30)`,
                            border: `1.5px solid ${teamColor}20`,
                          }}
                        >
                          {team.logoUrl ? (
                            <img src={team.logoUrl} alt="" className="h-full w-full object-contain p-1" />
                          ) : (
                            <span className="text-sm font-bold" style={{ color: teamColor }}>
                              {team.shortName.substring(0, 2).toUpperCase()}
                            </span>
                          )}
                        </div>

                        {/* Team Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <div className="font-semibold text-[15px] text-foreground truncate">{team.name}</div>
                            <div
                              className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                              style={{
                                background: `${teamColor}15`,
                                color: teamColor,
                              }}
                            >
                              {team.shortName}
                            </div>
                          </div>
                          {team.city && (
                            <div className="text-xs text-muted-foreground mt-0.5 truncate">{team.city}</div>
                          )}
                        </div>

                        {/* Selected Indicator */}
                        {isSelected && <Check className="h-5 w-5 shrink-0" style={{ color: teamColor }} />}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>,
          portalContainer,
        )}
    </div>
  )
}
