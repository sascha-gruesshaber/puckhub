import { createFileRoute, Link } from "@tanstack/react-router"
import { SectionWrapper } from "~/components/layout/sectionWrapper"
import { EmptyState } from "~/components/shared/emptyState"
import { Skeleton } from "~/components/shared/loadingSkeleton"
import { TeamLogo } from "~/components/shared/teamLogo"
import { useOrg, useSeason } from "~/lib/context"
import { trpc } from "../../../lib/trpc"

export const Route = createFileRoute("/teams/")({
  component: TeamsPage,
  head: () => ({ meta: [{ title: "Teams" }] }),
})

function TeamsPage() {
  const org = useOrg()
  const season = useSeason()

  const { data: teams, isLoading } = trpc.publicSite.listTeams.useQuery(
    { organizationId: org.id, seasonId: season.current?.id },
    { staleTime: 300_000 },
  )

  return (
    <div className="animate-fade-in">
      <SectionWrapper title="Teams">
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-lg border border-league-text/10 bg-league-surface p-6">
                <Skeleton className="h-16 w-16 rounded-full mx-auto mb-3" />
                <Skeleton className="h-5 w-32 mx-auto mb-1" />
                <Skeleton className="h-3 w-20 mx-auto" />
              </div>
            ))}
          </div>
        ) : teams && teams.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {teams.map((team) => (
              <Link
                key={team.id}
                to="/teams/$teamId"
                params={{ teamId: team.id }}
                className="group block rounded-lg border border-league-text/10 bg-league-surface p-6 text-center transition-all hover:shadow-md hover:border-league-primary/30"
              >
                <TeamLogo name={team.name} logoUrl={team.logoUrl} size="lg" className="mx-auto mb-3" />
                <h3 className="font-bold text-lg group-hover:text-league-primary transition-colors">{team.name}</h3>
                {team.city && <p className="text-sm text-league-text/50 mt-1">{team.city}</p>}
                {team.homeVenue && <p className="text-xs text-league-text/40 mt-1">{team.homeVenue}</p>}
                {team.primaryColor && (
                  <div
                    className="h-1 w-12 rounded-full mx-auto mt-3"
                    style={{ backgroundColor: team.primaryColor }}
                  />
                )}
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState title="Keine Teams vorhanden" />
        )}
      </SectionWrapper>
    </div>
  )
}
