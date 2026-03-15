import { createFileRoute, Link } from "@tanstack/react-router"
import { ArrowLeft, Globe, Mail, MapPin, Shield, User, Users } from "lucide-react"
import { lazy, Suspense } from "react"
import { SectionWrapper } from "~/components/layout/sectionWrapper"
import { EmptyState } from "~/components/shared/emptyState"
import { PageSkeleton } from "~/components/shared/loadingSkeleton"
import { PlayerHoverCard } from "~/components/shared/playerHoverCard"
import { TeamLogo } from "~/components/shared/teamLogo"
import { AllTimeStats } from "~/components/stats/allTimeStats"
import { SeasonTimeline } from "~/components/stats/seasonTimeline"
import { useFeatures, useOrg, useSeason } from "~/lib/context"
import { useT } from "~/lib/i18n"
import { cn, useBackPath } from "~/lib/utils"
import { trpc } from "../../../lib/trpc"

const TeamProgressionCharts = lazy(() =>
  import("~/components/charts/teamProgressionCharts").then((m) => ({ default: m.TeamProgressionCharts })),
)

export const Route = createFileRoute("/teams/$teamId")({
  component: TeamDetailPage,
  head: () => ({ meta: [{ title: "Team" }] }),
  validateSearch: (s: Record<string, unknown>): { from?: string } => ({
    ...(typeof s.from === "string" && s.from ? { from: s.from } : {}),
  }),
})

function BackLink({ from }: { from?: string }) {
  const t = useT()
  if (from) {
    return (
      <a
        href={from}
        className="inline-flex items-center gap-1 text-sm text-league-text/50 hover:text-league-primary mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        {t.common.back}
      </a>
    )
  }
  return (
    <Link
      to="/teams"
      className="inline-flex items-center gap-1 text-sm text-league-text/50 hover:text-league-primary mb-6"
    >
      <ArrowLeft className="h-4 w-4" />
      {t.teams.backToTeams}
    </Link>
  )
}

function SectionDivider({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-3 pt-10 pb-4">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-league-primary/10 text-league-primary shrink-0">
        {icon}
      </div>
      <h2 className="text-lg font-bold">{title}</h2>
      <div className="flex-1 h-px bg-league-text/10" />
    </div>
  )
}

