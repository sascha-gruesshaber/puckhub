import {
  Background,
  BackgroundVariant,
  Controls,
  type Edge,
  type Node,
  type NodeMouseHandler,
  type NodeTypes,
  ReactFlow,
  useEdgesState,
  useNodesState,
} from "@xyflow/react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import "@xyflow/react/dist/style.css"
import "./structureFlow.css"

import { toast } from "@puckhub/ui"
import { trpc } from "@/trpc"
import { useTranslation } from "~/i18n/use-translation"
import { DivisionNode } from "./nodes/divisionNode"
import { RoundNode } from "./nodes/roundNode"
import { SeasonNode } from "./nodes/seasonNode"
import { TeamNode } from "./nodes/teamNode"
import { SidePanel } from "./panels/sidePanel"
import { SetupWizardDialog } from "./setupWizardDialog"
import { getLayoutedElements } from "./utils/layout"
import { buildNodesAndEdges } from "./utils/nodeFactory"
import type { RoundType } from "./utils/roundTypeColors"

const nodeTypes: NodeTypes = {
  season: SeasonNode,
  division: DivisionNode,
  round: RoundNode,
  team: TeamNode,
}

interface StructureCanvasProps {
  seasonId: string
}

export function StructureCanvas({ seasonId }: StructureCanvasProps) {
  const { t } = useTranslation("common")
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)
  const [wizardDismissed, setWizardDismissed] = useState(false)
  const [activeDragType, setActiveDragType] = useState<"division" | "round" | "team" | null>(null)

  const utils = trpc.useUtils()

  const { data: structure, isLoading } = trpc.season.getFullStructure.useQuery({ id: seasonId })

  const { data: allTeams } = trpc.team.list.useQuery()

  const assignMutation = trpc.teamDivision.assign.useMutation({
    onSuccess: () => {
      invalidate()
      toast.success(t("seasonStructure.toast.teamAssigned"))
    },
    onError: (err) => toast.error(t("seasonStructure.toast.error"), { description: err.message }),
  })

  const createDivisionMutation = trpc.division.create.useMutation({
    onSuccess: () => {
      invalidate()
      toast.success(t("seasonStructure.toast.divisionCreated"))
    },
    onError: (err) => toast.error(t("seasonStructure.toast.error"), { description: err.message }),
  })

  const createRoundMutation = trpc.round.create.useMutation({
    onSuccess: () => {
      invalidate()
      toast.success(t("seasonStructure.toast.roundCreated"))
    },
    onError: (err) => toast.error(t("seasonStructure.toast.error"), { description: err.message }),
  })

  function invalidate() {
    utils.season.getFullStructure.invalidate({ id: seasonId })
    setSelectedNode(null)
  }

  // Use refs for drop handlers so they don't trigger useEffect re-runs
  const assignRef = useRef(assignMutation)
  assignRef.current = assignMutation
  const createRoundRef = useRef(createRoundMutation)
  createRoundRef.current = createRoundMutation

  const onDropTeam = useCallback((divisionId: string, teamId: string) => {
    assignRef.current.mutate({ divisionId, teamId })
  }, [])

  const onDropRound = useCallback(
    (divisionId: string, roundType: string = "regular") => {
      const labelKey = `seasonStructure.roundTypes.${roundType}`
      const name = t(labelKey)
      createRoundRef.current.mutate({
        divisionId,
        name,
        roundType: roundType as RoundType,
        sortOrder: 0,
      })
    },
    [t],
  )

  // Canvas-level drop handler for creating divisions by dragging from sidebar
  const onCanvasDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const structureType = e.dataTransfer.getData("text/structureType")
      if (structureType === "division") {
        createDivisionMutation.mutate({
          seasonId,
          name: t("seasonStructure.defaults.newDivision"),
          sortOrder: 0,
        })
      }
    },
    [createDivisionMutation, seasonId, t],
  )

  const onCanvasDragOver = useCallback((e: React.DragEvent) => {
    // Only allow division drops on the canvas (not rounds or teams)
    const isDivision = e.dataTransfer.types.includes("text/structuretype")
    if (isDivision) {
      e.preventDefault()
      e.dataTransfer.dropEffect = "copy"
    }
  }, [])

  // Store callbacks in refs to avoid triggering re-renders
  const onDropTeamRef = useRef(onDropTeam)
  onDropTeamRef.current = onDropTeam
  const onDropRoundRef = useRef(onDropRound)
  onDropRoundRef.current = onDropRound

  // Build layout whenever structure changes (callbacks are stable via ref)
  useEffect(() => {
    if (!structure) return

    const { nodes: rawNodes, edges: rawEdges } = buildNodesAndEdges(structure)

    // Inject drop handlers into division nodes
    const enrichedNodes = rawNodes.map((n) => {
      if (n.type === "division") {
        return { ...n, data: { ...n.data, onDropTeam: onDropTeamRef.current, onDropRound: onDropRoundRef.current } }
      }
      return n
    })

    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(enrichedNodes, rawEdges)

    setNodes(layoutedNodes)
    setEdges(layoutedEdges)
  }, [structure])

  // Track selection via click instead of onSelectionChange (avoids render loops)
  const onNodeClick: NodeMouseHandler = useCallback((_event, node) => {
    setSelectedNode(node)
  }, [])

  const onPaneClick = useCallback(() => {
    setSelectedNode(null)
  }, [])

  // Count how many divisions each team is assigned to
  const teamDivisionCounts = useMemo(() => {
    if (!structure) return new Map<string, number>()
    const counts = new Map<string, number>()
    for (const ta of structure.teamAssignments) {
      counts.set(ta.teamId, (counts.get(ta.teamId) ?? 0) + 1)
    }
    return counts
  }, [structure])

  // Team palette data
  const paletteTeams = useMemo(() => {
    if (!allTeams) return []
    return allTeams.map((t) => ({
      id: t.id,
      name: t.name,
      shortName: t.shortName,
      logoUrl: t.logoUrl,
    }))
  }, [allTeams])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-muted/30">
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, #F4D35E, #D4A843)",
              color: "#0C1929",
              fontWeight: 800,
              fontSize: 16,
            }}
          >
            P
          </div>
          <span className="text-xs text-muted-foreground">{t("seasonStructure.loading")}</span>
        </div>
      </div>
    )
  }

  if (!structure) {
    return (
      <div className="flex items-center justify-center h-full bg-muted/30">
        <span className="text-sm text-muted-foreground">{t("seasonStructure.notFound")}</span>
      </div>
    )
  }

  // Show setup wizard for empty structures
  if (structure.divisions.length === 0 && !wizardDismissed) {
    return (
      <SetupWizardDialog
        seasonId={seasonId}
        seasonName={structure.season.name}
        onComplete={() => {
          invalidate()
          setWizardDismissed(true)
        }}
      />
    )
  }

  const dragClass = activeDragType ? `dragging-${activeDragType}` : ""

  return (
    <div className={`relative w-full h-full ${dragClass}`.trim()}>
      <ReactFlow
        className="structure-flow"
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onDrop={onCanvasDrop}
        onDragOver={onCanvasDragOver}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        proOptions={{ hideAttribution: true }}
        minZoom={0.2}
        maxZoom={2}
        selectNodesOnDrag={false}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
        <Controls showInteractive={false} />
      </ReactFlow>

      <SidePanel
        selectedNode={selectedNode}
        teams={paletteTeams}
        teamDivisionCounts={teamDivisionCounts}
        seasonId={seasonId}
        onInvalidate={invalidate}
        onDragTypeChange={setActiveDragType}
      />
    </div>
  )
}
