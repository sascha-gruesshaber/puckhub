import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { createRootRouteWithContext, HeadContent, Outlet, Scripts } from "@tanstack/react-router"
import { useState } from "react"
import { SiteLayout } from "~/components/layout/siteLayout"
import { ConfigContext, FeaturesContext, OrgContext, SeasonContext, SettingsContext, ThemeContext } from "~/lib/context"
import { generateCssVariables, resolveTheme } from "~/lib/theme"
import leagueCss from "~/styles/league.css?url"
import { createTRPCClient, trpc } from "../../lib/trpc"

export interface RouterContext {
  queryClient: QueryClient
  trpcQueryUtils?: ReturnType<typeof trpc.useUtils>
}

export const Route = createRootRouteWithContext<RouterContext>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "PuckHub" },
    ],
    links: [
      { rel: "stylesheet", href: leagueCss },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap",
      },
    ],
  }),
  component: RootComponent,
})

function RootComponent() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
            refetchOnWindowFocus: false,
          },
        },
      }),
  )
  const [trpcClient] = useState(() => createTRPCClient())

  return (
    <RootDocument>
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          <SiteDataProvider>
            <SiteLayout>
              <Outlet />
            </SiteLayout>
          </SiteDataProvider>
        </QueryClientProvider>
      </trpc.Provider>
    </RootDocument>
  )
}

function SiteDataProvider({ children }: { children: React.ReactNode }) {
  // Check for ?orgId query param (used by admin preview iframe)
  const orgIdParam = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("orgId") : null

  const isClient = typeof window !== "undefined"
  const domain = isClient ? window.location.hostname : null

  // When orgId is provided, use getConfig directly (skips isActive check for preview)
  const { data: siteDataByOrg, isLoading: isLoadingByOrg } = trpc.publicSite.getConfig.useQuery(
    { organizationId: orgIdParam! },
    { retry: false, staleTime: 300_000, enabled: !!orgIdParam },
  )

  const { data: siteDataByDomain, isLoading: isLoadingByDomain } = trpc.publicSite.resolveByDomain.useQuery(
    { domain: domain! },
    { retry: false, staleTime: 300_000, enabled: !orgIdParam && !!domain },
  )

  const siteData = orgIdParam ? siteDataByOrg : siteDataByDomain
  // During SSR, domain is null so the query is disabled — treat as loading until client hydrates
  const isLoading = orgIdParam ? isLoadingByOrg : (isLoadingByDomain || !domain)

  const orgId = siteData?.organization?.id
  const { data: seasons } = trpc.publicSite.listSeasons.useQuery(
    { organizationId: orgId! },
    { enabled: !!orgId, staleTime: 300_000 },
  )
  const { data: currentSeason } = trpc.publicSite.getCurrentSeason.useQuery(
    { organizationId: orgId! },
    { enabled: !!orgId, staleTime: 300_000 },
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
      </div>
    )
  }

  if (!siteData || !siteData.config) {
    return (
      <div className="flex items-center justify-center min-h-screen text-gray-500">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Seite nicht gefunden</h1>
          <p>Für diese Domain ist keine Website konfiguriert.</p>
        </div>
      </div>
    )
  }

  const theme = resolveTheme({
    ...siteData.config,
    layoutConfig: siteData.config.layoutConfig as any,
  })
  const cssVars = generateCssVariables(theme.colors)

  const org = {
    id: siteData.organization.id,
    name: siteData.organization.name,
    logo: siteData.organization.logo,
  }

  const settings = siteData.settings
    ? {
        leagueName: siteData.settings.leagueName,
        leagueShortName: siteData.settings.leagueShortName,
        locale: siteData.settings.locale,
        timezone: siteData.settings.timezone,
      }
    : {
        leagueName: siteData.organization.name,
        leagueShortName: siteData.organization.name,
        locale: "de-DE",
        timezone: "Europe/Berlin",
      }

  const config = {
    organizationId: siteData.config.organizationId,
    domain: siteData.config.domain,
    subdomain: siteData.config.subdomain,
    logoUrl: siteData.config.logoUrl,
    faviconUrl: siteData.config.faviconUrl,
    ogImageUrl: siteData.config.ogImageUrl,
    seoTitle: siteData.config.seoTitle,
    seoDescription: siteData.config.seoDescription,
    templatePreset: siteData.config.templatePreset,
  }

  const seasonCtx = {
    current: currentSeason ? { id: currentSeason.id, name: currentSeason.name } : null,
    all: seasons?.map((s) => ({ id: s.id, name: s.name })) ?? [],
  }

  const features = siteData.features ?? { advancedStats: false }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: cssVars }} />
      <OrgContext.Provider value={org}>
        <SettingsContext.Provider value={settings}>
          <ConfigContext.Provider value={config}>
            <ThemeContext.Provider value={theme}>
              <SeasonContext.Provider value={seasonCtx}>
                <FeaturesContext.Provider value={features}>{children}</FeaturesContext.Provider>
              </SeasonContext.Provider>
            </ThemeContext.Provider>
          </ConfigContext.Provider>
        </SettingsContext.Provider>
      </OrgContext.Provider>
    </>
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <head>
        <HeadContent />
      </head>
      <body className="min-h-screen font-sans" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
        {children}
        <Scripts />
      </body>
    </html>
  )
}
