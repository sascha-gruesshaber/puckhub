import { createFileRoute, Link } from "@tanstack/react-router"
import { Calendar, Trophy } from "lucide-react"
import { SectionWrapper } from "~/components/layout/sectionWrapper"
import { EmptyState } from "~/components/shared/emptyState"
import { GameCard } from "~/components/shared/gameCard"
import { GameCardSkeleton, NewsCardSkeleton, StandingsTableSkeleton } from "~/components/shared/loadingSkeleton"
import { NewsCard } from "~/components/shared/newsCard"
import { TeamLogo } from "~/components/shared/teamLogo"
import { useOrg, useSeason, useSettings, useTheme } from "~/lib/context"
import { getHomeSections } from "~/lib/theme"
import { cn } from "~/lib/utils"
import { trpc } from "../../lib/trpc"

export const Route = createFileRoute("/")({
  component: HomePage,
  head: () => ({
    meta: [{ title: "Start" }],
  }),
})

function HomePage() {
  const org = useOrg()
  const settings = useSettings()
  const theme = useTheme()
  const sections = getHomeSections(theme.layout)

  const { data, isLoading } = trpc.publicSite.getHomeData.useQuery(
    { organizationId: org.id },
    { staleTime: 60_000 },
  )

  const sectionRenderers: Record<string, () => React.ReactNode> = {
    hero: () => <HeroSection key="hero" leagueName={settings.leagueName} />,
    results: () => (
      <SectionWrapper
        key="results"
        title="Letzte Ergebnisse"
        action={
          <Link to="/schedule" className="text-sm text-web-primary hover:underline">
            Alle Ergebnisse
          </Link>
        }
      >
        {isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <GameCardSkeleton key={i} />
            ))}
          </div>
        ) : data?.latestResults && data.latestResults.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.latestResults.map((game) => (
              <GameCard
                key={game.id}
                id={game.id}
                homeTeam={game.homeTeam}
                awayTeam={game.awayTeam}
                homeScore={game.homeScore}
                awayScore={game.awayScore}
                status={game.status}
                scheduledAt={game.scheduledAt}
                round={game.round}
              />
            ))}
          </div>
        ) : (
          <EmptyState title="Noch keine Ergebnisse" icon={<Trophy className="h-8 w-8" />} />
        )}
      </SectionWrapper>
    ),
    upcoming: () => (
      <SectionWrapper
        key="upcoming"
        title="Nächste Spiele"
        className="bg-web-text/[0.02]"
        action={
          <Link to="/schedule" className="text-sm text-web-primary hover:underline">
            Gesamter Spielplan
          </Link>
        }
      >
        {isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <GameCardSkeleton key={i} />
            ))}
          </div>
        ) : data?.upcomingGames && data.upcomingGames.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.upcomingGames.map((game) => (
              <GameCard
                key={game.id}
                id={game.id}
                homeTeam={game.homeTeam}
                awayTeam={game.awayTeam}
                homeScore={game.homeScore}
                awayScore={game.awayScore}
                status={game.status}
                scheduledAt={game.scheduledAt}
                round={game.round}
              />
            ))}
          </div>
        ) : (
          <EmptyState title="Keine anstehenden Spiele" icon={<Calendar className="h-8 w-8" />} />
        )}
      </SectionWrapper>
    ),
    news: () => (
      <SectionWrapper
        key="news"
        title="Neuigkeiten"
        action={
          <Link to="/news" className="text-sm text-web-primary hover:underline">
            Alle News
          </Link>
        }
      >
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <NewsCardSkeleton key={i} />
            ))}
          </div>
        ) : data?.news && data.news.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {data.news.map((item) => (
              <NewsCard
                key={item.id}
                id={item.id}
                title={item.title}
                shortText={item.shortText}
                publishedAt={item.publishedAt}
                authorName={item.author?.name}
              />
            ))}
          </div>
        ) : (
          <EmptyState title="Keine News vorhanden" />
        )}
      </SectionWrapper>
    ),
    standings: () => (
      <SectionWrapper
        key="standings"
        title="Tabelle"
        className="bg-web-text/[0.02]"
        action={
          <Link to="/standings" className="text-sm text-web-primary hover:underline">
            Vollständige Tabelle
          </Link>
        }
      >
        {isLoading ? (
          <StandingsTableSkeleton />
        ) : data?.standings && data.standings.length > 0 ? (
          <div className="rounded-lg border border-web-text/10 bg-white overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-web-text/[0.03] text-web-text/60 text-xs uppercase tracking-wider">
                  <th className="px-4 py-2 text-left w-8">#</th>
                  <th className="px-4 py-2 text-left">Team</th>
                  <th className="px-4 py-2 text-center">Sp</th>
                  <th className="px-4 py-2 text-center hidden sm:table-cell">S</th>
                  <th className="px-4 py-2 text-center hidden sm:table-cell">U</th>
                  <th className="px-4 py-2 text-center hidden sm:table-cell">N</th>
                  <th className="px-4 py-2 text-center hidden sm:table-cell">Tore</th>
                  <th className="px-4 py-2 text-center font-bold">Pkt</th>
                </tr>
              </thead>
              <tbody>
                {data.standings.map((s, i) => (
                  <tr key={s.id} className="border-t border-web-text/5 hover:bg-web-text/[0.02]">
                    <td className="px-4 py-2 text-web-text/50 font-medium">{i + 1}</td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        <TeamLogo name={s.team.name} logoUrl={s.team.logoUrl} size="sm" />
                        <span className="font-medium">{s.team.shortName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2 text-center tabular-nums">{s.gamesPlayed}</td>
                    <td className="px-4 py-2 text-center tabular-nums hidden sm:table-cell">{s.wins}</td>
                    <td className="px-4 py-2 text-center tabular-nums hidden sm:table-cell">{s.draws}</td>
                    <td className="px-4 py-2 text-center tabular-nums hidden sm:table-cell">{s.losses}</td>
                    <td className="px-4 py-2 text-center tabular-nums hidden sm:table-cell">
                      {s.goalsFor}:{s.goalsAgainst}
                    </td>
                    <td className="px-4 py-2 text-center font-bold tabular-nums">{s.totalPoints}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="Noch keine Tabellendaten" />
        )}
      </SectionWrapper>
    ),
    sponsors: () => {
      if (!data?.sponsors || data.sponsors.length === 0) return null
      return (
        <SectionWrapper key="sponsors" title="Sponsoren">
          <div className="flex flex-wrap items-center justify-center gap-8">
            {data.sponsors.map((sponsor) => (
              <a
                key={sponsor.id}
                href={sponsor.websiteUrl ?? "#"}
                target="_blank"
                rel="noopener noreferrer"
                title={sponsor.hoverText ?? sponsor.name}
                className="opacity-60 hover:opacity-100 transition-opacity"
              >
                {sponsor.logoUrl ? (
                  <img src={sponsor.logoUrl} alt={sponsor.name} className="h-12 max-w-[160px] object-contain" />
                ) : (
                  <span className="text-lg font-medium text-web-text/50">{sponsor.name}</span>
                )}
              </a>
            ))}
          </div>
        </SectionWrapper>
      )
    },
  }

  return (
    <div className="animate-fade-in">
      {sections.map((section) => {
        const renderer = sectionRenderers[section.id]
        return renderer ? renderer() : null
      })}
    </div>
  )
}

function HeroSection({ leagueName }: { leagueName: string }) {
  return (
    <section className="relative bg-web-header-bg text-web-header-text">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight mb-4">{leagueName}</h1>
        <p className="text-lg sm:text-xl text-web-header-text/70 max-w-2xl">
          Aktuelle Ergebnisse, Tabellen, Spielpläne und News
        </p>
        <div className="mt-8 flex gap-3">
          <Link
            to="/standings"
            className="inline-flex items-center gap-2 rounded-lg bg-web-primary px-5 py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90"
          >
            <Trophy className="h-4 w-4" />
            Tabelle
          </Link>
          <Link
            to="/schedule"
            className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-5 py-2.5 text-sm font-semibold transition-all hover:bg-white/20"
          >
            <Calendar className="h-4 w-4" />
            Spielplan
          </Link>
        </div>
      </div>
    </section>
  )
}
