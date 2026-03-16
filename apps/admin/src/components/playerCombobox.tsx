import {
  cn,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@puckhub/ui"
import { Check, ChevronDown, User, X } from "lucide-react"
import { useMemo, useState } from "react"

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

function calculateAge(dateOfBirth: string | Date | null | undefined): number | null {
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
  const [open, setOpen] = useState(false)

  const selectedPlayer = players.find((p) => p.id === value)
  const selectedAge = selectedPlayer ? calculateAge(selectedPlayer.dateOfBirth) : null

  // Pre-sort by last name for consistent ordering
  const sortedPlayers = useMemo(
    () => [...players].sort((a, b) => a.lastName.localeCompare(b.lastName, "de")),
    [players],
  )

  function handleSelect(playerId: string) {
    onChange(playerId === value ? "" : playerId)
    setOpen(false)
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation()
    onChange("")
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "relative w-full h-12 px-4 rounded-lg border-2 transition-all duration-200",
            "bg-white hover:bg-gray-50",
            "text-left flex items-center justify-between gap-3",
            open
              ? "border-accent shadow-lg shadow-accent/10 ring-4 ring-accent/5"
              : "border-border/40 hover:border-border shadow-sm",
            "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/20 focus-visible:border-accent",
            className,
          )}
        >
          <div className="flex-1 min-w-0">
            {selectedPlayer ? (
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 shrink-0 rounded-full flex items-center justify-center overflow-hidden bg-gradient-to-br from-primary/10 to-primary/20 border-2 border-primary/20">
                  {selectedPlayer.photoUrl ? (
                    <img src={selectedPlayer.photoUrl} alt="" className="h-full w-full object-cover" />
                  ) : selectedPlayer.jerseyNumber != null ? (
                    <span className="text-xs font-bold font-mono text-primary/60">{selectedPlayer.jerseyNumber}</span>
                  ) : (
                    <User className="h-5 w-5 text-primary/60" />
                  )}
                </div>
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

          <div className="flex items-center gap-1 shrink-0">
            {selectedPlayer && (
              <span
                role="button"
                tabIndex={-1}
                onClick={handleClear}
                onKeyDown={(e) => e.key === "Enter" && handleClear(e as unknown as React.MouseEvent)}
                className="h-6 w-6 rounded-md flex items-center justify-center hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                aria-label="Clear selection"
              >
                <X className="h-3.5 w-3.5" />
              </span>
            )}
            <ChevronDown
              className={cn("h-4 w-4 text-muted-foreground transition-transform duration-200", open && "rotate-180")}
            />
          </div>
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start" portal={false}>
        <Command
          filter={(value, search) => {
            const player = players.find((p) => p.id === value)
            if (!player) return 0
            const q = search.toLowerCase()
            const full = `${player.firstName} ${player.lastName}`.toLowerCase()
            if (full.includes(q)) return 1
            if (player.nationality?.toLowerCase().includes(q)) return 1
            return 0
          }}
        >
          <CommandInput placeholder="Spieler suchen..." />
          <CommandList>
            <CommandEmpty>Keine Spieler gefunden</CommandEmpty>
            <CommandGroup>
              {sortedPlayers.map((player) => {
                const isSelected = player.id === value
                const age = calculateAge(player.dateOfBirth)

                return (
                  <CommandItem
                    key={player.id}
                    value={player.id}
                    onSelect={handleSelect}
                    className="flex items-center gap-3 py-3 px-3 cursor-pointer"
                  >
                    <div className="h-11 w-11 shrink-0 rounded-full flex items-center justify-center overflow-hidden bg-gradient-to-br from-primary/10 to-primary/20 border-2 border-primary/20">
                      {player.photoUrl ? (
                        <img src={player.photoUrl} alt="" className="h-full w-full object-cover" />
                      ) : player.jerseyNumber != null ? (
                        <span className="text-sm font-bold font-mono text-primary/70">{player.jerseyNumber}</span>
                      ) : (
                        <span className="text-xs font-bold text-primary/70">
                          {player.firstName[0]}
                          {player.lastName[0]}
                        </span>
                      )}
                    </div>

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

                    {isSelected && <Check className="h-5 w-5 shrink-0 text-primary" />}
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
