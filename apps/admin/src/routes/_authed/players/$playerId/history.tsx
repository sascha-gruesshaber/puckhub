import { Badge, Card, CardContent, Skeleton } from "@puckhub/ui"
import { createFileRoute, Link } from "@tanstack/react-router"
import { ArrowLeft, Calendar, ScrollText, Trophy, Users } from "lucide-react"
import { useMemo } from "react"
import { trpc } from "@/trpc"
import { EmptyState } from "~/components/emptyState"
import type { Contract } from "~/components/playerTimeline/playerTimeline"
import { PlayerTimeline, TimelineSkeleton } from "~/components/playerTimeline/playerTimeline"
import { useTranslation } from "~/i18n/use-translation"

export const Route = createFileRoute("/_authed/players/$playerId/history")({
  component: PlayerHistoryPage,
})

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

function PlayerHistoryPage() {
  const { t } = useTranslation("common")
  const { playerId } = Route.useParams()

  const { data: player, isLoading: playerLoading } = trpc.player.getById.useQuery({ id: playerId })
  const { data: rawContracts, isLoading: contractsLoading } = trpc.contract.getByPlayer.useQuery({ playerId })

  const isLoading = playerLoading || contractsLoading

  // Cast raw contracts so dates are correct
  const contracts = rawContracts as Contract[] | undefined

  // Career summary stats
  const stats = useMemo(() => {
    if (!contracts || contracts.length === 0) return null

    const teamIds = new Set(contracts.map((c) => c.teamId))
    const years = contracts.map((c) => new Date(c.startSeason.seasonStart).getUTCFullYear())
    const careerStart = Math.min(...years)

    return {
      contractCount: contracts.length,
      teamCount: teamIds.size,
      careerStart,
    }
  }, [contracts])

  // Compute age
  const age = useMemo(() => {
    if (!player?.dateOfBirth) return null
    const dob = new Date(player.dateOfBirth)
    const today = new Date()
    let a = today.getFullYear() - dob.getFullYear()
    const m = today.getMonth() - dob.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) a--
    return a
  }, [player?.dateOfBirth])

  // Not found
  if (!isLoading && !player) {
    return (
      <div className="space-y-6">
        <Link
          to="/players"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("playersPage.history.backToPlayers")}
        </Link>
        <EmptyState
          icon={<Users className="h-8 w-8" style={{ color: "hsl(var(--accent))" }} strokeWidth={1.5} />}
          title={t("playersPage.history.notFoundTitle")}
          description={t("playersPage.history.notFoundDescription")}
        />
      </div>
    )
  }

  const initials = player ? `${player.firstName[0] || ""}${player.lastName[0] || ""}`.toUpperCase() : ""

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        to="/players"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("playersPage.history.backToPlayers")}
      </Link>

      {/* Profile header card */}
      {isLoading ? (
        <ProfileSkeleton />
      ) : player ? (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start gap-5">
              {/* Photo */}
              <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted">
                {player.photoUrl ? (
                  <img
                    src={player.photoUrl}
                    alt={`${player.firstName} ${player.lastName}`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-2xl font-bold text-muted-foreground">{initials}</span>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-bold truncate">
                  {player.firstName} {player.lastName}
                </h1>

                {/* Meta row */}
                <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground flex-wrap">
                  {age !== null && <span>{t("playersPage.history.ageYears", { age })}</span>}
                  {age !== null && player.nationality && <span>&middot;</span>}
                  {player.nationality && <span>{player.nationality}</span>}
                  {(age !== null || player.nationality) && player.dateOfBirth && <span>&middot;</span>}
                  {player.dateOfBirth && (
                    <span>
                      {new Date(player.dateOfBirth).toLocaleDateString("de-DE", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      })}
                    </span>
                  )}
                </div>

                {/* Career summary badges */}
                {stats && (
                  <div className="flex items-center gap-2 mt-3 flex-wrap">
                    <Badge variant="secondary" className="text-xs gap-1">
                      <ScrollText className="h-3 w-3" />
                      {t("playersPage.history.contractCount", { count: stats.contractCount })}
                    </Badge>
                    <Badge variant="secondary" className="text-xs gap-1">
                      <Trophy className="h-3 w-3" />
                      {t("playersPage.history.teamCount", { count: stats.teamCount })}
                    </Badge>
                    <Badge variant="secondary" className="text-xs gap-1">
                      <Calendar className="h-3 w-3" />
                      {t("playersPage.history.sinceYear", { year: stats.careerStart })}
                    </Badge>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Timeline */}
      {isLoading ? (
        <TimelineSkeleton />
      ) : contracts && contracts.length > 0 ? (
        <PlayerTimeline contracts={contracts} />
      ) : (
        <EmptyState
          icon={<ScrollText className="h-8 w-8" style={{ color: "hsl(var(--accent))" }} strokeWidth={1.5} />}
          title={t("playersPage.history.noContractsTitle")}
          description={t("playersPage.history.noContractsDescription")}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Profile Skeleton
// ---------------------------------------------------------------------------

function ProfileSkeleton() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start gap-5">
          <Skeleton className="h-20 w-20 shrink-0 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-6 w-48 rounded" />
            <Skeleton className="h-4 w-36 rounded" />
            <div className="flex gap-2 mt-3">
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
