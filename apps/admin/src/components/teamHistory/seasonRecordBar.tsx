interface SeasonRecordBarProps {
  wins: number
  draws: number
  losses: number
}

function SeasonRecordBar({ wins, draws, losses }: SeasonRecordBarProps) {
  const total = wins + draws + losses
  if (total === 0) return null

  const wPct = (wins / total) * 100
  const dPct = (draws / total) * 100
  const lPct = (losses / total) * 100

  const minLabel = 12 // minimum % to show label

  return (
    <div className="flex h-1.5 w-full overflow-hidden rounded-full" title={`${wins}W ${draws}D ${losses}L`}>
      {wins > 0 && (
        <div
          className="relative flex items-center justify-center text-[9px] font-bold text-white"
          style={{ width: `${wPct}%`, background: "hsl(142, 71%, 45%)" }}
        >
          {wPct >= minLabel && <span className="absolute">{wins}</span>}
        </div>
      )}
      {draws > 0 && (
        <div
          className="relative flex items-center justify-center text-[9px] font-bold text-white"
          style={{ width: `${dPct}%`, background: "hsl(44, 87%, 50%)" }}
        >
          {dPct >= minLabel && <span className="absolute">{draws}</span>}
        </div>
      )}
      {losses > 0 && (
        <div
          className="relative flex items-center justify-center text-[9px] font-bold text-white"
          style={{ width: `${lPct}%`, background: "hsl(354, 85%, 42%)" }}
        >
          {lPct >= minLabel && <span className="absolute">{losses}</span>}
        </div>
      )}
    </div>
  )
}

export { SeasonRecordBar }
