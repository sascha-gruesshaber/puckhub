import type { Edge, Node } from "@xyflow/react"

const NODE_DIMS: Record<string, { width: number; height: number }> = {
  season: { width: 280, height: 80 },
  division: { width: 260, height: 110 },
  round: { width: 220, height: 88 },
  team: { width: 160, height: 52 },
}

const RANK_SEP = 80
const COL_GAP = 50 // horizontal gap between columns (rounds ↔ division ↔ teams)
const ITEM_GAP = 12 // vertical gap between items in a column

function dims(type: string | undefined) {
  return NODE_DIMS[type ?? "season"] ?? { width: 200, height: 80 }
}

/**
 * Simple three-column layout per division.
 *
 *   Row 0: Season node (centered)
 *   Row 1 per division:
 *     LEFT column:  Rounds (single column, stacked vertically)
 *     CENTER:       Division node
 *     RIGHT column: Teams (single column, stacked vertically)
 *
 * All three columns start at the same Y.
 * Divisions are spread horizontally.
 */
export function getLayoutedElements(nodes: Node[], edges: Edge[]): { nodes: Node[]; edges: Edge[] } {
  if (nodes.length === 0) return { nodes, edges }

  // Build adjacency from edges (source → targets[])
  const children = new Map<string, string[]>()
  for (const edge of edges) {
    const list = children.get(edge.source) ?? []
    list.push(edge.target)
    children.set(edge.source, list)
  }

  // Categorise nodes
  const nodeMap = new Map<string, Node>()
  const seasonNodes: Node[] = []
  const divisionNodes: Node[] = []

  for (const node of nodes) {
    nodeMap.set(node.id, node)
    switch (node.type) {
      case "season":
        seasonNodes.push(node)
        break
      case "division":
        divisionNodes.push(node)
        break
    }
  }

  const positions = new Map<string, { x: number; y: number }>()

  // Row 0: season
  let y = 0
  const seasonNode = seasonNodes[0]
  if (seasonNode) {
    const d = dims(seasonNode.type)
    positions.set(seasonNode.id, { x: 0, y })
    y += d.height + RANK_SEP
  }

  const divD = dims("division")
  const roundD = dims("round")
  const teamD = dims("team")

  // Compute block widths for each division
  interface DivBlock {
    divNode: Node
    rounds: Node[]
    teams: Node[]
    blockWidth: number // total width of rounds-col + div + teams-col
    blockHeight: number
  }

  const divBlocks: DivBlock[] = divisionNodes.map((divNode) => {
    const divChildren = children.get(divNode.id) ?? []
    const rounds = divChildren.map((id) => nodeMap.get(id)).filter((n): n is Node => n?.type === "round")
    const teams = divChildren.map((id) => nodeMap.get(id)).filter((n): n is Node => n?.type === "team")

    const roundsColWidth = rounds.length > 0 ? roundD.width + COL_GAP : 0
    const teamsColWidth = teams.length > 0 ? COL_GAP + teamD.width : 0
    const blockWidth = roundsColWidth + divD.width + teamsColWidth

    const roundsHeight = rounds.length > 0 ? rounds.length * roundD.height + (rounds.length - 1) * ITEM_GAP : 0
    const teamsHeight = teams.length > 0 ? teams.length * teamD.height + (teams.length - 1) * ITEM_GAP : 0
    const blockHeight = Math.max(divD.height, roundsHeight, teamsHeight)

    return { divNode, rounds, teams, blockWidth, blockHeight }
  })

  // Distribute division blocks horizontally, centered around x=0
  const divisionY = y
  const blockSpacing = 80
  const totalWidth =
    divBlocks.reduce((sum, b) => sum + b.blockWidth, 0) +
    (divBlocks.length > 1 ? (divBlocks.length - 1) * blockSpacing : 0)

  let blockX = -totalWidth / 2

  for (const block of divBlocks) {
    const roundsColWidth = block.rounds.length > 0 ? roundD.width + COL_GAP : 0
    const _teamsColWidth = block.teams.length > 0 ? COL_GAP + teamD.width : 0

    // Division sits in the center of this block
    const divX = blockX + roundsColWidth
    positions.set(block.divNode.id, {
      x: divX,
      y: divisionY,
    })

    // Rounds: single column to the LEFT, top-aligned with division
    if (block.rounds.length > 0) {
      const roundX = blockX

      for (let i = 0; i < block.rounds.length; i++) {
        const roundId = block.rounds[i]?.id
        if (!roundId) continue
        positions.set(roundId, {
          x: roundX,
          y: divisionY + i * (roundD.height + ITEM_GAP),
        })
      }
    }

    // Teams: single column to the RIGHT, top-aligned with division
    if (block.teams.length > 0) {
      const teamX = divX + divD.width + COL_GAP

      for (let i = 0; i < block.teams.length; i++) {
        const teamId = block.teams[i]?.id
        if (!teamId) continue
        positions.set(teamId, {
          x: teamX,
          y: divisionY + i * (teamD.height + ITEM_GAP),
        })
      }
    }

    blockX += block.blockWidth + blockSpacing
  }

  // Re-center season node above the divisions
  if (seasonNode) {
    const seasonD = dims("season")
    const divCenters = divBlocks.map((b) => {
      const pos = positions.get(b.divNode.id)
      if (!pos) return 0
      return pos.x + divD.width / 2
    })
    if (divCenters.length > 0) {
      const center = (Math.min(...divCenters) + Math.max(...divCenters)) / 2
      positions.set(seasonNode.id, {
        x: center - seasonD.width / 2,
        y: 0,
      })
    }
  }

  // Apply positions
  const layoutedNodes = nodes.map((node) => {
    const pos = positions.get(node.id) ?? { x: 0, y: 0 }
    return { ...node, position: pos }
  })

  return { nodes: layoutedNodes, edges }
}
