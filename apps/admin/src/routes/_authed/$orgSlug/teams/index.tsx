import {
  Badge,
  Button,
  FormField,
  Input,
  Label,
  Sheet,
  SheetBody,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  toast,
} from "@puckhub/ui"
import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router"
import { Plus, Shield } from "lucide-react"
import { useCallback, useMemo, useState } from "react"
import { trpc } from "@/trpc"
import { ConfirmDialog } from "~/components/confirmDialog"
import { DataPageLayout } from "~/components/dataPageLayout"
import { FilterBar } from "~/components/filterBar"
import { EmptyState } from "~/components/emptyState"
import { FilterDropdown } from "~/components/filterDropdown"
import type { FilterDropdownOption } from "~/components/filterDropdown"
import { ImageUpload } from "~/components/imageUpload"
import { NoResults } from "~/components/noResults"
import { DataListSkeleton } from "~/components/skeletons/dataListSkeleton"
import { FilterPillsSkeleton } from "~/components/skeletons/filterPillsSkeleton"
import { usePermissionGuard } from "~/contexts/permissionsContext"
import { useWorkingSeason } from "~/contexts/seasonContext"
import { usePlanLimits } from "~/hooks/usePlanLimits"
import { useTranslation } from "~/i18n/use-translation"
import { resolveTranslatedError } from "~/lib/errorI18n"

