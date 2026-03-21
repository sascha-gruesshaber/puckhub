import { createFileRoute, Link, useParams } from "@tanstack/react-router"
import { ArrowLeft, Loader2, Sparkles } from "lucide-react"
import { useEffect } from "react"
import { SectionWrapper } from "~/components/layout/sectionWrapper"
import { PageSkeleton } from "~/components/shared/loadingSkeleton"
import { PublicReportForm } from "~/components/shared/publicReportForm"
import { ScoreBadge } from "~/components/shared/scoreBadge"
import { StatusBadge } from "~/components/shared/statusBadge"
import { TeamLogo } from "~/components/shared/teamLogo"
import { TrikotPreview } from "~/components/shared/trikotPreview"
import { useFeatures, useOrg } from "~/lib/context"
import { useT } from "~/lib/i18n"
import { cn, formatDateTime, slugify, useBackPath } from "~/lib/utils"
import { trpc } from "../../../lib/trpc"

export const Route = createFileRoute("/schedule/$gameId")({
  component: GameDetailPage,
  head: () => ({ meta: [{ title: "Spieldetails" }] }),
})

export function GameDetailPage() {
  const { gameId } = useParams({ strict: false }) as { gameId: string }
  const org = useOrg()
  const features = useFeatures()
  const t = useT()
  const backPath = useBackPath()

  const utils = trpc.useUtils()
  const { data: game, isLoading } = trpc.publicSite.getGameDetail.useQuery(
    { organizationId: org.id, gameId },
    { staleTime: 30_000 },
  )

  const isRecapGenerating = !!(game as any)?.recapGenerating

  // Poll while recap is generating
  useEffect(() => {
    if (!isRecapGenerating) return
    const interval = setInterval(() => {
      utils.publicSite.getGameDetail.invalidate({ organizationId: org.id, gameId })
    }, 1000)
    return () => clearInterval(interval)
  }, [isRecapGenerating, gameId, org.id, utils])

  const showPublicReportForm =
    features.publicReports && !!game && (game.status === "scheduled" || game.status === "postponed")

  const { data: reportStatus } = trpc.publicSite.reportHasReport.useQuery(
    { organizationId: org.id, gameId },
    { enabled: showPublicReportForm, staleTime: 30_000 },
  )

  if (isLoading) return <PageSkeleton />

  if (!game) {
    return (
      <SectionWrapper>
        <div className="text-center py-12">
          <h2 className="text-xl font-bold mb-2">{t.gameDetail.notFound}</h2>
          <Link to="/schedule" className="text-league-primary hover:underline">
            {t.gameDetail.backToSchedule}
          </Link>
        </div>
      </SectionWrapper>
    )
  }

  const goals = game.events.filter((e) => e.eventType === "goal")
  const penalties = game.events.filter((e) => e.eventType === "penalty")
  const noteEvents = game.events.filter((e: any) => e.eventType === "note")
  const gameWideNotes = noteEvents.filter((n: any) => n.period == null)
  const timelineNotes = noteEvents.filter((n: any) => n.period != null)
  const homeLineup = game.lineups.filter((l) => l.team.id === game.homeTeamId)
  const awayLineup = game.lineups.filter((l) => l.team.id === game.awayTeamId)

  return (
    <div className="animate-fade-in">
      <SectionWrapper>
        <Link
          to="/schedule"
          className="inline-flex items-center gap-1 text-sm text-league-text/50 hover:text-league-primary mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          {t.gameDetail.backToSchedule}
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
            <Link
              to="/teams/$teamId/$slug"
              params={{ teamId: game.homeTeam.id, slug: slugify(game.homeTeam.name) }}
              search={{ from: backPath }}
              className="text-center flex-1 group"
            >
              <TeamLogo name={game.homeTeam.name} logoUrl={game.homeTeam.logoUrl} size="lg" className="mx-auto mb-2" />
              {(game as any).homeTrikot && (
                <TrikotPreview
                  svg={(game as any).homeTrikot.template.svg}
                  primaryColor={(game as any).homeTrikot.primaryColor}
                  secondaryColor={(game as any).homeTrikot.secondaryColor}
                  size="sm"
                  className="mx-auto mb-1"
                />
              )}
              <div className="font-bold text-lg group-hover:text-league-primary transition-colors">
                {game.homeTeam.shortName}
              </div>
              <div className="text-xs text-league-text/50">{t.gameDetail.home}</div>
            </Link>

            {/* Score */}
            <div className="text-center">
              <ScoreBadge homeScore={game.homeScore} awayScore={game.awayScore} status={game.status} size="lg" />
              <div className="mt-2">
                <StatusBadge status={game.status} />
              </div>
            </div>

            {/* Away team */}
            <Link
              to="/teams/$teamId/$slug"
              params={{ teamId: game.awayTeam.id, slug: slugify(game.awayTeam.name) }}
              search={{ from: backPath }}
              className="text-center flex-1 group"
            >
              <TeamLogo name={game.awayTeam.name} logoUrl={game.awayTeam.logoUrl} size="lg" className="mx-auto mb-2" />
              {(game as any).awayTrikot && (
                <TrikotPreview
                  svg={(game as any).awayTrikot.template.svg}
                  primaryColor={(game as any).awayTrikot.primaryColor}
                  secondaryColor={(game as any).awayTrikot.secondaryColor}
                  size="sm"
                  className="mx-auto mb-1"
                />
              )}
              <div className="font-bold text-lg group-hover:text-league-primary transition-colors">
                {game.awayTeam.shortName}
              </div>
              <div className="text-xs text-league-text/50">{t.gameDetail.away}</div>
            </Link>
          </div>

          {game.scheduledAt && (
            <div className="text-center text-sm text-league-text/50 mt-4">
              {formatDateTime(game.scheduledAt)}
              {game.location && <span> &middot; {game.location}</span>}
            </div>
          )}
        </div>

        {/* Public Report */}
        {showPublicReportForm && (
          <div className="mb-8">
            {reportStatus?.hasReport ? (
              <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-4 text-center text-sm text-green-700">
                {t.publicReport.alreadyReported}
              </div>
            ) : (
              <PublicReportForm
                gameId={gameId}
                homeTeamShortName={game.homeTeam.shortName}
                awayTeamShortName={game.awayTeam.shortName}
                homeTeamLogoUrl={game.homeTeam.logoUrl}
                awayTeamLogoUrl={game.awayTeam.logoUrl}
              />
            )}
          </div>
        )}

        {/* AI Recap */}
        {(game as any).recapGenerating && (
          <div className="mb-8">
            <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              {t.gameDetail.gameReport}
            </h3>
            <div className="rounded-lg border border-league-text/10 bg-league-surface p-6 space-y-3">
              <div className="h-5 w-3/4 bg-league-text/10 animate-pulse rounded" />
              <div className="space-y-2">
                <div className="h-3 w-full bg-league-text/10 animate-pulse rounded" />
                <div className="h-3 w-full bg-league-text/10 animate-pulse rounded" />
                <div className="h-3 w-5/6 bg-league-text/10 animate-pulse rounded" />
                <div className="h-3 w-full bg-league-text/10 animate-pulse rounded" />
                <div className="h-3 w-2/3 bg-league-text/10 animate-pulse rounded" />
              </div>
              <p className="text-xs text-league-text/40 flex items-center gap-1.5 pt-1">
                <Loader2 className="w-3 h-3 animate-spin" />
                {t.gameDetail.reportGenerating}
              </p>
            </div>
          </div>
        )}
        {!!(game as any).recapTitle && (
          <div className="mb-8 animate-fade-in">
            <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              {t.gameDetail.gameReport}
            </h3>
            <div className="rounded-lg border border-league-text/10 bg-league-surface p-6">
              <h4 className="font-semibold text-base mb-3">{(game as any).recapTitle}</h4>
              <div
                className="prose prose-sm max-w-none text-league-text/70 [&>h3]:mt-5 [&>h3]:mb-1.5 [&>h3]:text-sm [&>h3]:font-semibold [&>h3]:tracking-wide [&>h3]:uppercase [&>h3]:text-league-text/50 [&>h3:first-child]:mt-0 [&>p:first-child]:mt-0 [&>h3+p+p]:mt-4 [&>p:last-child]:mt-5"
                dangerouslySetInnerHTML={{ __html: (game as any).recapContent ?? "" }}
              />
            </div>
          </div>
        )}

        {/* Game-wide notes */}
        {gameWideNotes.length > 0 && (
          <div className="mb-8">
            <h3 className="text-lg font-bold mb-3">{t.gameDetail.notes}</h3>
            <div className="rounded-lg border border-league-text/10 bg-league-surface overflow-hidden divide-y divide-league-text/5">
              {gameWideNotes.map((note: any) => (
                <div key={note.id} className="px-4 py-3 text-sm">
                  <p className="whitespace-pre-wrap">{note.noteText}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Goals */}
        {goals.length > 0 && (
          <div className="mb-8">
            <h3 className="text-lg font-bold mb-3">{t.gameDetail.goals}</h3>
            <div className="rounded-lg border border-league-text/10 bg-league-surface overflow-hidden divide-y divide-league-text/5">
              {goals.map((event) => {
                const isHome = event.team?.id === game.homeTeamId
                return (
                  <div
                    key={event.id}
                    className={cn("flex items-center px-4 py-3 text-sm", isHome ? "flex-row" : "flex-row-reverse")}
                  >
                    <div className={cn("flex-1", isHome ? "text-left" : "text-right")}>
                      {event.scorer ? (
                        <Link
                          to="/players/$playerId/$slug"
                          params={{
                            playerId: event.scorer.id ?? "",
                            slug: slugify(`${event.scorer.firstName} ${event.scorer.lastName}`),
                          }}
                          search={{ from: backPath }}
                          className="font-medium hover:text-league-primary transition-colors"
                        >
                          {event.scorer.firstName} {event.scorer.lastName}
                        </Link>
                      ) : (
                        <span className="font-medium">–</span>
                      )}
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
                      {event.period}. {t.abbr.period} &middot; {String(event.timeMinutes).padStart(2, "0")}:
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
            <h3 className="text-lg font-bold mb-3">{t.gameDetail.penalties}</h3>
            <div className="rounded-lg border border-league-text/10 bg-league-surface overflow-hidden divide-y divide-league-text/5">
              {penalties.map((event) => (
                <div key={event.id} className="flex items-center px-4 py-3 text-sm">
                  <div className="flex-1">
                    {event.penaltyPlayer ? (
                      <Link
                        to="/players/$playerId/$slug"
                        params={{
                          playerId: event.penaltyPlayer.id ?? "",
                          slug: slugify(`${event.penaltyPlayer.firstName} ${event.penaltyPlayer.lastName}`),
                        }}
                        search={{ from: backPath }}
                        className="font-medium hover:text-league-primary transition-colors"
                      >
                        {event.penaltyPlayer.firstName} {event.penaltyPlayer.lastName}
                      </Link>
                    ) : (
                      <span className="font-medium">–</span>
                    )}
                    {event.team && <span className="text-league-text/50 ml-2 text-xs">({event.team.shortName})</span>}
                  </div>
                  <div className="text-league-text/60 text-xs">
                    {event.penaltyMinutes && (
                      <span>
                        {event.penaltyMinutes} {t.abbr.min}
                      </span>
                    )}
                    {event.penaltyType && <span> &middot; {event.penaltyType.name}</span>}
                  </div>
                  <div className="pl-4 text-league-text/50 text-xs tabular-nums">
                    {event.period}. {t.abbr.period} &middot; {String(event.timeMinutes).padStart(2, "0")}:
                    {String(event.timeSeconds).padStart(2, "0")}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Timeline notes */}
        {timelineNotes.length > 0 && (
          <div className="mb-8">
            <h3 className="text-lg font-bold mb-3">{t.gameDetail.notes}</h3>
            <div className="rounded-lg border border-league-text/10 bg-league-surface overflow-hidden divide-y divide-league-text/5">
              {timelineNotes.map((note: any) => (
                <div key={note.id} className="flex items-center px-4 py-3 text-sm">
                  <div className="flex-1">
                    <p className="whitespace-pre-wrap">{note.noteText}</p>
                    {note.team && <span className="text-league-text/50 text-xs">({note.team.shortName})</span>}
                  </div>
                  <div className="pl-4 text-league-text/50 text-xs tabular-nums">
                    {note.period}. {t.abbr.period} &middot; {String(note.timeMinutes).padStart(2, "0")}:
                    {String(note.timeSeconds).padStart(2, "0")}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No detailed data hint */}
        {goals.length === 0 &&
          penalties.length === 0 &&
          noteEvents.length === 0 &&
          homeLineup.length === 0 &&
          awayLineup.length === 0 &&
          game.status === "completed" && (
            <div className="text-center text-sm text-league-text/40 py-6">{t.gameDetail.noDetailedReports}</div>
          )}

        {/* Lineups */}
        {(homeLineup.length > 0 || awayLineup.length > 0) && (
          <div>
            <h3 className="text-lg font-bold mb-3">{t.gameDetail.lineups}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { team: game.homeTeam, lineup: homeLineup },
                { team: game.awayTeam, lineup: awayLineup },
              ].map(({ team, lineup }) => (
                <div
                  key={team.id}
                  className="rounded-lg border border-league-text/10 bg-league-surface overflow-hidden"
                >
                  <Link
                    to="/teams/$teamId/$slug"
                    params={{ teamId: team.id, slug: slugify(team.name) }}
                    search={{ from: backPath }}
                    className="px-4 py-2 bg-league-text/[0.03] font-semibold text-sm flex items-center gap-2 hover:text-league-primary transition-colors"
                  >
                    <TeamLogo name={team.name} logoUrl={team.logoUrl} size="sm" />
                    {team.shortName}
                  </Link>
                  <div className="divide-y divide-league-text/5">
                    {lineup.map((l) => (
                      <div key={l.id} className="flex items-center px-4 py-2 text-sm">
                        <span className="w-8 text-league-text/40 tabular-nums font-medium">
                          {l.jerseyNumber ?? "-"}
                        </span>
                        <span className="flex-1">
                          <Link
                            to="/players/$playerId/$slug"
                            params={{
                              playerId: l.player.id,
                              slug: slugify(`${l.player.firstName} ${l.player.lastName}`),
                            }}
                            search={{ from: backPath }}
                            className="hover:text-league-primary transition-colors"
                          >
                            {l.player.firstName} {l.player.lastName}
                          </Link>
                        </span>
                        <span className="text-xs text-league-text/40 uppercase">{l.position}</span>
                      </div>
                    ))}
                    {lineup.length === 0 && (
                      <div className="px-4 py-4 text-sm text-league-text/40 text-center">{t.gameDetail.noLineup}</div>
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
