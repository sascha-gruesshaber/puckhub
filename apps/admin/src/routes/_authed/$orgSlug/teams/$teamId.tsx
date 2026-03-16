import {
  Badge,
  Button,
  FormField,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Sheet,
  SheetBody,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  Skeleton,
  toast,
} from "@puckhub/ui"
import { createFileRoute, Link, useParams } from "@tanstack/react-router"
import {
  ArrowLeft,
  Building2,
  Calendar,
  ExternalLink,
  Globe,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Shield,
  Trophy,
  User,
  Users,
} from "lucide-react"
import { useMemo, useState } from "react"
import { trpc } from "@/trpc"
import { EmptyState } from "~/components/emptyState"
import { ImageUpload } from "~/components/imageUpload"
import { EditContractDialog } from "~/components/roster/editContractDialog"
import { ReleasePlayerDialog } from "~/components/roster/releasePlayerDialog"
import type { ContractRow } from "~/components/roster/rosterTable"
import { RosterTable } from "~/components/roster/rosterTable"
import { SignPlayerDialog } from "~/components/roster/signPlayerDialog"
import { TransferDialog } from "~/components/roster/transferDialog"
import { usePermissionGuard } from "~/contexts/permissionsContext"
import { useWorkingSeason } from "~/contexts/seasonContext"
import { useTranslation } from "~/i18n/use-translation"
import { resolveTranslatedError } from "~/lib/errorI18n"

export const Route = createFileRoute("/_authed/$orgSlug/teams/$teamId")({
  component: TeamDetailPage,
})

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface TeamForm {
  name: string
  shortName: string
  city: string
  homeVenue: string
  logoUrl: string
  teamPhotoUrl: string
  contactName: string
  contactEmail: string
  contactPhone: string
  website: string
}

