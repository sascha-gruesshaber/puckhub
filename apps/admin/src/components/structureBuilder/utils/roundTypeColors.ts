export type RoundType =
  | "regular"
  | "preround"
  | "playoffs"
  | "playdowns"
  | "playups"
  | "relegation"
  | "placement"
  | "final"

interface RoundTypeConfig {
  labelKey: string
  color: string
  bg: string
}

export const roundTypeMap: Record<RoundType, RoundTypeConfig> = {
  regular: { labelKey: "seasonStructure.roundTypes.regular", color: "#60A5FA", bg: "rgba(96,165,250,0.15)" },
  preround: { labelKey: "seasonStructure.roundTypes.preround", color: "#9CA3AF", bg: "rgba(156,163,175,0.15)" },
  playoffs: { labelKey: "seasonStructure.roundTypes.playoffs", color: "#F87171", bg: "rgba(248,113,113,0.15)" },
  playdowns: { labelKey: "seasonStructure.roundTypes.playdowns", color: "#FBBF24", bg: "rgba(251,191,36,0.15)" },
  playups: { labelKey: "seasonStructure.roundTypes.playups", color: "#34D399", bg: "rgba(52,211,153,0.15)" },
  relegation: { labelKey: "seasonStructure.roundTypes.relegation", color: "#A78BFA", bg: "rgba(167,139,250,0.15)" },
  placement: { labelKey: "seasonStructure.roundTypes.placement", color: "#2DD4BF", bg: "rgba(45,212,191,0.15)" },
  final: { labelKey: "seasonStructure.roundTypes.final", color: "#F4D35E", bg: "rgba(244,211,94,0.15)" },
}

export function getRoundTypeConfig(type: string): RoundTypeConfig {
  return roundTypeMap[type as RoundType] ?? roundTypeMap.regular
}
