import { Toaster } from "@puckhub/ui"
import appCss from "@puckhub/ui/globals.css?url"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router"
import { useState } from "react"
import { IntlayerProvider } from "react-intlayer"
import { LocaleSync } from "~/components/localeSync"
import { createTRPCClient, trpc } from "../../lib/trpc"

export const Route = createRootRoute({
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
  const [queryClient] = useState(() => new QueryClient())
  const [trpcClient] = useState(() => createTRPCClient())

  return (
    <RootDocument>
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          <IntlayerProvider>
            <LocaleSync />
            <Outlet />
          </IntlayerProvider>
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