const emptyForm: TeamForm = {
  name: "",
  shortName: "",
  city: "",
  homeVenue: "",
  logoUrl: "",
  teamPhotoUrl: "",
  contactName: "",
  contactEmail: "",
  contactPhone: "",
  website: "",
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
function TeamDetailPage() {
  usePermissionGuard("teams")
  const { orgSlug } = useParams({ strict: false }) as { orgSlug: string }
  const { t } = useTranslation("common")
  const { t: tErrors } = useTranslation("errors")
  const { teamId } = Route.useParams()
  const { season: workingSeason } = useWorkingSeason()

  // --- Data ---
  const { data: historyData, isLoading: historyLoading } = trpc.team.history.useQuery({ teamId })
  const { data: fullTeam } = trpc.team.getById.useQuery({ id: teamId })
  const { data: allSeasons } = trpc.season.list.useQuery()

  // Selected season for roster (default to working season)
  const [selectedSeasonId, setSelectedSeasonId] = useState<string | null>(null)
  const activeSeasonId = selectedSeasonId ?? workingSeason?.id ?? null

  const { data: roster, isLoading: rosterLoading } = trpc.contract.rosterForSeason.useQuery(
    { teamId, seasonId: activeSeasonId! },
    { enabled: !!activeSeasonId },
  )

  // Teams for transfer dialog (need teams in the selected season)
  const { data: seasonTeams } = trpc.team.list.useQuery({ seasonId: activeSeasonId! }, { enabled: !!activeSeasonId })

  const transferTeams = useMemo(() => {
    if (!seasonTeams) return []
    return seasonTeams.map((t) => ({
      id: t.id,
      name: t.name,
      shortName: t.shortName,
      city: t.city,
      logoUrl: t.logoUrl,
      primaryColor: t.primaryColor,
    }))
  }, [seasonTeams])

  const existingPlayerIds = useMemo(() => {
    return (roster ?? []).map((c) => c.playerId)
  }, [roster])

  // --- Edit team dialog state ---
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [form, setForm] = useState<TeamForm>(emptyForm)
  const [errors, setErrors] = useState<Partial<Record<keyof TeamForm, string>>>({})

  // --- Roster dialog state ---
  const [signDialogOpen, setSignDialogOpen] = useState(false)
  const [editContract, setEditContract] = useState<ContractRow | null>(null)
  const [transferContract, setTransferContract] = useState<ContractRow | null>(null)
  const [releaseContract, setReleaseContract] = useState<ContractRow | null>(null)

  const utils = trpc.useUtils()

  const updateMutation = trpc.team.update.useMutation({
    onSuccess: () => {
      utils.team.history.invalidate({ teamId })
      utils.team.list.invalidate()
      utils.team.getById.invalidate({ id: teamId })
      closeEditDialog()
      toast.success(t("teamsPage.toast.updated"))
    },
    onError: (err) => {
      toast.error(t("teamsPage.toast.saveError"), { description: resolveTranslatedError(err, tErrors) })
    },
  })

  const team = historyData?.team ?? null

  // --- Edit dialog helpers ---
  function openEditDialog() {
    if (!team) return
    setForm({
      name: team.name,
      shortName: team.shortName,
      city: team.city || "",
      homeVenue: team.homeVenue || "",
      logoUrl: team.logoUrl || "",
      teamPhotoUrl: team.teamPhotoUrl || "",
      contactName: fullTeam?.contactName || "",
      contactEmail: fullTeam?.contactEmail || "",
      contactPhone: fullTeam?.contactPhone || "",
      website: fullTeam?.website || "",
    })
    setErrors({})
    setEditDialogOpen(true)
  }

  function closeEditDialog() {
    setEditDialogOpen(false)
    setForm(emptyForm)
    setErrors({})
  }

  function setField<K extends keyof TeamForm>(key: K, value: TeamForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  function validate(): boolean {
    const next: Partial<Record<keyof TeamForm, string>> = {}
    if (!form.name.trim()) next.name = t("teamsPage.validation.nameRequired")
    if (!form.shortName.trim()) next.shortName = t("teamsPage.validation.shortNameRequired")
    if (form.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contactEmail)) {
      next.contactEmail = t("teamsPage.validation.emailInvalid")
    }
    if (form.website && !/^https?:\/\/.+/.test(form.website)) {
      next.website = t("teamsPage.validation.websiteInvalid")
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    updateMutation.mutate({
      id: teamId,
      name: form.name.trim(),
      shortName: form.shortName.trim(),
      city: form.city.trim() || null,
      homeVenue: form.homeVenue.trim() || null,
      logoUrl: form.logoUrl || null,
      teamPhotoUrl: form.teamPhotoUrl || null,
      contactName: form.contactName.trim() || null,
      contactEmail: form.contactEmail.trim() || null,
      contactPhone: form.contactPhone.trim() || null,
      website: form.website.trim() || null,
    })
  }

  // --- Loading state ---
  if (historyLoading) {
    return (
      <div className="space-y-6">
        {/* Back link skeleton */}
        <Skeleton className="h-5 w-32 rounded" />

        {/* Team info skeleton */}
        <div className="flex items-start gap-6">
          <Skeleton className="h-20 w-20 shrink-0 rounded-xl" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-8 w-64 rounded" />
            <Skeleton className="h-4 w-48 rounded" />
            <Skeleton className="h-4 w-40 rounded" />
          </div>
        </div>

        {/* Sections skeleton */}
        <Skeleton className="h-px w-full" />
        <div className="space-y-4">
          <Skeleton className="h-6 w-24 rounded" />
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  // --- Not found ---
  if (!historyData || !team) {
    return (
      <div className="space-y-6">
        <Link
          to="/$orgSlug/teams"
          params={{ orgSlug }}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("teamsPage.teamDetail.backToTeams")}
        </Link>
        <EmptyState
          icon={<Shield className="h-8 w-8" style={{ color: "hsl(var(--accent))" }} strokeWidth={1.5} />}
          title={t("teamsPage.teamDetail.notFound")}
          description=""
        />
      </div>
    )
  }

  const initials = team.shortName.substring(0, 2).toUpperCase()

  return (
    <>
      <div className="space-y-8">
        {/* Back link + Edit button header */}
        <div className="flex items-center justify-between">
          <Link
            to="/$orgSlug/teams"
            params={{ orgSlug }}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("teamsPage.teamDetail.backToTeams")}
          </Link>
          <Button variant="outline" size="sm" onClick={openEditDialog}>
            <Pencil className="mr-2 h-3.5 w-3.5" aria-hidden="true" />
            {t("teamsPage.actions.edit")}
          </Button>
        </div>

        {/* ─── Team Info Section ─── */}
        <TeamInfoSection team={team} fullTeam={fullTeam ?? null} initials={initials} />

        {/* ─── Divider ─── */}
        <div className="border-t border-border/40" />

        {/* ─── Roster Section ─── */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <h2 className="text-lg font-bold tracking-wide uppercase text-foreground">
                {t("teamsPage.teamDetail.roster")}
              </h2>
              {allSeasons && allSeasons.length > 0 && (
                <Select value={activeSeasonId ?? undefined} onValueChange={(v) => setSelectedSeasonId(v)}>
                  <SelectTrigger className="h-8 w-auto rounded-full border border-border bg-white px-3 text-sm font-medium text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {allSeasons.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            {activeSeasonId && (
              <Button variant="accent" size="sm" onClick={() => setSignDialogOpen(true)}>
                <Plus className="mr-2 h-3.5 w-3.5" aria-hidden="true" />
                {t("rosterPage.actions.signPlayer")}
              </Button>
            )}
          </div>

          {!activeSeasonId ? (
            <EmptyState
              icon={<Calendar className="h-8 w-8" style={{ color: "hsl(var(--accent))" }} strokeWidth={1.5} />}
              title={t("teamsPage.teamDetail.noRoster")}
              description=""
            />
          ) : rosterLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-5 w-24 rounded" />
                  <Skeleton className="h-12 w-full rounded-lg" />
                  <Skeleton className="h-12 w-full rounded-lg" />
                </div>
              ))}
            </div>
          ) : !roster || roster.length === 0 ? (
            <EmptyState
              icon={<Users className="h-8 w-8" style={{ color: "hsl(var(--accent))" }} strokeWidth={1.5} />}
              title={t("teamsPage.teamDetail.noRoster")}
              description=""
              action={
                <Button variant="accent" size="sm" onClick={() => setSignDialogOpen(true)}>
                  <Plus className="mr-2 h-3.5 w-3.5" aria-hidden="true" />
                  {t("rosterPage.actions.signPlayer")}
                </Button>
              }
            />
          ) : (
            <RosterTable
              contracts={roster}
              onEdit={(c) => setEditContract(c)}
              onRelease={(c) => setReleaseContract(c)}
              onTransfer={(c) => setTransferContract(c)}
            />
          )}
        </section>

        {/* ─── Divider ─── */}
        <div className="border-t border-border/40" />

        {/* ─── Season History Section ─── */}
        <section>
          <h2 className="text-lg font-bold tracking-wide uppercase text-foreground mb-6">
            {t("teamsPage.teamDetail.seasonHistory")}
          </h2>

          {historyData.seasons.length === 0 ? (
            <EmptyState
              icon={<Trophy className="h-8 w-8" style={{ color: "hsl(var(--accent))" }} strokeWidth={1.5} />}
              title={t("teamsPage.teamDetail.noHistory")}
              description=""
            />
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-border/50 overflow-hidden">
              {historyData.seasons.map((entry, i) => {
                const { season, totals, bestRank } = entry
                const gdSign = totals.goalDifference > 0 ? "+" : ""

                return (
                  <div
                    key={season.id}
                    className={`data-row flex items-center gap-4 px-4 py-4 hover:bg-accent/5 transition-colors ${
                      i < historyData.seasons.length - 1 ? "border-b border-border/40" : ""
                    }`}
                    style={{ "--row-index": i } as React.CSSProperties}
                  >
                    {/* Season name */}
                    <div className="min-w-0 flex-1">
                      <span className="font-semibold text-foreground">{season.name}</span>
                      {entry.divisions.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {entry.divisions.map((d) => d.name).join(", ")}
                        </p>
                      )}
                    </div>

                    {/* Record */}
                    <div className="flex items-center gap-3 shrink-0">
                      {totals.gamesPlayed > 0 && (
                        <>
                          <span className="text-sm font-medium text-foreground">
                            {t("teamsPage.teamDetail.record", {
                              wins: totals.wins,
                              draws: totals.draws,
                              losses: totals.losses,
                            })}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {t("teamsPage.teamDetail.goalDifference")} {gdSign}
                            {totals.goalDifference}
                          </span>
                        </>
                      )}
                      {bestRank !== null && (
                        <Badge variant="secondary" className="text-xs shrink-0">
                          {t("teamsPage.teamDetail.rank", { rank: bestRank })}
                        </Badge>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </div>

      {/* ─── Edit Team Sheet ─── */}
      <Sheet open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <SheetContent size="wide">
          <SheetClose />
          <SheetHeader>
            <SheetTitle>{t("teamsPage.dialogs.editTitle")}</SheetTitle>
            <SheetDescription>{t("teamsPage.dialogs.editDescription")}</SheetDescription>
          </SheetHeader>

          <form onSubmit={handleEditSubmit} className="flex flex-1 flex-col overflow-hidden">
            <SheetBody className="space-y-6">
              {/* Images */}
              <div className="flex gap-6 items-start">
                <div>
                  <Label className="text-xs text-muted-foreground mb-2 block">{t("teamsPage.fields.logo")}</Label>
                  <ImageUpload
                    value={form.logoUrl || null}
                    onChange={(url) => setField("logoUrl", url || "")}
                    type="logo"
                    label={t("teamsPage.fields.uploadLogo")}
                  />
                </div>
                <div className="flex-1">
                  <Label className="text-xs text-muted-foreground mb-2 block">{t("teamsPage.fields.teamPhoto")}</Label>
                  <ImageUpload
                    value={form.teamPhotoUrl || null}
                    onChange={(url) => setField("teamPhotoUrl", url || "")}
                    type="photo"
                    label={t("teamsPage.fields.uploadPhoto")}
                  />
                </div>
              </div>

              {/* Name row */}
              <div className="grid grid-cols-2 gap-4">
                <FormField label={t("teamsPage.fields.name")} error={errors.name} required>
                  <Input
                    value={form.name}
                    onChange={(e) => setField("name", e.target.value)}
                    placeholder={t("teamsPage.fields.namePlaceholder")}
                  />
                </FormField>
                <FormField label={t("teamsPage.fields.shortName")} error={errors.shortName} required>
                  <Input
                    value={form.shortName}
                    onChange={(e) => setField("shortName", e.target.value)}
                    placeholder={t("teamsPage.fields.shortNamePlaceholder")}
                  />
                </FormField>
              </div>

              {/* City + Home Venue */}
              <div className="grid grid-cols-2 gap-4">
                <FormField label={t("teamsPage.fields.city")}>
                  <Input
                    value={form.city}
                    onChange={(e) => setField("city", e.target.value)}
                    placeholder={t("teamsPage.fields.cityPlaceholder")}
                  />
                </FormField>
                <FormField label={t("teamsPage.fields.homeVenue")}>
                  <Input
                    value={form.homeVenue}
                    onChange={(e) => setField("homeVenue", e.target.value)}
                    placeholder={t("teamsPage.fields.homeVenuePlaceholder")}
                  />
                </FormField>
              </div>

              {/* Contact section */}
              <div className="border-t pt-4">
                <p className="text-sm font-medium mb-3 text-muted-foreground">{t("teamsPage.fields.contactSection")}</p>
                <div className="grid grid-cols-2 gap-4">
                  <FormField label={t("teamsPage.fields.contactName")}>
                    <Input
                      value={form.contactName}
                      onChange={(e) => setField("contactName", e.target.value)}
                      placeholder={t("teamsPage.fields.contactNamePlaceholder")}
                    />
                  </FormField>
                  <FormField label={t("teamsPage.fields.contactEmail")} error={errors.contactEmail}>
                    <Input
                      type="email"
                      value={form.contactEmail}
                      onChange={(e) => setField("contactEmail", e.target.value)}
                      placeholder={t("teamsPage.fields.contactEmailPlaceholder")}
                    />
                  </FormField>
                  <FormField label={t("teamsPage.fields.contactPhone")}>
                    <Input
                      value={form.contactPhone}
                      onChange={(e) => setField("contactPhone", e.target.value)}
                      placeholder={t("teamsPage.fields.contactPhonePlaceholder")}
                    />
                  </FormField>
                  <FormField label={t("teamsPage.fields.website")} error={errors.website}>
                    <Input
                      value={form.website}
                      onChange={(e) => setField("website", e.target.value)}
                      placeholder={t("teamsPage.fields.websitePlaceholder")}
                    />
                  </FormField>
                </div>
              </div>
            </SheetBody>

            <SheetFooter>
              <div className="flex-1" />
              <Button type="button" variant="outline" onClick={closeEditDialog}>
                {t("cancel")}
              </Button>
              <Button type="submit" variant="accent" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? t("teamsPage.actions.saving") : t("save")}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      {/* ─── Roster Dialogs ─── */}
      {activeSeasonId && (
        <>
          <SignPlayerDialog
            open={signDialogOpen}
            onOpenChange={setSignDialogOpen}
            teamId={teamId}
            seasonId={activeSeasonId}
            existingPlayerIds={existingPlayerIds}
          />

          <EditContractDialog
            open={!!editContract}
            onOpenChange={(open) => !open && setEditContract(null)}
            contract={editContract}
            teamId={teamId}
            seasonId={activeSeasonId}
          />

          <TransferDialog
            open={!!transferContract}
            onOpenChange={(open) => !open && setTransferContract(null)}
            contract={transferContract}
            currentTeamId={teamId}
            seasonId={activeSeasonId}
            teams={transferTeams}
          />

          <ReleasePlayerDialog
            open={!!releaseContract}
            onOpenChange={(open) => !open && setReleaseContract(null)}
            contract={releaseContract}
            teamId={teamId}
            seasonId={activeSeasonId}
          />
        </>
      )}
    </>
  )
}

// ---------------------------------------------------------------------------
// Team Info Section (read-only display)
// ---------------------------------------------------------------------------
function TeamInfoSection({
  team,
  fullTeam,
  initials,
}: {
  team: {
    id: string
    name: string
    shortName: string
    city: string | null
    logoUrl: string | null
    teamPhotoUrl: string | null
    homeVenue: string | null
    primaryColor: string | null
  }
  fullTeam: {
    contactName: string | null
    contactEmail: string | null
    contactPhone: string | null
    website: string | null
  } | null
  initials: string
}) {
  const accentColor = team.primaryColor || "hsl(var(--primary))"

  return (
    <div className="flex items-start gap-6">
      {/* Logo */}
      <div
        className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl"
        style={{
          background: team.logoUrl ? "transparent" : "${accentColor}18",
        }}
      >
        {team.logoUrl ? (
          <img src={team.logoUrl} alt={team.name} className="h-full w-full object-contain" />
        ) : (
          <span className="text-2xl font-bold" style={{ color: accentColor }}>
            {initials}
          </span>
        )}
      </div>
      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-foreground truncate">{team.name}</h1>
          <Badge variant="outline" className="text-xs shrink-0">
            {team.shortName}
          </Badge>
        </div>

        <div className="mt-2 space-y-1">
          {/* City + Venue */}
          {(team.city || team.homeVenue) && (
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              {team.city && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  {team.city}
                </span>
              )}
              {team.homeVenue && (
                <span className="flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 shrink-0" />
                  {team.homeVenue}
                </span>
              )}
            </div>
          )}

          {/* Contact info */}
          {fullTeam && (fullTeam.contactName || fullTeam.contactEmail) && (
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              {fullTeam.contactName && (
                <span className="flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 shrink-0" />
                  {fullTeam.contactName}
                </span>
              )}
              {fullTeam.contactEmail && (
                <span className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 shrink-0" />
                  {fullTeam.contactEmail}
                </span>
              )}
              {fullTeam.contactPhone && (
                <span className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 shrink-0" />
                  {fullTeam.contactPhone}
                </span>
              )}
            </div>
          )}

          {/* Website */}
          {fullTeam?.website && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Globe className="h-3.5 w-3.5 shrink-0" />
              <a
                href={fullTeam.website}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground transition-colors underline underline-offset-2 decoration-border"
              >
                {fullTeam.website.replace(/^https?:\/\//, "")}
                <ExternalLink className="inline ml-1 h-3 w-3" />
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
