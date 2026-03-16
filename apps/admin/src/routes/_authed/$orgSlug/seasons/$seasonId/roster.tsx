import { Button, Skeleton } from "@puckhub/ui"
import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router"
import { Plus, Users } from "lucide-react"
import { useCallback, useMemo, useState } from "react"
import { trpc } from "@/trpc"
import { DataPageLayout } from "~/components/dataPageLayout"
import { EmptyState } from "~/components/emptyState"
import { FilterBar } from "~/components/filterBar"
import { FilterDropdown } from "~/components/filterDropdown"
import type { FilterDropdownOption } from "~/components/filterDropdown"
import { EditContractDialog } from "~/components/roster/editContractDialog"
import { ReleasePlayerDialog } from "~/components/roster/releasePlayerDialog"
import type { ContractRow } from "~/components/roster/rosterTable"
import { RosterTable } from "~/components/roster/rosterTable"
import { SignPlayerDialog } from "~/components/roster/signPlayerDialog"
import { TransferDialog } from "~/components/roster/transferDialog"
import { usePermissionGuard } from "~/contexts/permissionsContext"
import { useTranslation } from "~/i18n/use-translation"

export const Route = createFileRoute("/_authed/$orgSlug/seasons/$seasonId/roster")({
  validateSearch: (s: Record<string, unknown>): { search?: string; team?: string } => ({
    ...(typeof s.search === "string" && s.search ? { search: s.search } : {}),
    ...(typeof s.team === "string" && s.team ? { team: s.team } : {}),
  }),
  loader: async ({ context, params }) => {
    await context.trpcQueryUtils?.season.getFullStructure.ensureData({ id: params.seasonId })
  },
  component: RosterPage,
})

function RosterPage() {
  const { orgSlug } = useParams({ strict: false }) as { orgSlug: string }
  usePermissionGuard("roster")
  const { t } = useTranslation("common")
  const { seasonId } = Route.useParams()

  // State
  const { search: searchParam, team: selectedTeamId } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const search = searchParam ?? ""
  const setSearch = useCallback(
    (v: string) => navigate({ search: (prev) => ({ ...prev, search: v || undefined }), replace: true }),
    [navigate],
  )
  const setSelectedTeamId = useCallback(
    (v: string | null) => navigate({ search: (prev) => ({ ...prev, team: v || undefined }), replace: true }),
    [navigate],
  )
  const [signDialogOpen, setSignDialogOpen] = useState(false)
  const [editContract, setEditContract] = useState<ContractRow | null>(null)
  const [transferContract, setTransferContract] = useState<ContractRow | null>(null)
  const [releaseContract, setReleaseContract] = useState<ContractRow | null>(null)

  // Queries
  const { data: structure } = trpc.season.getFullStructure.useQuery({ id: seasonId })

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

  const teamFilterOptions: FilterDropdownOption[] = useMemo(
    () =>
      teams.map((team) => ({
        value: team.id,
        label: team.shortName,
        icon: team.logoUrl ? (
          <img src={team.logoUrl} alt="" className="h-5 w-5 rounded-sm object-contain" />
        ) : (
          <div className="h-5 w-5 rounded-sm flex items-center justify-center text-[9px] font-bold bg-muted text-muted-foreground">
            {team.shortName.slice(0, 2).toUpperCase()}
          </div>
        ),
      })),
    [teams],
  )

  // Auto-select first team if none selected
  const activeTeamId = selectedTeamId ?? teams[0]?.id ?? null

  const { data: roster, isLoading: rosterLoading } = trpc.contract.rosterForSeason.useQuery(
    { teamId: activeTeamId!, seasonId },
    { enabled: !!activeTeamId },
  )

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
            filters={
              <FilterBar
                search={{ value: search, onChange: setSearch, placeholder: t("rosterPage.searchPlaceholder") }}
              />
            }
          >
            <EmptyState
              icon={<Users className="h-8 w-8" style={{ color: "hsl(var(--accent))" }} strokeWidth={1.5} />}
              title={t("rosterPage.noTeams.title")}
              description={t("rosterPage.noTeams.description")}
              action={
                <Link to="/$orgSlug/seasons/$seasonId/structure" params={{ orgSlug, seasonId }}>
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
            <FilterBar
              label={t("filters")}
              search={{ value: search, onChange: setSearch, placeholder: t("rosterPage.searchPlaceholder") }}
            >
              <FilterDropdown
                label={t("gamesPage.filters.allTeams")}
                options={teamFilterOptions}
                value={activeTeamId ? [activeTeamId] : []}
                onChange={(selected) => setSelectedTeamId(selected[0] ?? null)}
                singleSelect
              />
            </FilterBar>
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

          <ReleasePlayerDialog
            open={!!releaseContract}
            onOpenChange={(open) => !open && setReleaseContract(null)}
            contract={releaseContract}
            teamId={activeTeamId}
            seasonId={seasonId}
          />
        </>
      )}
    </>
  )
}
