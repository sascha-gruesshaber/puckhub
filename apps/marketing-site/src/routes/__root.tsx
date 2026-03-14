import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { createRootRouteWithContext, HeadContent, Outlet, Scripts } from "@tanstack/react-router"
import { useState } from "react"
import { LocaleProvider, useLocale, useT } from "~/i18n"
import marketingCss from "~/styles/marketing.css?url"
import { createTRPCClient, trpc } from "../../lib/trpc"

export interface RouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<RouterContext>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
    ],
    links: [{ rel: "stylesheet", href: marketingCss }],
  }),
  component: RootComponent,
})

function RootComponent() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 120_000,
            refetchOnWindowFocus: false,
          },
        },
      }),
  )
  const [trpcClient] = useState(() => createTRPCClient())

  return (
    <LocaleProvider>
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          <RootDocument>
            <Outlet />
          </RootDocument>
        </QueryClientProvider>
      </trpc.Provider>
    </LocaleProvider>
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  const locale = useLocale()
  const t = useT()

  return (
    <html lang={locale}>
      <head>
        <title>{t.meta.title}</title>
        <meta name="description" content={t.meta.description} />
        <HeadContent />
      </head>
      <body className="min-h-screen font-sans">
        {children}
        <Scripts />
      </body>
    </html>
  )
}
