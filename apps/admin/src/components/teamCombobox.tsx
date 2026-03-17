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
import { Check, ChevronDown, X } from "lucide-react"
import { useMemo, useState } from "react"

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
  testId?: string
  optionTestIdPrefix?: string
}

export function TeamCombobox({
  teams,
  value,
  onChange,
  placeholder = "Wähle ein Team...",
  label: _label,
  required: _required,
  className,
  testId,
  optionTestIdPrefix,
}: TeamComboboxProps) {
  const [open, setOpen] = useState(false)

  const selectedTeam = teams.find((t) => t.id === value)

  const sortedTeams = useMemo(() => [...teams].sort((a, b) => a.name.localeCompare(b.name, "de")), [teams])

  function handleSelect(teamId: string) {
    onChange(teamId === value ? "" : teamId)
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
          data-testid={testId}
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
            {selectedTeam ? (
              <div className="flex items-center gap-3">
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
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-sm text-foreground truncate">{selectedTeam.name}</div>
                  {selectedTeam.city && <div className="text-xs text-muted-foreground truncate">{selectedTeam.city}</div>}
                </div>
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

          <div className="flex items-center gap-1 shrink-0">
            {selectedTeam && (
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
            const team = teams.find((t) => t.id === value)
            if (!team) return 0
            const q = search.toLowerCase()
            if (team.name.toLowerCase().includes(q)) return 1
            if (team.shortName.toLowerCase().includes(q)) return 1
            if (team.city?.toLowerCase().includes(q)) return 1
            return 0
          }}
        >
          <CommandInput placeholder="Team suchen..." />
          <CommandList>
            <CommandEmpty>Keine Teams gefunden</CommandEmpty>
            <CommandGroup>
              {sortedTeams.map((team) => {
                const isSelected = team.id === value
                const teamColor = team.primaryColor || "hsl(var(--primary))"
                const optionTestIdSuffix = team.shortName.toLowerCase().replace(/[^a-z0-9_-]+/g, "-")

                return (
                  <CommandItem
                    key={team.id}
                    value={team.id}
                    onSelect={handleSelect}
                    data-testid={optionTestIdPrefix ? `${optionTestIdPrefix}-${optionTestIdSuffix}` : undefined}
                    className="flex items-center gap-3 py-2.5 px-3 cursor-pointer"
                  >
                    <div
                      className="h-12 w-1 rounded-full shrink-0"
                      style={{
                        background: `linear-gradient(to bottom, ${teamColor}, ${teamColor}66)`,
                      }}
                    />

                    <div
                      className="h-11 w-11 shrink-0 rounded-lg flex items-center justify-center overflow-hidden"
                      style={{
                        background: team.logoUrl ? "white" : `linear-gradient(135deg, ${teamColor}18, ${teamColor}30)`,
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

                    {isSelected && <Check className="h-5 w-5 shrink-0" style={{ color: teamColor }} />}
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
