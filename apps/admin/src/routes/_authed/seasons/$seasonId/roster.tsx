import { Button, Skeleton, toast } from "@puckhub/ui"
import { createFileRoute, Link } from "@tanstack/react-router"
import { Plus, Users } from "lucide-react"
import { useMemo, useState } from "react"
import { trpc } from "@/trpc"
import { ConfirmDialog } from "~/components/confirmDialog"
import { DataPageLayout } from "~/components/dataPageLayout"
import { EmptyState } from "~/components/emptyState"
import { EditContractDialog } from "~/components/roster/editContractDialog"
import type { ContractRow } from "~/components/roster/rosterTable"
import { RosterTable } from "~/components/roster/rosterTable"
import { SignPlayerDialog } from "~/components/roster/signPlayerDialog"
import { TransferDialog } from "~/components/roster/transferDialog"
import { TeamFilterPills } from "~/components/teamFilterPills"
import { useTranslation } from "~/i18n/use-translation"

export const Route = createFileRoute("/_authed/seasons/$seasonId/roster")({
  component: RosterPage,
})

function RosterPage() {
  const { t } = useTranslation("common")
  const { seasonId } = Route.useParams()

  // State
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [signDialogOpen, setSignDialogOpen] = useState(false)
  const [editContract, setEditContract] = useState<ContractRow | null>(null)
  const [transferContract, setTransferContract] = useState<ContractRow | null>(null)
  const [releaseContract, setReleaseContract] = useState<ContractRow | null>(null)

  // Queries
  const { data: structure } = trpc.season.getFullStructure.useQuery({ id: seasonId })
  const utils = trpc.useUtils()

  // Extract teams from the season's structure (teams assigned to divisions)
  const teams = useMemo(() => {
    if (!structure?.teamAssignments) return []
    const seen = new Set<string>()
    const result: {
      id: string
      name: string
      shortName: string
      logoUrl: string | null
      city?: string | null
      contactName?: string | null
      website?: string | null
      primaryColor?: string | null
    }[] = []
    for (const ta of structure.teamAssignments) {
      if (!seen.has(ta.team.id)) {
        seen.add(ta.team.id)
        result.push({
          id: ta.team.id,
          name: ta.team.name,
          shortName: ta.team.shortName,
          logoUrl: ta.team.logoUrl ?? null,
          city: ta.team.city ?? null,
          contactName: ta.team.contactName ?? null,
          website: ta.team.website ?? null,
          primaryColor: ta.team.primaryColor ?? null,
        })
      }
    }
    result.sort((a, b) => a.name.localeCompare(b.name))
    return result
  }, [structure])

  // Auto-select first team if none selected
  const activeTeamId = selectedTeamId ?? teams[0]?.id ?? null

  const { data: roster, isLoading: rosterLoading } = trpc.contract.rosterForSeason.useQuery(
    { teamId: activeTeamId!, seasonId },
    { enabled: !!activeTeamId },
  )

  const releaseMutation = trpc.contract.releasePlayer.useMutation({
    onSuccess: () => {
      if (activeTeamId) {
        utils.contract.rosterForSeason.invalidate({ teamId: activeTeamId, seasonId })
      }
      setReleaseContract(null)
      toast.success(t("rosterPage.toast.released"))
    },
    onError: (err) => {
      toast.error(t("rosterPage.toast.releaseError"), { description: err.message })
    },
  })

  const existingPlayerIds = useMemo(() => {
    return (roster ?? []).map((c) => c.playerId)
  }, [roster])

  const activeTeam = teams.find((t) => t.id === activeTeamId)

  // Filter roster by search
  const filteredRoster = useMemo(() => {
    if (!roster) return []
    if (!search.trim()) return roster
    const q = search.toLowerCase()
    return roster.filter(
      (c) =>
        c.player.firstName.toLowerCase().includes(q) ||
        c.player.lastName.toLowerCase().includes(q) ||
        `${c.player.firstName} ${c.player.lastName}`.toLowerCase().includes(q),
    )
  }, [roster, search])

  return (
    <>
      {teams.length === 0 ? (
        <div className="space-y-6">
          <DataPageLayout
            title={t("rosterPage.title")}
            description={t("rosterPage.description")}
            search={{ value: search, onChange: setSearch, placeholder: t("rosterPage.searchPlaceholder") }}
          >
            <EmptyState
              icon={<Users className="h-8 w-8" style={{ color: "hsl(var(--accent))" }} strokeWidth={1.5} />}
              title={t("rosterPage.noTeams.title")}
              description={t("rosterPage.noTeams.description")}
              action={
                <Link to="/seasons/$seasonId/structure" params={{ seasonId }}>
                  <Button variant="accent">{t("rosterPage.noTeams.action")}</Button>
                </Link>
              }
            />
          </DataPageLayout>
        </div>
      ) : (
        <DataPageLayout
          title={t("rosterPage.title")}
          description={t("rosterPage.description")}
          action={
            <Button variant="accent" onClick={() => setSignDialogOpen(true)} className="shrink-0">
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
              {t("rosterPage.actions.signPlayer")}
            </Button>
          }
          filters={
            <TeamFilterPills
              teams={teams}
              activeFilter={activeTeamId ?? ""}
              onFilterChange={setSelectedTeamId}
              showAll={false}
              translationPrefix="rosterPage.filters"
              seasonId={seasonId}
            />
          }
          search={{ value: search, onChange: setSearch, placeholder: t("rosterPage.searchPlaceholder") }}
          count={
            roster && roster.length > 0 ? (
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="font-semibold text-foreground">{roster.length}</span> {t("rosterPage.count.players")}
                </span>
              </div>
            ) : undefined
          }
        >
          {/* Roster */}
          {rosterLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-5 w-24 rounded" />
                  <Skeleton className="h-12 w-full rounded-lg" />
                  <Skeleton className="h-12 w-full rounded-lg" />
                </div>
              ))}
            </div>
          ) : !filteredRoster || filteredRoster.length === 0 ? (
            <EmptyState
              icon={<Users className="h-8 w-8" style={{ color: "hsl(var(--accent))" }} strokeWidth={1.5} />}
              title={search ? t("rosterPage.empty.noResultsTitle") : t("rosterPage.empty.teamEmptyTitle")}
              description={
                search
                  ? t("rosterPage.empty.noSearchResults", { query: search })
                  : t("rosterPage.empty.teamEmpty", {
                      team: activeTeam?.name ?? t("rosterPage.fallback.team"),
                    })
              }
              action={
                !search ? (
                  <Button variant="accent" onClick={() => setSignDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                    {t("rosterPage.empty.signFirst")}
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <RosterTable
              contracts={filteredRoster}
              onEdit={(c) => setEditContract(c)}
              onRelease={(c) => setReleaseContract(c)}
              onTransfer={(c) => setTransferContract(c)}
            />
          )}
        </DataPageLayout>
      )}

      {/* Dialogs */}
      {activeTeamId && (
        <>
          <SignPlayerDialog
            open={signDialogOpen}
            onOpenChange={setSignDialogOpen}
            teamId={activeTeamId}
            seasonId={seasonId}
            existingPlayerIds={existingPlayerIds}
          />

          <EditContractDialog
            open={!!editContract}
            onOpenChange={(open) => !open && setEditContract(null)}
            contract={editContract}
            teamId={activeTeamId}
            seasonId={seasonId}
          />

          <TransferDialog
            open={!!transferContract}
            onOpenChange={(open) => !open && setTransferContract(null)}
            contract={transferContract}
            currentTeamId={activeTeamId}
            seasonId={seasonId}
            teams={teams}
          />

          <ConfirmDialog
            open={!!releaseContract}
            onOpenChange={(open) => !open && setReleaseContract(null)}
            title={t("rosterPage.releaseDialog.title")}
            description={
              releaseContract
                ? t("rosterPage.releaseDialog.description", {
                    player: `${releaseContract.player.firstName} ${releaseContract.player.lastName}`,
                  })
                : ""
            }
            confirmLabel={t("rosterPage.releaseDialog.confirm")}
            variant="destructive"
            isPending={releaseMutation.isPending}
            onConfirm={() => {
              if (releaseContract) {
                releaseMutation.mutate({
                  contractId: releaseContract.id,
                  seasonId,
                })
              }
            }}
          />
        </>
      )}
    </>
  )
}
