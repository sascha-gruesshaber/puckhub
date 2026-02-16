import type { Edge, Node } from "@xyflow/react"

interface Season {
  id: string
  name: string
  seasonStart: Date | string
  seasonEnd: Date | string
}

interface Division {
  id: string
  seasonId: string
  name: string
  sortOrder: number
  goalieMinGames: number
}

interface Round {
  id: string
  divisionId: string
  name: string
  roundType: string
  sortOrder: number
  pointsWin: number
  pointsDraw: number
  pointsLoss: number
  countsForPlayerStats: boolean
  countsForGoalieStats: boolean
}

interface TeamAssignment {
  id: string
  teamId: string
  divisionId: string
  team: {
    id: string
    name: string
    shortName: string
    logoUrl: string | null
  }
}

interface FullStructure {
  season: Season
  divisions: Division[]
  rounds: Round[]
  teamAssignments: TeamAssignment[]
}

export function buildNodesAndEdges(data: FullStructure): {
  nodes: Node[]
  edges: Edge[]
} {
  const nodes: Node[] = []
  const edges: Edge[] = []

  // Season node
  const seasonId = `season-${data.season.id}`
  nodes.push({
    id: seasonId,
    type: "season",
    position: { x: 0, y: 0 },
    data: {
      name: data.season.name,
      seasonStart: data.season.seasonStart,
      seasonEnd: data.season.seasonEnd,
      dbId: data.season.id,
    },
  })

  // Division nodes
  for (const div of data.divisions) {
    const divNodeId = `division-${div.id}`
    const divTeams = data.teamAssignments.filter((ta) => ta.divisionId === div.id)
    const divRounds = data.rounds.filter((r) => r.divisionId === div.id)

    nodes.push({
      id: divNodeId,
      type: "division",
      position: { x: 0, y: 0 },
      data: {
        name: div.name,
        sortOrder: div.sortOrder,
        goalieMinGames: div.goalieMinGames,
        seasonId: div.seasonId,
        dbId: div.id,
        teamCount: divTeams.length,
        roundCount: divRounds.length,
      },
    })

    edges.push({
      id: `e-${seasonId}-${divNodeId}`,
      source: seasonId,
      target: divNodeId,
      type: "smoothstep",
      animated: true,
      style: { stroke: "#334155", strokeWidth: 2, strokeDasharray: "6 3" },
    })

    // Round nodes
    for (const round of divRounds) {
      const roundNodeId = `round-${round.id}`
      nodes.push({
        id: roundNodeId,
        type: "round",
        position: { x: 0, y: 0 },
        data: {
          name: round.name,
          roundType: round.roundType,
          sortOrder: round.sortOrder,
          pointsWin: round.pointsWin,
          pointsDraw: round.pointsDraw,
          pointsLoss: round.pointsLoss,
          countsForPlayerStats: round.countsForPlayerStats,
          countsForGoalieStats: round.countsForGoalieStats,
          divisionId: round.divisionId,
          dbId: round.id,
        },
      })

      edges.push({
        id: `e-${divNodeId}-${roundNodeId}`,
        source: divNodeId,
        target: roundNodeId,
        sourceHandle: "rounds",
        type: "smoothstep",
        animated: true,
        style: { stroke: "#334155", strokeWidth: 2, strokeDasharray: "6 3" },
      })
    }

    // Team nodes
    for (const ta of divTeams) {
      const teamNodeId = `team-${ta.teamId}-div-${ta.divisionId}`
      nodes.push({
        id: teamNodeId,
        type: "team",
        position: { x: 0, y: 0 },
        data: {
          name: ta.team.name,
          shortName: ta.team.shortName,
          logoUrl: ta.team.logoUrl,
          teamId: ta.teamId,
          divisionId: ta.divisionId,
          assignmentId: ta.id,
          dbId: ta.teamId,
        },
      })

      edges.push({
        id: `e-${divNodeId}-${teamNodeId}`,
        source: divNodeId,
        target: teamNodeId,
        sourceHandle: "teams",
        type: "smoothstep",
        animated: true,
        style: { stroke: "#475569", strokeWidth: 1, strokeDasharray: "3 3" },
      })
    }
  }

  return { nodes, edges }
}
