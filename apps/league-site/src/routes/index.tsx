import { createFileRoute, Link, useSearch } from "@tanstack/react-router"
import { ArrowRight, Calendar, Loader2, Sparkles, Trophy } from "lucide-react"
import { SectionWrapper } from "~/components/layout/sectionWrapper"
import { EmptyState } from "~/components/shared/emptyState"
import { GameCardSkeleton, Skeleton, StandingsTableSkeleton } from "~/components/shared/loadingSkeleton"
import { ScoreBadge } from "~/components/shared/scoreBadge"
import { TeamLogo } from "~/components/shared/teamLogo"
import { useFilterNavigate } from "~/hooks/useFilterNavigate"
import { useFeatures, useOrg, useSettings, useTheme } from "~/lib/context"
import { type Translations, useT } from "~/lib/i18n"
import { getHomeSections } from "~/lib/theme"
import { formatDate, formatTime, slugify } from "~/lib/utils"
import { trpc } from "../../lib/trpc"

const NEWS_PAGE_SIZE = 20

const searchValidator = (s: Record<string, unknown>): { n?: number } => ({
  ...(typeof s.n === "number" && s.n > 0 ? { n: Math.min(Math.ceil(s.n / NEWS_PAGE_SIZE) * NEWS_PAGE_SIZE, 200) } : {}),
})

export const Route = createFileRoute("/")({
  component: HomePage,
  head: () => ({}),
  validateSearch: searchValidator,
})

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GameData {
  id: string
  homeTeam: { id: string; name: string; shortName: string; logoUrl: string | null }
  awayTeam: { id: string; name: string; shortName: string; logoUrl: string | null }
  homeScore: number | null
  awayScore: number | null
  status: string
  scheduledAt: Date | string | null
  round: { name: string; division: { name: string } | null } | null
}

interface NewsItem {
  id: string
  title: string
  shortText?: string | null
  publishedAt: Date | string | null
  author?: { name: string | null } | null
}

// ---------------------------------------------------------------------------
// Hero + Game Ticker
// ---------------------------------------------------------------------------

function HeroSection({
  leagueName,
  latestResult,
  nextGame,
}: {
  leagueName: string
  latestResult?: GameData | null
  nextGame?: GameData | null
}) {
  const t = useT()
  return (
    <section className="relative bg-league-header-bg text-league-header-text">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight mb-3">{leagueName}</h1>
        <p className="text-base sm:text-lg text-league-header-text/70 max-w-2xl mb-6">{t.home.subtitle}</p>
        <div className="flex gap-3 mb-8">
          <Link
            to="/standings"
            className="inline-flex items-center gap-2 rounded-lg bg-league-primary px-4 py-2 text-sm font-semibold text-white transition-all hover:opacity-90"
          >
            <Trophy className="h-4 w-4" />
            {t.home.standings}
          </Link>
          <Link
            to="/schedule"
            className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold transition-all hover:bg-white/20"
          >
            <Calendar className="h-4 w-4" />
            {t.home.schedule}
          </Link>
        </div>

        {/* Game ticker */}
        {(latestResult || nextGame) && (
          <div className="flex flex-col sm:flex-row gap-3">
            {latestResult && <TickerCard game={latestResult} label={t.home.latestResult} />}
            {nextGame && <TickerCard game={nextGame} label={t.home.nextGame} />}
          </div>
        )}
      </div>
    </section>
  )
}

function TickerCard({ game, label }: { game: GameData; label: string }) {
  return (
    <Link
      to="/schedule/$gameId"
      params={{ gameId: game.id }}
      className="flex items-center gap-3 rounded-lg bg-white/10 backdrop-blur-sm px-4 py-2.5 hover:bg-white/15 transition-colors min-w-0"
    >
      <span className="text-[10px] font-semibold uppercase tracking-wider text-league-header-text/50 shrink-0">
        {label}
      </span>
      <div className="flex items-center gap-2 min-w-0">
        <TeamLogo name={game.homeTeam.name} logoUrl={game.homeTeam.logoUrl} size="sm" />
        <span className="text-xs font-medium truncate">{game.homeTeam.shortName}</span>
        <ScoreBadge
          homeScore={game.homeScore}
          awayScore={game.awayScore}
          status={game.status}
          size="sm"
          className="shrink-0"
        />
        <span className="text-xs font-medium truncate">{game.awayTeam.shortName}</span>
        <TeamLogo name={game.awayTeam.name} logoUrl={game.awayTeam.logoUrl} size="sm" />
      </div>
      {game.scheduledAt && game.status === "scheduled" && (
        <span className="text-[10px] text-league-header-text/40 shrink-0 hidden sm:inline">
          {formatDate(game.scheduledAt).slice(0, 6)} {formatTime(game.scheduledAt)}
        </span>
      )}
    </Link>
  )
}