function TeamDetailPage() {
  const t = useT()
  const { teamId } = Route.useParams()
  const { from: fromParam } = Route.useSearch()
  const org = useOrg()
  const season = useSeason()
  const features = useFeatures()

  const positionLabels: Record<string, string> = {
    goalie: t.positions.goalie,
    defense: t.positions.defense,
    forward: t.positions.forward,
  }

  const backPath = useBackPath()

  const { data: team, isLoading } = trpc.publicSite.getTeamDetail.useQuery(
    { organizationId: org.id, teamId, seasonId: season.current?.id },
    { staleTime: 60_000 },
  )

  const { data: historyData, isLoading: historyLoading } = trpc.publicSite.getTeamHistory.useQuery(
    { organizationId: org.id, teamId },
    { enabled: features.advancedStats, staleTime: 300_000 },
  )

  if (isLoading) return <PageSkeleton />

  if (!team) {
    return (
      <SectionWrapper>
        <div className="text-center py-12">
          <h2 className="text-xl font-bold mb-2">{t.teams.notFound}</h2>
          <Link to="/teams" className="text-league-primary hover:underline">
            {t.teams.backToTeams}
          </Link>
        </div>
      </SectionWrapper>
    )
  }

  // Group roster by position
  const grouped = new Map<string, typeof team.roster>()
  for (const player of team.roster) {
    const pos = player.position
    if (!grouped.has(pos)) grouped.set(pos, [])
    grouped.get(pos)!.push(player)
  }
  const positionOrder = ["goalie", "defense", "forward"]

  const historySeasonsData = historyData?.seasons ?? []
  const historyTopScorers = historyData?.topScorers ?? []
  const historyTopGoalies = historyData?.topGoalies ?? []

  return (
    <div className="animate-fade-in">
      <SectionWrapper>
        <BackLink from={fromParam} />

        {/* Team header */}
        <div className="bg-league-surface rounded-xl border border-league-text/10 p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <TeamLogo name={team.name} logoUrl={team.logoUrl} size="lg" />
            <div className={cn("text-center sm:text-left")}>
              <h1 className="text-3xl font-extrabold">{team.name}</h1>
              {team.city && (
                <p className="text-league-text/60 mt-1 flex items-center gap-1 justify-center sm:justify-start">
                  <MapPin className="h-4 w-4" />
                  {team.city}
                </p>
              )}
              <div className="flex flex-wrap gap-4 mt-3 text-sm text-league-text/50 justify-center sm:justify-start">
                {team.homeVenue && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {team.homeVenue}
                  </span>
                )}
                {team.website && (
                  <a
                    href={team.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 hover:text-league-primary"
                  >
                    <Globe className="h-3.5 w-3.5" />
                    {t.common.website}
                  </a>
                )}
                {team.contactEmail && (
                  <a href={`mailto:${team.contactEmail}`} className="flex items-center gap-1 hover:text-league-primary">
                    <Mail className="h-3.5 w-3.5" />
                    {t.common.contact}
                  </a>
                )}
              </div>
            </div>
          </div>

          {team.teamPhotoUrl && (
            <img src={team.teamPhotoUrl} alt={`${team.name} ${t.teams.teamPhoto}`} className="w-full rounded-lg mt-6" />
          )}
        </div>

        {/* Roster section */}
        <SectionDivider icon={<Users className="h-4 w-4" />} title={t.teams.roster} />

        {team.roster.length > 0 ? (
          <div className="space-y-8">
            {positionOrder.map((pos) => {
              const players = grouped.get(pos)
              if (!players || players.length === 0) return null
              return (
                <div key={pos}>
                  <h3 className="text-sm font-semibold text-league-text/50 uppercase tracking-wider mb-3">
                    {positionLabels[pos] ?? pos}
                  </h3>
                  <div className="flex flex-wrap gap-3">
                    {players.map((p) => {
                      const card = (
                        <div
                          key={p.playerId}
                          className={cn(
                            "flex items-center gap-3 rounded-lg border border-league-text/10 bg-league-surface px-4 py-3 transition-colors w-full sm:w-72",
                            features.advancedStats && "hover:border-league-primary/30",
                          )}
                        >
                          {p.photoUrl ? (
                            <img
                              src={p.photoUrl}
                              alt={`${p.firstName} ${p.lastName}`}
                              className="h-10 w-10 rounded-full object-cover object-top flex-shrink-0"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-league-text/10 flex items-center justify-center flex-shrink-0">
                              <User className="h-5 w-5 text-league-text/30" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate">
                              {p.firstName} {p.lastName}
                            </div>
                          </div>
                          <span className="text-league-text/30 tabular-nums font-bold text-sm flex-shrink-0">
                            #{p.jerseyNumber ?? "-"}
                          </span>
                        </div>
                      )

                      if (features.advancedStats) {
                        return (
                          <PlayerHoverCard
                            key={p.playerId}
                            firstName={p.firstName}
                            lastName={p.lastName}
                            photoUrl={p.photoUrl}
                            jerseyNumber={p.jerseyNumber}
                            position={pos}
                            team={{ name: team.name, shortName: team.shortName, logoUrl: team.logoUrl }}
                            playerId={p.playerId}
                          >
                            <Link
                              to="/stats/players/$playerId"
                              params={{ playerId: p.playerId }}
                              search={{ from: backPath }}
                              className="block"
                            >
                              {card}
                            </Link>
                          </PlayerHoverCard>
                        )
                      }

                      return card
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-league-text/40">
            <User className="h-8 w-8 mx-auto mb-2" />
            <p>{t.teams.noRoster}</p>
          </div>
        )}

        {/* History section */}
        {features.advancedStats && (
          <>
            <SectionDivider icon={<Shield className="h-4 w-4" />} title={t.teams.seasonHistory} />

            {historyLoading ? (
              <div className="space-y-4">
                <div className="h-32 rounded-lg bg-league-text/5 animate-pulse" />
                <div className="h-64 rounded-lg bg-league-text/5 animate-pulse" />
              </div>
            ) : (
              <div className="space-y-6">
                {historySeasonsData.length > 0 && <AllTimeStats seasons={historySeasonsData} />}

                <Suspense fallback={<div className="h-64 rounded-lg bg-league-text/5 animate-pulse" />}>
                  <TeamProgressionCharts seasons={historySeasonsData} />
                </Suspense>

                {historySeasonsData.length > 0 ? (
                  <SeasonTimeline
                    seasons={historySeasonsData}
                    topScorers={historyTopScorers}
                    topGoalies={historyTopGoalies}
                  />
                ) : (
                  <EmptyState
                    icon={<Shield className="h-8 w-8" />}
                    title={t.teams.noSeasons}
                    description={t.teams.noSeasonsDesc}
                  />
                )}
              </div>
            )}
          </>
        )}
      </SectionWrapper>
    </div>
  )
}
