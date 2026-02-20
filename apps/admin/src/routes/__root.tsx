import { Toaster } from "@puckhub/ui"
import appCss from "@puckhub/ui/globals.css?url"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { createRootRouteWithContext, HeadContent, Outlet, Scripts, useRouter } from "@tanstack/react-router"
import { useEffect, useState } from "react"
import { LocaleSync } from "~/components/localeSync"
import { LocaleProvider } from "~/i18n/locale-context"
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
      { title: "PuckHub Admin" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap",
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
            staleTime: 30_000,
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
          <InjectRouterContext />
          <LocaleProvider>
            <LocaleSync />
            <Outlet />
          </LocaleProvider>
        </QueryClientProvider>
      </trpc.Provider>
    </RootDocument>
  )
}

function InjectRouterContext() {
  const router = useRouter()
  const trpcQueryUtils = trpc.useUtils()

  useEffect(() => {
    Object.assign(router.options.context, { trpcQueryUtils })
  }, [router, trpcQueryUtils])

  return null
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <head>
        <HeadContent />
      </head>
      <body
        className="min-h-screen bg-background font-sans antialiased"
        style={{ fontFamily: "'Outfit', system-ui, sans-serif" }}
      >
        {children}
        <Toaster />
        <Scripts />
      </body>
    </html>
  )
}