// ---------------------------------------------------------------------------
// News Components
// ---------------------------------------------------------------------------

function getMonthKey(date: Date | string | null, t: Translations): string {
  if (!date) return t.common.noDate
  const d = typeof date === "string" ? new Date(date) : date
  return `${t.months[d.getMonth()]} ${d.getFullYear()}`
}

function groupByMonth(items: NewsItem[], t: Translations): Map<string, NewsItem[]> {
  const grouped = new Map<string, NewsItem[]>()
  for (const item of items) {
    const key = getMonthKey(item.publishedAt, t)
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key)!.push(item)
  }
  return grouped
}

function FeaturedNews({ item }: { item: NewsItem }) {
  const t = useT()
  return (
    <Link
      to="/news/$newsId/$slug"
      params={{ newsId: item.id, slug: slugify(item.title) }}
      className="group block rounded-xl border border-league-text/10 bg-league-surface overflow-hidden transition-all hover:shadow-lg hover:border-league-primary/30"
    >
      <div className="p-5 sm:p-6">
        <div className="flex items-center gap-2 text-xs font-medium text-league-primary mb-2">
          <span className="inline-flex items-center rounded-full bg-league-primary/10 px-2.5 py-0.5">
            {t.common.current}
          </span>
          {item.publishedAt && <span className="text-league-text/40">{formatDate(item.publishedAt)}</span>}
        </div>
        <h3 className="text-xl sm:text-2xl font-extrabold leading-tight mb-2 group-hover:text-league-primary transition-colors">
          {item.title}
        </h3>
        {item.shortText && (
          <p className="text-sm text-league-text/60 leading-relaxed mb-3 line-clamp-3">{item.shortText}</p>
        )}
        <div className="flex items-center justify-between">
          <div className="text-xs text-league-text/40">{item.author?.name && <span>{item.author.name}</span>}</div>
          <span className="inline-flex items-center gap-1 text-sm font-medium text-league-primary group-hover:gap-2 transition-all">
            {t.common.readMore} <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>
    </Link>
  )
}

function NewsListItem({ item }: { item: NewsItem }) {
  return (
    <Link
      to="/news/$newsId/$slug"
      params={{ newsId: item.id, slug: slugify(item.title) }}
      className="group flex gap-4 py-4 transition-colors"
    >
      <div className="shrink-0 w-16 pt-0.5 text-right">
        <span className="text-xs text-league-text/40 tabular-nums">
          {item.publishedAt ? formatDate(item.publishedAt).slice(0, 6) : ""}
        </span>
      </div>
      <div className="min-w-0 flex-1 border-l border-league-text/10 pl-4">
        <h4 className="font-semibold text-[15px] leading-snug group-hover:text-league-primary transition-colors line-clamp-2">
          {item.title}
        </h4>
        {item.shortText && <p className="text-sm text-league-text/50 mt-1 line-clamp-2">{item.shortText}</p>}
        {item.author?.name && <span className="text-xs text-league-text/30 mt-1 inline-block">{item.author.name}</span>}
      </div>
    </Link>
  )
}

