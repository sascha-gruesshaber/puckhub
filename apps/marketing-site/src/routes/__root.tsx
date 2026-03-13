import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { createRootRouteWithContext, HeadContent, Outlet, Scripts } from "@tanstack/react-router"
import { useState } from "react"
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
      { title: "PuckHub – Die All-in-One Plattform für Eishockey-Ligen" },
      {
        name: "description",
        content:
          "Verwalte deine Eishockey-Liga komplett digital: Saisonplanung, Spielberichte, Statistiken, Tabellen und eine eigene Liga-Website – alles in einer Plattform.",
      },
    ],
    links: [
      { rel: "stylesheet", href: marketingCss },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap",
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
            staleTime: 120_000,
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
          <Outlet />
        </QueryClientProvider>
      </trpc.Provider>
    </RootDocument>
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <head>
        <HeadContent />
      </head>
      <body className="min-h-screen font-sans">
        {children}
        <Scripts />
      </body>
    </html>
  )
}
