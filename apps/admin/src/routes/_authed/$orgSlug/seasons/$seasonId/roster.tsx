import { Button, Skeleton } from "@puckhub/ui"
import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router"
import { Plus, Users } from "lucide-react"
import { useCallback, useMemo, useState } from "react"
import { trpc } from "@/trpc"
import { DataPageLayout } from "~/components/dataPageLayout"
import { EmptyState } from "~/components/emptyState"
import { FilterBar } from "~/components/filterBar"
import type { FilterDropdownOption } from "~/components/filterDropdown"
import { FilterDropdown } from "~/components/filterDropdown"
import { EditContractSheet } from "~/components/roster/editContractSheet"
import { ReleasePlayerSheet } from "~/components/roster/releasePlayerSheet"
import type { ContractRow } from "~/components/roster/rosterTable"
import { RosterTable } from "~/components/roster/rosterTable"
import { SignPlayerSheet } from "~/components/roster/signPlayerSheet"
import { TransferSheet } from "~/components/roster/transferSheet"
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
        description: team.name,
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

  // Fetch all rosters for the season
  const { data: allRoster, isLoading: rosterLoading } = trpc.contract.rosterForSeasonAllTeams.useQuery(
    { seasonId },
    { enabled: teams.length > 0 },
  )

  // Filter roster: by team (if filter active) and by search
  const filteredRoster = useMemo(() => {
    if (!allRoster) return []
    let result = allRoster

    // Only include contracts for teams in the season structure
    const teamIds = new Set(teams.map((t) => t.id))
    result = result.filter((c) => teamIds.has(c.teamId))

    // Apply team filter
    if (selectedTeamId) {
      result = result.filter((c) => c.teamId === selectedTeamId)
    }

    // Apply search filter
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (c) =>
          c.player.firstName.toLowerCase().includes(q) ||
          c.player.lastName.toLowerCase().includes(q) ||
          `${c.player.firstName} ${c.player.lastName}`.toLowerCase().includes(q),
      )
    }

    return result
  }, [allRoster, selectedTeamId, search, teams])

  // Teams to display (filtered or all), mapped for RosterTable
  const displayTeams = useMemo(() => {
    const source = selectedTeamId ? teams.filter((t) => t.id === selectedTeamId) : teams
    return source.map((t) => ({
      id: t.id,
      name: t.name,
      shortName: t.shortName,
      logoUrl: t.logoUrl,
      primaryColor: t.primaryColor ?? null,
    }))
  }, [teams, selectedTeamId])

  // Existing player IDs for the selected team (for sign dialog)
  const _existingPlayerIdsForTeam = useMemo(() => {
    if (!allRoster || !selectedTeamId) return []
    return allRoster.filter((c) => c.teamId === selectedTeamId).map((c) => c.playerId)
  }, [allRoster, selectedTeamId])

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
                value={selectedTeamId ? [selectedTeamId] : []}
                onChange={(selected) => setSelectedTeamId(selected[0] ?? null)}
                singleSelect
                testId="roster-team-filter"
                optionTestIdPrefix="roster-team-filter-option"
              />
            </FilterBar>
          }
        >
          {/* Roster */}
          {rosterLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: static placeholder items have no unique id
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
                  : selectedTeamId
                    ? t("rosterPage.empty.teamEmpty", {
                        team: teams.find((t) => t.id === selectedTeamId)?.name ?? t("rosterPage.fallback.team"),
                      })
                    : t("rosterPage.empty.allTeamsEmpty")
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
              teams={displayTeams}
              onEdit={(c) => setEditContract(c)}
              onRelease={(c) => setReleaseContract(c)}
              onTransfer={(c) => setTransferContract(c)}
            />
          )}
        </DataPageLayout>
      )}

      {/* Dialogs */}
      {teams.length > 0 && (
        <>
          <SignPlayerSheet
            open={signDialogOpen}
            onOpenChange={setSignDialogOpen}
            teams={teams.map((t) => ({
              id: t.id,
              name: t.name,
              shortName: t.shortName,
              city: t.city,
              logoUrl: t.logoUrl,
              primaryColor: t.primaryColor,
            }))}
            defaultTeamId={selectedTeamId ?? null}
            seasonId={seasonId}
          />

          <EditContractSheet
            open={!!editContract}
            onOpenChange={(open) => !open && setEditContract(null)}
            contract={editContract}
            seasonId={seasonId}
          />

          <TransferSheet
            open={!!transferContract}
            onOpenChange={(open) => !open && setTransferContract(null)}
            contract={transferContract}
            seasonId={seasonId}
            teams={teams}
          />

          <ReleasePlayerSheet
            open={!!releaseContract}
            onOpenChange={(open) => !open && setReleaseContract(null)}
            contract={releaseContract}
            seasonId={seasonId}
          />
        </>
      )}
    </>
  )
}