function MonthGroup({ label, items }: { label: string; items: NewsItem[] }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <Calendar className="h-4 w-4 text-league-text/30" />
        <h2 className="text-sm font-semibold text-league-text/50 uppercase tracking-wider">{label}</h2>
      </div>
      <div className="divide-y divide-league-text/5">
        {items.map((item) => (
          <NewsListItem key={item.id} item={item} />
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sidebar Components
// ---------------------------------------------------------------------------

function SidebarStandings({ standings }: { standings: any[] }) {
  const t = useT()
  if (standings.length === 0) return null
  return (
    <div className="rounded-xl border border-league-text/10 bg-league-surface overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-league-text/5">
        <h3 className="text-sm font-bold">{t.home.standings}</h3>
        <Link to="/standings" className="text-xs text-league-primary hover:underline">
          {t.home.full}
        </Link>
      </div>
      <table className="w-full text-xs">
        <thead>
          <tr className="text-league-text/50 text-[10px] uppercase tracking-wider">
            <th className="px-3 py-1.5 text-left w-6">#</th>
            <th className="px-1 py-1.5 text-left">Team</th>
            <th className="px-2 py-1.5 text-center">{t.abbr.gp}</th>
            <th className="px-2 py-1.5 text-center font-bold">{t.abbr.pts}</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((s, i) => (
            <tr key={s.id} className="border-t border-league-text/5">
              <td className="px-3 py-1.5 text-league-text/40 font-medium">{i + 1}</td>
              <td className="px-1 py-1.5">
                <Link
                  to="/teams/$teamId/$slug"
                  params={{ teamId: s.team.id, slug: slugify(s.team.name) }}
                  search={{ from: "/" }}
                  className="flex items-center gap-1.5 hover:text-league-primary transition-colors"
                >
                  <TeamLogo name={s.team.name} logoUrl={s.team.logoUrl} size="sm" />
                  <span className="font-medium truncate">{s.team.shortName}</span>
                </Link>
              </td>
              <td className="px-2 py-1.5 text-center tabular-nums text-league-text/60">{s.gamesPlayed}</td>
              <td className="px-2 py-1.5 text-center font-bold tabular-nums">{s.totalPoints}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function SidebarUpcoming({ games }: { games: GameData[] }) {
  const t = useT()
  if (games.length === 0) return null
  return (
    <div className="rounded-xl border border-league-text/10 bg-league-surface overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-league-text/5">
        <h3 className="text-sm font-bold">{t.home.upcomingGames}</h3>
        <Link to="/schedule" className="text-xs text-league-primary hover:underline">
          {t.home.schedule}
        </Link>
      </div>
      <div className="divide-y divide-league-text/5">
        {games.slice(0, 4).map((game) => (
          <Link
            key={game.id}
            to="/schedule/$gameId"
            params={{ gameId: game.id }}
            className="flex items-center gap-2 px-4 py-2.5 hover:bg-league-text/[0.02] transition-colors"
          >
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <TeamLogo name={game.homeTeam.name} logoUrl={game.homeTeam.logoUrl} size="sm" />
              <span className="text-xs font-medium truncate">{game.homeTeam.shortName}</span>
              <span className="text-[10px] text-league-text/30 mx-0.5">vs</span>
              <span className="text-xs font-medium truncate">{game.awayTeam.shortName}</span>
              <TeamLogo name={game.awayTeam.name} logoUrl={game.awayTeam.logoUrl} size="sm" />
            </div>
            {game.scheduledAt && (
              <span className="text-[10px] text-league-text/40 tabular-nums shrink-0">
                {formatDate(game.scheduledAt).slice(0, 6)}
              </span>
            )}
          </Link>
        ))}
      </div>
    </div>
  )
}

function SidebarResults({ games }: { games: GameData[] }) {
  const t = useT()
  if (games.length === 0) return null
  return (
    <div className="rounded-xl border border-league-text/10 bg-league-surface overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-league-text/5">
        <h3 className="text-sm font-bold">{t.home.results}</h3>
        <Link to="/schedule" search={{ status: "completed" }} className="text-xs text-league-primary hover:underline">
          {t.common.all}
        </Link>
      </div>
      <div className="divide-y divide-league-text/5">
        {games.slice(0, 4).map((game) => (
          <Link
            key={game.id}
            to="/schedule/$gameId"
            params={{ gameId: game.id }}
            className="flex items-center gap-2 px-4 py-2.5 hover:bg-league-text/[0.02] transition-colors"
          >
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <TeamLogo name={game.homeTeam.name} logoUrl={game.homeTeam.logoUrl} size="sm" />
              <span className="text-xs font-medium truncate">{game.homeTeam.shortName}</span>
              <ScoreBadge
                homeScore={game.homeScore}
                awayScore={game.awayScore}
                status={game.status}
                size="sm"
                className="shrink-0 !text-xs !px-1.5 !py-0"
              />
              <span className="text-xs font-medium truncate">{game.awayTeam.shortName}</span>
              <TeamLogo name={game.awayTeam.name} logoUrl={game.awayTeam.logoUrl} size="sm" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// AI Widget Components
// ---------------------------------------------------------------------------

interface AiWidgetData {
  widgetType: string
  content: string
  generatedAt: Date | string
}

function AiWidgetCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-league-primary/20 bg-league-surface overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-league-text/5 bg-league-primary/5">
        <Sparkles className="h-3.5 w-3.5 text-league-primary" />
        <h3 className="text-sm font-bold text-league-primary">{title}</h3>
      </div>
      <div className="px-4 py-3 text-sm leading-relaxed">{children}</div>
    </div>
  )
}

function renderMarkdown(md: string): string {
  return md
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/^### (.+)$/gm, '<h4 class="font-semibold text-base mt-3 mb-1">$1</h4>')
    .replace(/^## (.+)$/gm, '<h3 class="font-bold text-lg mt-4 mb-1.5">$1</h3>')
    .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc">$1</li>')
    .replace(/(<li[^>]*>.*<\/li>\n?)+/g, (m) => `<ul class="my-1.5">${m}</ul>`)
    .split(/\n{2,}/)
    .map((block) => {
      const trimmed = block.trim()
      if (!trimmed || trimmed.startsWith("<h") || trimmed.startsWith("<ul")) return trimmed
      return `<p class="mb-2">${trimmed}</p>`
    })
    .join("\n")
}

function AiContent({ content }: { content: string }) {
  const html = renderMarkdown(content)
  return (
    <div
      dangerouslySetInnerHTML={{ __html: html }}
      className="prose-sm max-w-none [&>p:last-child]:mb-0 [&_strong]:font-bold [&_em]:italic"
    />
  )
}

function LeaguePulseWidget({ widget }: { widget: AiWidgetData }) {
  const t = useT()
  return (
    <AiWidgetCard title={t.home.widgetLeaguePulse ?? "League Pulse"}>
      <AiContent content={widget.content} />
    </AiWidgetCard>
  )
}

function HeadlinesTickerWidget({ widget }: { widget: AiWidgetData }) {
  let headlines: string[] = []
  try {
    headlines = JSON.parse(widget.content)
  } catch {
    return null
  }
  if (headlines.length === 0) return null

  // Duplicate items for seamless loop
  const items = [...headlines, ...headlines]

  return (
    <div className="bg-league-header-bg text-league-header-text overflow-hidden">
      <div className="relative flex items-center py-2">
        <div className="shrink-0 pl-4 pr-3 z-10 bg-league-header-bg">
          <Sparkles className="h-3.5 w-3.5 text-league-primary" />
        </div>
        <div className="overflow-hidden flex-1">
          <div className="flex items-center gap-8 text-xs font-medium whitespace-nowrap animate-marquee">
            {items.map((headline, i) => (
              <span key={i} className="flex items-center gap-4 shrink-0">
                <span className="text-league-header-text/20">|</span>
                {headline}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

function HomePage() {
  const org = useOrg()
  const settings = useSettings()
  const theme = useTheme()
  const t = useT()
  const features = useFeatures()
  const filterNavigate = useFilterNavigate()
  const sections = getHomeSections(theme.layout)
  const showSponsors = sections.some((s) => s.id === "sponsors")
  const { n: newsCount } = useSearch({ strict: false }) as { n?: number }
  const limit = newsCount ?? NEWS_PAGE_SIZE

  const { data, isLoading } = trpc.publicSite.getHomeData.useQuery({ organizationId: org.id }, { staleTime: 60_000 })

  const {
    data: newsData,
    isLoading: newsLoading,
    isFetching: newsFetching,
  } = trpc.publicSite.listNews.useQuery({ organizationId: org.id, limit }, { staleTime: 60_000 })

  const allNews: NewsItem[] = newsData?.items ?? []
  const hasMoreNews = !!newsData?.nextCursor
  const standings = data?.standings ?? []
  const results = data?.latestResults ?? []
  const upcoming = data?.upcomingGames ?? []

  // AI widgets lookup
  const aiWidgets = data?.aiWidgets ?? []
  const widgetMap = new Map(aiWidgets.map((w: AiWidgetData) => [w.widgetType, w]))
  const headlinesWidget = features.aiWidgetHeadlinesTicker ? widgetMap.get("headlines_ticker") : null
  const leaguePulseWidget = features.aiWidgetLeaguePulse ? widgetMap.get("league_pulse_digest") : null

  const [featuredNews, ...restNews] = allNews
  const monthGroups = groupByMonth(restNews, t)

  const loadMore = () => {
    filterNavigate({ search: (p: any) => ({ ...p, n: limit + NEWS_PAGE_SIZE }) })
  }

  return (
    <div className="animate-fade-in">
      {/* Hero with game ticker */}
      <HeroSection leagueName={settings.leagueName} latestResult={results[0]} nextGame={upcoming[0]} />

      {/* Headlines ticker — horizontal strip below hero */}
      {headlinesWidget && <HeadlinesTickerWidget widget={headlinesWidget} />}

      {/* Main content area */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {isLoading || newsLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              <div className="rounded-xl border border-league-text/10 bg-league-surface p-6">
                <Skeleton className="h-4 w-20 mb-3" />
                <Skeleton className="h-7 w-3/4 mb-2" />
                <Skeleton className="h-7 w-1/2 mb-3" />
                <Skeleton className="h-4 w-full mb-1" />
                <Skeleton className="h-4 w-2/3" />
              </div>
              {Array.from({ length: 3 }).map((_, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: static placeholder items
                <div key={i} className="flex gap-3 py-3">
                  <Skeleton className="h-4 w-14 shrink-0" />
                  <div className="flex-1 border-l border-league-text/10 pl-3">
                    <Skeleton className="h-4 w-3/4 mb-1" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                </div>
              ))}
            </div>
            <div className="space-y-4">
              <StandingsTableSkeleton />
              {Array.from({ length: 3 }).map((_, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: static placeholder items
                <GameCardSkeleton key={i} />
              ))}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left column: News + AI widgets */}
            <div className="lg:col-span-2">
              {/* League Pulse Digest — before news */}
              {leaguePulseWidget && (
                <div className="mb-8">
                  <LeaguePulseWidget widget={leaguePulseWidget} />
                </div>
              )}

              {allNews.length > 0 ? (
                <div className="space-y-8">
                  {featuredNews && <FeaturedNews item={featuredNews} />}

                  {/* Month-grouped news list */}
                  {Array.from(monthGroups.entries()).map(([month, items]) => (
                    <MonthGroup key={month} label={month} items={items} />
                  ))}

                  {/* Load more */}
                  {hasMoreNews && (
                    <div className="text-center pt-2">
                      <button
                        type="button"
                        onClick={loadMore}
                        disabled={newsFetching}
                        className="inline-flex items-center gap-2 rounded-lg bg-league-primary px-6 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                      >
                        {newsFetching ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            {t.common.loading}
                          </>
                        ) : (
                          t.news.loadMore
                        )}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <EmptyState title={t.home.noNews} description={t.home.noNewsDesc} />
              )}

            </div>

            {/* Right column: Sidebar */}
            <div className="space-y-4 lg:sticky lg:top-20 lg:self-start">
              <SidebarStandings standings={standings} />
              <SidebarUpcoming games={upcoming} />
              <SidebarResults games={results} />
            </div>
          </div>
        )}
      </div>

      {/* Sponsors */}
      {showSponsors && data?.sponsors && data.sponsors.length > 0 && (
        <SectionWrapper title={t.home.sponsors}>
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
                  <span className="text-lg font-medium text-league-text/50">{sponsor.name}</span>
                )}
              </a>
            ))}
          </div>
        </SectionWrapper>
      )}
    </div>
  )
}
