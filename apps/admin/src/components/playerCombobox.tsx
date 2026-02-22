import { cn } from "@puckhub/ui"
import { Check, ChevronDown, Search, User, X } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"

interface Player {
  id: string
  firstName: string
  lastName: string
  dateOfBirth?: string | Date | null
  nationality?: string | null
  photoUrl?: string | null
  jerseyNumber?: number | null
}

interface PlayerComboboxProps {
  players: Player[]
  value: string
  onChange: (playerId: string) => void
  placeholder?: string
  label?: string
  required?: boolean
  className?: string
}

function calculateAge(dateOfBirth: string | null | undefined): number | null {
  if (!dateOfBirth) return null
  const birth = new Date(dateOfBirth)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }
  return age
}

export function PlayerCombobox({
  players,
  value,
  onChange,
  placeholder = "Wähle einen Spieler...",
  label: _label,
  required: _required,
  className,
}: PlayerComboboxProps) {
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

  const selectedPlayer = players.find((p) => p.id === value)

  const filteredPlayers = useMemo(() => {
    if (!search.trim()) return players
    const q = search.toLowerCase()
    return players.filter(
      (p) =>
        p.firstName.toLowerCase().includes(q) ||
        p.lastName.toLowerCase().includes(q) ||
        `${p.firstName} ${p.lastName}`.toLowerCase().includes(q) ||
        p.nationality?.toLowerCase().includes(q),
    )
  }, [players, search])

  // Update dropdown position when opened
  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const updatePosition = () => {
        if (!triggerRef.current) return
        const rect = triggerRef.current.getBoundingClientRect()
        const spaceBelow = window.innerHeight - rect.bottom
        const spaceAbove = rect.top
        const dropdownHeight = 450 // Approximate max height

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
        setFocusedIndex((prev) => Math.min(prev + 1, filteredPlayers.length - 1))
        break
      case "ArrowUp":
        e.preventDefault()
        setFocusedIndex((prev) => Math.max(prev - 1, 0))
        break
      case "Enter":
        e.preventDefault()
        if (focusedIndex >= 0 && filteredPlayers[focusedIndex]) {
          onChange(filteredPlayers[focusedIndex]?.id)
          setIsOpen(false)
          setSearch("")
          setFocusedIndex(-1)
        }
        break
    }
  }

  function handleSelect(playerId: string) {
    onChange(playerId)
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

  const selectedAge = selectedPlayer ? calculateAge(selectedPlayer.dateOfBirth) : null

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <style>{`
        @keyframes playerComboboxSlideIn {
          from {
            opacity: 0;
            transform: translateY(-8px) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .player-combobox-dropdown {
          animation: playerComboboxSlideIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          z-index: 999999 !important;
        }

        .player-combobox-item {
          transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .player-avatar {
          position: relative;
          overflow: hidden;
        }

        .player-avatar::before {
          content: '';
          position: absolute;
          inset: -2px;
          background: linear-gradient(135deg, transparent, rgba(255, 255, 255, 0.2), transparent);
          opacity: 0;
          transition: opacity 0.3s;
          border-radius: inherit;
        }

        .player-combobox-item:hover .player-avatar::before,
        .player-combobox-item[data-focused="true"] .player-avatar::before {
          opacity: 1;
        }

        .player-flag {
          display: inline-block;
          width: 20px;
          height: 14px;
          background-size: cover;
          background-position: center;
          border-radius: 2px;
          box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.1);
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
          {selectedPlayer ? (
            <div className="flex items-center gap-3">
              {/* Player Photo/Avatar */}
              <div className="player-avatar h-9 w-9 shrink-0 rounded-full flex items-center justify-center overflow-hidden bg-gradient-to-br from-primary/10 to-primary/20 border-2 border-primary/20">
                {selectedPlayer.photoUrl ? (
                  <img src={selectedPlayer.photoUrl} alt="" className="h-full w-full object-cover" />
                ) : selectedPlayer.jerseyNumber != null ? (
                  <span className="text-xs font-bold font-mono text-primary/60">{selectedPlayer.jerseyNumber}</span>
                ) : (
                  <User className="h-5 w-5 text-primary/60" />
                )}
              </div>

              {/* Player Info */}
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-sm text-foreground truncate">
                  {selectedPlayer.jerseyNumber != null && (
                    <span className="font-mono text-xs text-muted-foreground mr-1">#{selectedPlayer.jerseyNumber}</span>
                  )}
                  {selectedPlayer.firstName} {selectedPlayer.lastName}
                </div>
                {(selectedPlayer.nationality || selectedAge !== null) && (
                  <div className="text-xs text-muted-foreground flex items-center gap-2">
                    {selectedPlayer.nationality && <span>{selectedPlayer.nationality}</span>}
                    {selectedAge !== null && (
                      <span className="flex items-center gap-1">
                        {selectedPlayer.nationality && "·"} {selectedAge} Jahre
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <span className="text-sm text-muted-foreground">{placeholder}</span>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1 shrink-0">
          {selectedPlayer && (
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
            className="player-combobox-dropdown fixed bg-white rounded-xl border-2 border-primary/20 shadow-2xl overflow-hidden"
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
                  placeholder="Spieler suchen..."
                  className="w-full h-10 pl-10 pr-4 rounded-lg border border-border/40 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
                />
              </div>
            </div>

            {/* Player List */}
            <div className="max-h-[360px] overflow-y-auto p-2">
              {filteredPlayers.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <div className="text-muted-foreground/40 text-sm">Keine Spieler gefunden</div>
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredPlayers.map((player, index) => {
                    const isSelected = player.id === value
                    const isFocused = index === focusedIndex
                    const age = calculateAge(player.dateOfBirth)

                    return (
                      <button
                        key={player.id}
                        type="button"
                        onClick={() => handleSelect(player.id)}
                        data-index={index}
                        data-focused={isFocused}
                        className={cn(
                          "player-combobox-item w-full px-3 py-3 rounded-lg",
                          "flex items-center gap-3 text-left",
                          "focus:outline-none",
                          isFocused || isSelected ? "bg-primary/5" : "hover:bg-gray-50",
                        )}
                        role="option"
                        aria-selected={isSelected}
                      >
                        {/* Player Photo/Avatar */}
                        <div className="player-avatar h-11 w-11 shrink-0 rounded-full flex items-center justify-center overflow-hidden bg-gradient-to-br from-primary/10 to-primary/20 border-2 border-primary/20">
                          {player.photoUrl ? (
                            <img src={player.photoUrl} alt="" className="h-full w-full object-cover" />
                          ) : player.jerseyNumber != null ? (
                            <span className="text-sm font-bold font-mono text-primary/70">{player.jerseyNumber}</span>
                          ) : (
                            <div className="flex items-center justify-center">
                              <span className="text-xs font-bold text-primary/70">
                                {player.firstName[0]}
                                {player.lastName[0]}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Player Info */}
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-[15px] text-foreground truncate">
                            {player.jerseyNumber != null && (
                              <span className="font-mono text-xs text-muted-foreground mr-1.5">
                                #{player.jerseyNumber}
                              </span>
                            )}
                            {player.firstName} {player.lastName}
                          </div>
                          {(player.nationality || age !== null) && (
                            <div className="flex items-center gap-2 mt-0.5">
                              {player.nationality && (
                                <span className="text-xs text-muted-foreground">{player.nationality}</span>
                              )}
                              {age !== null && (
                                <span className="text-xs text-muted-foreground">
                                  {player.nationality && "·"} {age} Jahre
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Selected Indicator */}
                        {isSelected && <Check className="h-5 w-5 shrink-0 text-primary" />}
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
