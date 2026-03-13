import { createFileRoute, Link } from "@tanstack/react-router"
import { ArrowLeft, Globe, Mail, MapPin, User } from "lucide-react"
import { SectionWrapper } from "~/components/layout/sectionWrapper"
import { PageSkeleton } from "~/components/shared/loadingSkeleton"
import { PlayerHoverCard } from "~/components/shared/playerHoverCard"
import { TeamLogo } from "~/components/shared/teamLogo"
import { useFeatures, useOrg, useSeason } from "~/lib/context"
import { cn } from "~/lib/utils"
import { trpc } from "../../../lib/trpc"

export const Route = createFileRoute("/teams/$teamId")({
  component: TeamDetailPage,
  head: () => ({ meta: [{ title: "Team" }] }),
})

const positionLabels: Record<string, string> = {
  goalie: "Torwart",
  defense: "Verteidigung",
  forward: "Sturm",
}

function TeamDetailPage() {
  const { teamId } = Route.useParams()
  const org = useOrg()
  const season = useSeason()
  const features = useFeatures()

  const { data: team, isLoading } = trpc.publicSite.getTeamDetail.useQuery(
    { organizationId: org.id, teamId, seasonId: season.current?.id },
    { staleTime: 60_000 },
  )

  if (isLoading) return <PageSkeleton />

  if (!team) {
    return (
      <SectionWrapper>
        <div className="text-center py-12">
          <h2 className="text-xl font-bold mb-2">Team nicht gefunden</h2>
          <Link to="/teams" className="text-league-primary hover:underline">
            Zurück zur Teamliste
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

  return (
    <div className="animate-fade-in">
      <SectionWrapper>
        <Link to="/teams" className="inline-flex items-center gap-1 text-sm text-league-text/50 hover:text-league-primary mb-6">
          <ArrowLeft className="h-4 w-4" />
          Zurück zu Teams
        </Link>

        {/* Team header */}
        <div className="bg-league-surface rounded-xl border border-league-text/10 p-6 sm:p-8 mb-8">
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
                    Website
                  </a>
                )}
                {team.contactEmail && (
                  <a href={`mailto:${team.contactEmail}`} className="flex items-center gap-1 hover:text-league-primary">
                    <Mail className="h-3.5 w-3.5" />
                    Kontakt
                  </a>
                )}
              </div>
            </div>
          </div>

          {team.teamPhotoUrl && (
            <img
              src={team.teamPhotoUrl}
              alt={`${team.name} Teamfoto`}
              className="w-full rounded-lg mt-6 object-cover max-h-80"
            />
          )}
        </div>

        {/* Roster */}
        {team.roster.length > 0 ? (
          <div>
            <h2 className="text-xl font-bold mb-4">Kader</h2>
            <div className="space-y-6">
              {positionOrder.map((pos) => {
                const players = grouped.get(pos)
                if (!players || players.length === 0) return null
                return (
                  <div key={pos}>
                    <h3 className="text-sm font-semibold text-league-text/50 uppercase tracking-wider mb-2">
                      {positionLabels[pos] ?? pos}
                    </h3>
                    <div className="rounded-lg border border-league-text/10 bg-league-surface overflow-hidden divide-y divide-league-text/5">
                      {players.map((p) => (
                        <div key={p.playerId} className="flex items-center px-4 py-3">
                          <span className="w-10 text-league-text/40 tabular-nums font-bold text-sm">
                            #{p.jerseyNumber ?? "-"}
                          </span>
                          <div className="flex items-center gap-3 flex-1">
                            {p.photoUrl ? (
                              <img
                                src={p.photoUrl}
                                alt={`${p.firstName} ${p.lastName}`}
                                className="h-8 w-8 rounded-full object-cover"
                              />
                            ) : (
                              <div className="h-8 w-8 rounded-full bg-league-text/10 flex items-center justify-center">
                                <User className="h-4 w-4 text-league-text/30" />
                              </div>
                            )}
                            {features.advancedStats ? (
                              <PlayerHoverCard
                                firstName={p.firstName}
                                lastName={p.lastName}
                                photoUrl={p.photoUrl}
                                jerseyNumber={p.jerseyNumber}
                                position={pos}
                                team={{ name: team.name, shortName: team.shortName, logoUrl: team.logoUrl }}
                              >
                                <span className="font-medium text-sm cursor-pointer hover:text-league-primary transition-colors">
                                  {p.firstName} {p.lastName}
                                </span>
                              </PlayerHoverCard>
                            ) : (
                              <span className="font-medium text-sm">
                                {p.firstName} {p.lastName}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-league-text/40">
            <User className="h-8 w-8 mx-auto mb-2" />
            <p>Kein Kader verfügbar</p>
          </div>
        )}
      </SectionWrapper>
    </div>
  )
}
