import { createFileRoute, Link } from "@tanstack/react-router"
import { ArrowLeft } from "lucide-react"
import { SectionWrapper } from "~/components/layout/sectionWrapper"
import { PageSkeleton } from "~/components/shared/loadingSkeleton"
import { ScoreBadge } from "~/components/shared/scoreBadge"
import { StatusBadge } from "~/components/shared/statusBadge"
import { TeamLogo } from "~/components/shared/teamLogo"
import { useOrg } from "~/lib/context"
import { cn, formatDateTime } from "~/lib/utils"
import { trpc } from "../../../lib/trpc"

export const Route = createFileRoute("/schedule/$gameId")({
  component: GameDetailPage,
  head: () => ({ meta: [{ title: "Spieldetails" }] }),
})

function GameDetailPage() {
  const { gameId } = Route.useParams()
  const org = useOrg()

  const { data: game, isLoading } = trpc.publicSite.getGameDetail.useQuery(
    { organizationId: org.id, gameId },
    { staleTime: 30_000 },
  )

  if (isLoading) return <PageSkeleton />

  if (!game) {
    return (
      <SectionWrapper>
        <div className="text-center py-12">
          <h2 className="text-xl font-bold mb-2">Spiel nicht gefunden</h2>
          <Link to="/schedule" className="text-league-primary hover:underline">
            Zurück zum Spielplan
          </Link>
        </div>
      </SectionWrapper>
    )
  }

  const goals = game.events.filter((e) => e.eventType === "goal")
  const penalties = game.events.filter((e) => e.eventType === "penalty")
  const homeLineup = game.lineups.filter((l) => l.team.id === game.homeTeamId)
  const awayLineup = game.lineups.filter((l) => l.team.id === game.awayTeamId)

  return (
    <div className="animate-fade-in">
      <SectionWrapper>
        <Link to="/schedule" className="inline-flex items-center gap-1 text-sm text-league-text/50 hover:text-league-primary mb-6">
          <ArrowLeft className="h-4 w-4" />
          Zurück zum Spielplan
        </Link>

        {/* Round info */}
        <div className="text-sm text-league-text/50 mb-2 text-center">
          {game.round.division?.name && <span>{game.round.division.name} &middot; </span>}
          {game.round.name}
        </div>

        {/* Score header */}
        <div className="bg-league-surface rounded-xl border border-league-text/10 p-6 sm:p-8 mb-8">
          <div className="flex items-center justify-center gap-6 sm:gap-10">
            {/* Home team */}
            <div className="text-center flex-1">
              <TeamLogo name={game.homeTeam.name} logoUrl={game.homeTeam.logoUrl} size="lg" className="mx-auto mb-2" />
              <div className="font-bold text-lg">{game.homeTeam.shortName}</div>
              <div className="text-xs text-league-text/50">Heim</div>
            </div>

            {/* Score */}
            <div className="text-center">
              <ScoreBadge
                homeScore={game.homeScore}
                awayScore={game.awayScore}
                status={game.status}
                size="lg"
              />
              <div className="mt-2">
                <StatusBadge status={game.status} />
              </div>
            </div>

            {/* Away team */}
            <div className="text-center flex-1">
              <TeamLogo name={game.awayTeam.name} logoUrl={game.awayTeam.logoUrl} size="lg" className="mx-auto mb-2" />
              <div className="font-bold text-lg">{game.awayTeam.shortName}</div>
              <div className="text-xs text-league-text/50">Gast</div>
            </div>
          </div>

          {game.scheduledAt && (
            <div className="text-center text-sm text-league-text/50 mt-4">
              {formatDateTime(game.scheduledAt)}
              {game.location && <span> &middot; {game.location}</span>}
            </div>
          )}
        </div>

        {/* Goals */}
        {goals.length > 0 && (
          <div className="mb-8">
            <h3 className="text-lg font-bold mb-3">Tore</h3>
            <div className="rounded-lg border border-league-text/10 bg-league-surface overflow-hidden divide-y divide-league-text/5">
              {goals.map((event) => {
                const isHome = event.team.id === game.homeTeamId
                return (
                  <div key={event.id} className={cn("flex items-center px-4 py-3 text-sm", isHome ? "flex-row" : "flex-row-reverse")}>
                    <div className={cn("flex-1", isHome ? "text-left" : "text-right")}>
                      <span className="font-medium">
                        {event.scorer?.firstName} {event.scorer?.lastName}
                      </span>
                      {(event.assist1 || event.assist2) && (
                        <span className="text-league-text/50 ml-2 text-xs">
                          (
                          {[event.assist1, event.assist2]
                            .filter(Boolean)
                            .map((a) => `${a!.firstName} ${a!.lastName}`)
                            .join(", ")}
                          )
                        </span>
                      )}
                    </div>
                    <div className="px-4 text-league-text/50 text-xs tabular-nums font-medium">
                      {event.period}. D &middot; {String(event.timeMinutes).padStart(2, "0")}:
                      {String(event.timeSeconds).padStart(2, "0")}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Penalties */}
        {penalties.length > 0 && (
          <div className="mb-8">
            <h3 className="text-lg font-bold mb-3">Strafen</h3>
            <div className="rounded-lg border border-league-text/10 bg-league-surface overflow-hidden divide-y divide-league-text/5">
              {penalties.map((event) => (
                <div key={event.id} className="flex items-center px-4 py-3 text-sm">
                  <div className="flex-1">
                    <span className="font-medium">
                      {event.penaltyPlayer?.firstName} {event.penaltyPlayer?.lastName}
                    </span>
                    <span className="text-league-text/50 ml-2 text-xs">({event.team.shortName})</span>
                  </div>
                  <div className="text-league-text/60 text-xs">
                    {event.penaltyMinutes && <span>{event.penaltyMinutes} Min</span>}
                    {event.penaltyType && <span> &middot; {event.penaltyType.name}</span>}
                  </div>
                  <div className="pl-4 text-league-text/50 text-xs tabular-nums">
                    {event.period}. D &middot; {String(event.timeMinutes).padStart(2, "0")}:
                    {String(event.timeSeconds).padStart(2, "0")}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Lineups */}
        {(homeLineup.length > 0 || awayLineup.length > 0) && (
          <div>
            <h3 className="text-lg font-bold mb-3">Aufstellungen</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { team: game.homeTeam, lineup: homeLineup },
                { team: game.awayTeam, lineup: awayLineup },
              ].map(({ team, lineup }) => (
                <div key={team.id} className="rounded-lg border border-league-text/10 bg-league-surface overflow-hidden">
                  <div className="px-4 py-2 bg-league-text/[0.03] font-semibold text-sm flex items-center gap-2">
                    <TeamLogo name={team.name} logoUrl={team.logoUrl} size="sm" />
                    {team.shortName}
                  </div>
                  <div className="divide-y divide-league-text/5">
                    {lineup.map((l) => (
                      <div key={l.id} className="flex items-center px-4 py-2 text-sm">
                        <span className="w-8 text-league-text/40 tabular-nums font-medium">
                          {l.jerseyNumber ?? "-"}
                        </span>
                        <span className="flex-1">
                          {l.player.firstName} {l.player.lastName}
                        </span>
                        <span className="text-xs text-league-text/40 uppercase">{l.position}</span>
                      </div>
                    ))}
                    {lineup.length === 0 && (
                      <div className="px-4 py-4 text-sm text-league-text/40 text-center">Keine Aufstellung verfügbar</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </SectionWrapper>
    </div>
  )
}
