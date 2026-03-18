import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@puckhub/ui"
import { divisionIcon, roundTypeIcons } from "~/components/structureBuilder/utils/roundTypeIcons"

interface Division {
  id: string
  name: string
}

interface Round {
  id: string
  name: string
  divisionId: string
  roundType: string
  sortOrder: number
}

interface RoundGroupSelectProps {
  divisions: Division[]
  rounds: Round[]
  value: string
  onValueChange: (roundId: string) => void
  placeholder?: string
  testId?: string
}

function RoundGroupSelect({ divisions, rounds, value, onValueChange, placeholder, testId }: RoundGroupSelectProps) {
  const showGroups = divisions.length > 1

  return (
    <Select value={value || undefined} onValueChange={onValueChange}>
      <SelectTrigger className="h-10 w-full" data-testid={testId}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {showGroups
          ? divisions.map((div) => {
              const divRounds = rounds.filter((r) => r.divisionId === div.id).sort((a, b) => a.sortOrder - b.sortOrder)
              if (divRounds.length === 0) return null
              return (
                <SelectGroup key={div.id}>
                  <SelectLabel className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="shrink-0 text-muted-foreground/70">{divisionIcon}</span>
                    {div.name}
                  </SelectLabel>
                  {divRounds.map((r) => (
                    <SelectItem key={r.id} value={r.id} data-testid={testId ? `${testId}-option-${r.id}` : undefined}>
                      <span className="flex items-center gap-1.5">
                        <span className="shrink-0 text-muted-foreground">
                          {roundTypeIcons[r.roundType as keyof typeof roundTypeIcons]}
                        </span>
                        {r.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectGroup>
              )
            })
          : rounds
              .slice()
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map((r) => (
                <SelectItem key={r.id} value={r.id} data-testid={testId ? `${testId}-option-${r.id}` : undefined}>
                  <span className="flex items-center gap-1.5">
                    <span className="shrink-0 text-muted-foreground">
                      {roundTypeIcons[r.roundType as keyof typeof roundTypeIcons]}
                    </span>
                    {r.name}
                  </span>
                </SelectItem>
              ))}
      </SelectContent>
    </Select>
  )
}

export { RoundGroupSelect }