export const Route = createFileRoute("/_authed/$orgSlug/teams/")({
  validateSearch: (s: Record<string, unknown>): { search?: string; division?: string; edit?: string } => ({
    ...(typeof s.search === "string" && s.search ? { search: s.search } : {}),
    ...(typeof s.division === "string" && s.division ? { division: s.division } : {}),
    ...(typeof s.edit === "string" && s.edit ? { edit: s.edit } : {}),
  }),
  loader: ({ context }) => {
    void context.trpcQueryUtils?.team.list.ensureData()
  },
  component: TeamsPage,
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
function TeamsPage() {
  usePermissionGuard("teams")
  const { orgSlug } = useParams({ strict: false }) as { orgSlug: string }
  const { t } = useTranslation("common")
  const { t: tErrors } = useTranslation("errors")
  const { isAtLimit, usageText } = usePlanLimits()
  const atTeamLimit = isAtLimit("maxTeams")
  const { search: searchParam, division, edit: editId } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const search = searchParam ?? ""
  const divisionFilter = useMemo(() => (division ? division.split(",") : []), [division])
  const setSearch = useCallback(
    (v: string) => navigate({ search: (prev) => ({ ...prev, search: v || undefined }), replace: true }),
    [navigate],
  )
  const setDivisionFilter = useCallback(
    (v: string[]) => navigate({ search: (prev) => ({ ...prev, division: v.join(",") || undefined }), replace: true }),
    [navigate],
  )

  // Sheet state driven by URL
  const isNew = editId === "new"
  const sheetOpen = !!editId

  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false)
  const [form, setForm] = useState<TeamForm>(emptyForm)
  const [errors, setErrors] = useState<Partial<Record<keyof TeamForm, string>>>({})

  const FILTER_UNASSIGNED = "__unassigned__"

  const utils = trpc.useUtils()
  const { data: allTeams, isLoading } = trpc.team.list.useQuery()

  // Division filter data from working season
  const { season } = useWorkingSeason()
  const { data: structure } = trpc.season.getFullStructure.useQuery({ id: season?.id ?? "" }, { enabled: !!season?.id })

  // Extract divisions and team-to-division mapping (a team can be in multiple divisions)
  const { divisions, teamDivisionMap, seasonTeamIds } = useMemo(() => {
    if (!structure?.divisions)
      return { divisions: [], teamDivisionMap: new Map<string, Set<string>>(), seasonTeamIds: new Set<string>() }
    const divs = structure.divisions.map((d) => ({ id: d.id, name: d.name }))
    const map = new Map<string, Set<string>>()
    if (structure.teamAssignments) {
      for (const ta of structure.teamAssignments) {
        const existing = map.get(ta.team.id)
        if (existing) {
          existing.add(ta.divisionId)
        } else {
          map.set(ta.team.id, new Set([ta.divisionId]))
        }
      }
    }
    return { divisions: divs, teamDivisionMap: map, seasonTeamIds: new Set(map.keys()) }
  }, [structure])

  const unassignedCount = useMemo(() => {
    if (!allTeams) return 0
    return allTeams.filter((t) => !seasonTeamIds.has(t.id)).length
  }, [allTeams, seasonTeamIds])

  const createMutation = trpc.team.create.useMutation({
    onSuccess: () => {
      utils.team.list.invalidate()
      closeSheet()
      toast.success(t("teamsPage.toast.created"))
    },
    onError: (err) => {
      toast.error(t("teamsPage.toast.createError"), { description: resolveTranslatedError(err, tErrors) })
    },
  })

  function closeSheet() {
    navigate({ search: (prev) => ({ ...prev, edit: undefined }), replace: true })
  }

  function openSheet(id: string) {
    setForm(emptyForm)
    setErrors({})
    navigate({ search: (prev) => ({ ...prev, edit: id }) })
  }

  const divisionOptions: FilterDropdownOption[] = useMemo(() => {
    const opts: FilterDropdownOption[] = divisions.map((d) => ({ value: d.id, label: d.name }))
    if (unassignedCount > 0) {
      opts.push({ value: FILTER_UNASSIGNED, label: t("teamsPage.filters.unassigned") })
    }
    return opts
  }, [divisions, unassignedCount, t])

  const filtered = useMemo(() => {
    if (!allTeams) return []

    let result = allTeams

    // Division / season filter
    if (divisionFilter.length > 0) {
      result = result.filter((t) => {
        if (divisionFilter.includes(FILTER_UNASSIGNED) && !seasonTeamIds.has(t.id)) return true
        const teamDivs = teamDivisionMap.get(t.id)
        return teamDivs ? divisionFilter.some((dId) => teamDivs.has(dId)) : false
      })
    } else {
      // "All active" — only teams in the current season
      result = result.filter((t) => seasonTeamIds.has(t.id))
    }

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.shortName.toLowerCase().includes(q) ||
          t.city?.toLowerCase().includes(q),
      )
    }

    return result
  }, [allTeams, search, divisionFilter, teamDivisionMap, seasonTeamIds])

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

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    createMutation.mutate({
      name: form.name.trim(),
      shortName: form.shortName.trim(),
      city: form.city.trim() || undefined,
      homeVenue: form.homeVenue.trim() || undefined,
      logoUrl: form.logoUrl || undefined,
      teamPhotoUrl: form.teamPhotoUrl || undefined,
      contactName: form.contactName.trim() || undefined,
      contactEmail: form.contactEmail.trim() || undefined,
      contactPhone: form.contactPhone.trim() || undefined,
      website: form.website.trim() || undefined,
    })
  }

  const isDirty = form.name !== "" || form.shortName !== ""

  const isSaving = createMutation.isPending

  return (
    <>
      <DataPageLayout
        title={t("teamsPage.title")}
        description={t("teamsPage.description")}
        action={
          <div className="flex items-center gap-2">
            <Badge variant="outline">{usageText("maxTeams")}</Badge>
            <Button
              variant="accent"
              onClick={() => openSheet("new")}
              data-testid="teams-new"
              disabled={atTeamLimit}
              title={atTeamLimit ? t("plan.limitReached", { defaultValue: "Plan limit reached" }) : undefined}
            >
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
              {t("teamsPage.actions.new")}
            </Button>
          </div>
        }
        filters={
          <FilterBar
            label={t("filters")}
            search={{ value: search, onChange: setSearch, placeholder: t("teamsPage.searchPlaceholder") }}
          >
            {isLoading ? (
              <FilterPillsSkeleton count={1} />
            ) : divisionOptions.length > 0 ? (
              <FilterDropdown
                label={t("teamsPage.filters.all")}
                options={divisionOptions}
                value={divisionFilter}
                onChange={setDivisionFilter}
                testId="teams-division-filter"
                optionTestIdPrefix="teams-division-filter-option"
              />
            ) : null}
          </FilterBar>
        }
      >
        {/* Content */}
        {isLoading ? (
          <DataListSkeleton rows={5} />
        ) : (allTeams?.length ?? 0) === 0 ? (
          <EmptyState
            icon={<Shield className="h-8 w-8" style={{ color: "hsl(var(--accent))" }} strokeWidth={1.5} />}
            title={t("teamsPage.empty.title")}
            description={t("teamsPage.empty.description")}
            action={
              <Button variant="accent" onClick={() => openSheet("new")} disabled={atTeamLimit}>
                <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                {t("teamsPage.empty.action")}
              </Button>
            }
          />
        ) : !season ? (
          <EmptyState
            icon={<Shield className="h-8 w-8" style={{ color: "hsl(var(--accent))" }} strokeWidth={1.5} />}
            title={t("teamsPage.empty.noSeasonTitle")}
            description={t("teamsPage.empty.noSeasonDescription")}
          />
        ) : filtered.length === 0 && !search && divisionFilter.length === 0 && seasonTeamIds.size === 0 ? (
          <EmptyState
            icon={<Shield className="h-8 w-8" style={{ color: "hsl(var(--accent))" }} strokeWidth={1.5} />}
            title={t("teamsPage.empty.noAssignmentsTitle")}
            description={t("teamsPage.empty.noAssignmentsDescription")}
          />
        ) : filtered.length === 0 ? (
          <NoResults query={search || t("teamsPage.filters.fallback")} />
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-border/50 overflow-hidden">
            {filtered.map((team, i) => {
              const initials = team.shortName.substring(0, 2).toUpperCase()
              const firstTrikot = team.teamTrikots[0]?.trikot ?? null

              return (
                <div
                  key={team.id}
                  data-testid="team-row"
                  onClick={() => navigate({ to: '/$orgSlug/teams/$teamId', params: { orgSlug, teamId: team.id } })}
                  className={`data-row group flex items-center gap-4 px-4 py-3.5 hover:bg-accent/5 transition-colors cursor-pointer ${
                    i < filtered.length - 1 ? "border-b border-border/40" : ""
                  }`}
                  style={{ "--row-index": i } as React.CSSProperties}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault()
                      navigate({ to: '/$orgSlug/teams/$teamId', params: { orgSlug, teamId: team.id } })
                    }
                  }}
                >
                  {/* Logo + Info */}
                  <div className="flex items-center gap-4">
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg"
                      style={{
                        background: team.logoUrl
                          ? "transparent"
                          : firstTrikot
                            ? `${firstTrikot.primaryColor}18`
                            : "hsl(var(--muted))",
                      }}
                    >
                      {team.logoUrl ? (
                        <img src={team.logoUrl} alt={team.name} className="h-full w-full object-contain" />
                      ) : (
                        <span
                          className="text-sm font-bold"
                          style={{ color: firstTrikot?.primaryColor ?? "hsl(var(--muted-foreground))" }}
                        >
                          {initials}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold truncate">{team.name}</span>
                        <Badge variant="outline" className="shrink-0 text-[10px]">
                          {team.shortName}
                        </Badge>
                      </div>
                      {team.city && <p className="text-xs text-muted-foreground mt-0.5">{team.city}</p>}
                    </div>
                  </div>

                  {/* Flex spacer */}
                  <div className="flex-1 min-w-0" />

                  {/* Contact name */}
                  <div className="w-36 shrink-0 hidden lg:block">
                    {team.contactName ? (
                      <span className="text-sm text-muted-foreground truncate block">{team.contactName}</span>
                    ) : (
                      <span className="text-sm text-muted-foreground">–</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </DataPageLayout>

      {/* Create Sheet */}
      <Sheet open={sheetOpen} onOpenChange={(open) => { if (!open) closeSheet() }} dirty={isDirty} onDirtyClose={() => setConfirmCloseOpen(true)}>
        <SheetContent size="wide">
          <SheetClose />
          <SheetHeader>
            <SheetTitle>{t("teamsPage.dialogs.newTitle")}</SheetTitle>
            <SheetDescription>{t("teamsPage.dialogs.newDescription")}</SheetDescription>
          </SheetHeader>

          <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
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
                    data-testid="teams-form-name"
                    value={form.name}
                    onChange={(e) => setField("name", e.target.value)}
                    placeholder={t("teamsPage.fields.namePlaceholder")}
                  />
                </FormField>
                <FormField label={t("teamsPage.fields.shortName")} error={errors.shortName} required>
                  <Input
                    data-testid="teams-form-short-name"
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
                    data-testid="teams-form-city"
                    value={form.city}
                    onChange={(e) => setField("city", e.target.value)}
                    placeholder={t("teamsPage.fields.cityPlaceholder")}
                  />
                </FormField>
                <FormField label={t("teamsPage.fields.homeVenue", { defaultValue: "Heimspielstätte" })}>
                  <Input
                    value={form.homeVenue}
                    onChange={(e) => setField("homeVenue", e.target.value)}
                    placeholder={t("teamsPage.fields.homeVenuePlaceholder", {
                      defaultValue: "z.B. Eisstadion Musterstadt",
                    })}
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
              <Button type="button" variant="outline" onClick={() => { if (isDirty) setConfirmCloseOpen(true); else closeSheet() }}>
                {t("cancel")}
              </Button>
              <Button type="submit" variant="accent" disabled={isSaving} data-testid="teams-form-submit">
                {isSaving ? t("teamsPage.actions.saving") : t("create")}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      {/* Unsaved Changes Dialog */}
      <ConfirmDialog
        open={confirmCloseOpen}
        onOpenChange={setConfirmCloseOpen}
        title={t("unsavedChanges.title", { defaultValue: "Ungespeicherte Änderungen" })}
        description={t("unsavedChanges.description", { defaultValue: "Du hast ungespeicherte Änderungen. Möchtest du wirklich schließen?" })}
        confirmLabel={t("unsavedChanges.discard", { defaultValue: "Verwerfen" })}
        variant="destructive"
        onConfirm={() => {
          setConfirmCloseOpen(false)
          closeSheet()
        }}
      />
    </>
  )
}
