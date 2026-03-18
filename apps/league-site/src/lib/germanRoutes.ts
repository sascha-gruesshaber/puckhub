import type { AnyRoute } from "@tanstack/react-router"
import { createRoute, redirect } from "@tanstack/react-router"
import { lazy } from "react"

/** Pass-through search validator – keeps any string-valued query params. */
const passthrough = (s: Record<string, unknown>): Record<string, string> => {
  const r: Record<string, string> = {}
  for (const [k, v] of Object.entries(s)) {
    if (typeof v === "string" && v) r[k] = v
  }
  return r
}

type RouteDef = {
  en: string
  de: string
  title: string
  mod: () => Promise<any>
  name: string
  search?: boolean
  redirect?: { to: string; search?: Record<string, string> }
}

/**
 * All German route alias definitions – single source of truth for locale routing.
 * To add a new locale, duplicate this array with translated paths.
 */
const ROUTE_DEFS: RouteDef[] = [
  {
    en: "/standings",
    de: "/tabelle",
    title: "Tabelle",
    mod: () => import("../routes/standings"),
    name: "StandingsPage",
    search: true,
  },
  {
    en: "/schedule",
    de: "/spielplan",
    title: "Spielplan",
    mod: () => import("../routes/schedule/index"),
    name: "SchedulePage",
    search: true,
  },
  {
    en: "/structure",
    de: "/struktur",
    title: "Saisonstruktur",
    mod: () => import("../routes/structure"),
    name: "StructurePage",
    search: true,
  },
  {
    en: "/schedule/$gameId",
    de: "/spielplan/$gameId",
    title: "Spieldetails",
    mod: () => import("../routes/schedule/$gameId"),
    name: "GameDetailPage",
  },
  {
    en: "/news/$newsId",
    de: "/neuigkeiten/$newsId",
    title: "Artikel",
    mod: () => import("../routes/news/$newsId"),
    name: "NewsDetailPage",
  },
  {
    en: "/news/$newsId/$slug",
    de: "/neuigkeiten/$newsId/$slug",
    title: "Artikel",
    mod: () => import("../routes/news/$newsId"),
    name: "NewsDetailPage",
  },
  {
    en: "/stats",
    de: "/statistiken",
    title: "Statistiken",
    mod: () => import("../routes/stats/index"),
    name: "StatsIndex",
    search: true,
  },
  {
    en: "/stats/scorers",
    de: "/statistiken/scorer",
    title: "Scorer-Statistiken",
    mod: () => import("../routes/stats/scorers"),
    name: "ScorersPage",
    search: true,
  },
  {
    en: "/stats/goals",
    de: "/statistiken/tore",
    title: "Torstatistiken",
    mod: () => import("../routes/stats/goals"),
    name: "GoalsPage",
    search: true,
  },
  {
    en: "/stats/assists",
    de: "/statistiken/vorlagen",
    title: "Vorlagen-Statistiken",
    mod: () => import("../routes/stats/assists"),
    name: "AssistsPage",
    search: true,
  },
  {
    en: "/stats/penalties",
    de: "/statistiken/strafen",
    title: "Strafstatistiken",
    mod: () => import("../routes/stats/penalties"),
    name: "PenaltiesPage",
    search: true,
  },
  {
    en: "/stats/goalies",
    de: "/statistiken/torhueter",
    title: "Torhüter-Statistiken",
    mod: () => import("../routes/stats/goalies"),
    name: "GoaliesPage",
    search: true,
  },
  {
    en: "/stats/compare-teams",
    de: "/statistiken/teamvergleich",
    title: "Teamvergleich",
    mod: () => import("../routes/stats/compare-teams"),
    name: "ComparisonPage",
    search: true,
  },
  {
    en: "/players/$playerId",
    de: "/spieler/$playerId",
    title: "Spieler",
    mod: () => import("../routes/players/$playerId"),
    name: "PlayerHistoryPage",
    search: true,
  },
  {
    en: "/players/$playerId/$slug",
    de: "/spieler/$playerId/$slug",
    title: "Spieler",
    mod: () => import("../routes/players/$playerId"),
    name: "PlayerHistoryPage",
    search: true,
  },
  {
    en: "/stats/teams/$teamId",
    de: "/statistiken/teams/$teamId",
    title: "",
    mod: () => Promise.resolve({}),
    name: "",
    redirect: { to: "/teams/$teamId", search: { tab: "history" } },
  },
]

/** English→German path mapping, derived from ROUTE_DEFS. Used by localizedRoutes.ts. */
export const DE_PATH_MAP: Record<string, string> = Object.fromEntries(ROUTE_DEFS.map((r) => [r.en, r.de]))

/**
 * Registers all German locale route aliases on the root route.
 * Safe to call multiple times (idempotent).
 */
const registered = new WeakSet<AnyRoute>()
export function registerGermanRoutes(rootRoute: AnyRoute) {
  if (registered.has(rootRoute)) return
  registered.add(rootRoute)

  const routes: Record<string, AnyRoute> = {}

  for (const def of ROUTE_DEFS) {
    if (def.redirect) {
      routes[def.de] = createRoute({
        getParentRoute: () => rootRoute,
        path: def.de as any,
        beforeLoad: ({ params }: any) => {
          throw redirect({ to: def.redirect!.to as any, params, search: def.redirect!.search as any })
        },
      })
    } else {
      routes[def.de] = createRoute({
        getParentRoute: () => rootRoute,
        path: def.de as any,
        component: lazy(() => def.mod().then((m: any) => ({ default: m[def.name] }))),
        head: () => ({ meta: [{ title: def.title }] }),
        ...(def.search ? { validateSearch: passthrough } : {}),
      })
    }
  }

  // Append German routes to the existing file-based children array
  const existing: AnyRoute[] = (rootRoute as any).children ?? []
  ;(rootRoute as any).children = [...existing, ...Object.values(routes)]
}
