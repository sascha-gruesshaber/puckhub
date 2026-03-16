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
import { createFileRoute, Link, useParams } from "@tanstack/react-router"
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRightLeft,
  Calendar,
  Loader2,
  Pencil,
  RotateCcw,
  Trash2,
  UserMinus,
  UserPlus,
} from "lucide-react"
import { useMemo, useState } from "react"
import { trpc } from "@/trpc"
import { ImageUpload } from "~/components/imageUpload"
import { EditContractDialog } from "~/components/roster/editContractDialog"
import { ReleasePlayerDialog } from "~/components/roster/releasePlayerDialog"
import type { ContractRow } from "~/components/roster/rosterTable"
import { SignPlayerDialog } from "~/components/roster/signPlayerDialog"
import { TransferDialog } from "~/components/roster/transferDialog"
import { usePermissionGuard } from "~/contexts/permissionsContext"
import { useWorkingSeason } from "~/contexts/seasonContext"
import { useTranslation } from "~/i18n/use-translation"
import { resolveTranslatedError } from "~/lib/errorI18n"

export const Route = createFileRoute("/_authed/$orgSlug/players/$playerId")({
  component: PlayerDetailPage,
})

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ContractWithRelations {
  id: string
  teamId: string
  playerId: string
  position: string
  jerseyNumber: number | null
  startSeasonId: string
  endSeasonId: string | null
  createdAt: Date
  organizationId: string
  updatedAt: Date
  team: {
    id: string
    name: string
    shortName: string
    logoUrl: string | null
    city: string | null
    primaryColor: string | null
  }
  startSeason: { id: string; name: string; seasonStart: Date; seasonEnd: Date }
  endSeason: { id: string; name: string; seasonStart: Date; seasonEnd: Date } | null
}

interface PlayerForm {
  firstName: string
  lastName: string
  dateOfBirth: string
  nationality: string
  photoUrl: string
}

const emptyForm: PlayerForm = {
  firstName: "",
  lastName: "",
  dateOfBirth: "",
  nationality: "",
  photoUrl: "",
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function calcAge(dob: Date | string | null | undefined): number | null {
  if (!dob) return null
  const date = dob instanceof Date ? dob : new Date(dob)
  const today = new Date()
  let a = today.getFullYear() - date.getFullYear()
  const m = today.getMonth() - date.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < date.getDate())) a--
  return a
}

function formatDate(dob: Date | string | null | undefined): string {
  if (!dob) return ""
  const date = dob instanceof Date ? dob : new Date(dob)
  return date.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" })
}


const POSITION_ACCENT: Record<string, string> = {
  goalie: "text-blue-600",
  defense: "text-emerald-600",
  forward: "text-red-600",
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function PlayerDetailPage() {
  usePermissionGuard("players")
  const { orgSlug } = useParams({ strict: false }) as { orgSlug: string }
  const { t } = useTranslation("common")
  const { t: tErrors } = useTranslation("errors")
  const { playerId } = Route.useParams()
  const { season: workingSeason } = useWorkingSeason()

  // --- Data queries ---
  const { data: player, isLoading } = trpc.player.getByIdWithHistory.useQuery({ id: playerId })
  const { data: seasons } = trpc.season.list.useQuery()
  const { data: teams } = trpc.team.list.useQuery(
    { seasonId: workingSeason?.id },
    { enabled: !!workingSeason?.id },
  )
  const utils = trpc.useUtils()

  // --- Dialog state ---
  const [editInfoOpen, setEditInfoOpen] = useState(false)
  const [editContract, setEditContract] = useState<ContractRow | null>(null)
  const [transferContract, setTransferContract] = useState<ContractRow | null>(null)
  const [releaseContract, setReleaseContract] = useState<ContractRow | null>(null)
  const [signDialogOpen, setSignDialogOpen] = useState(false)
  const [deleteContractId, setDeleteContractId] = useState<string | null>(null)

  // --- Player edit form ---
  const [form, setForm] = useState<PlayerForm>(emptyForm)
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof PlayerForm, string>>>({})

  const updateMutation = trpc.player.update.useMutation({
    onSuccess: () => {
      utils.player.getByIdWithHistory.invalidate({ id: playerId })
      utils.player.listWithCurrentTeam.invalidate()
      setEditInfoOpen(false)
      toast.success(t("playersPage.toast.updated"))
    },
    onError: (err) => {
      toast.error(t("playersPage.toast.saveError"), { description: resolveTranslatedError(err, tErrors) })
    },
  })

  // --- Sign to team ---
  // (uses shared SignPlayerDialog component in player-centric mode)

  const deleteContractMutation = trpc.contract.deleteContract.useMutation({
    onSuccess: () => {
      utils.player.getByIdWithHistory.invalidate({ id: playerId })
      utils.player.listWithCurrentTeam.invalidate()
      setDeleteContractId(null)
      toast.success(t("playersPage.playerDetail.deleteContract.toast.deleted"))
    },
    onError: (err) => {
      toast.error(t("playersPage.playerDetail.deleteContract.toast.deleteError"), {
        description: resolveTranslatedError(err, tErrors),
      })
    },
  })

  const reopenContractMutation = trpc.contract.reopenContract.useMutation({
    onSuccess: () => {
      utils.player.getByIdWithHistory.invalidate({ id: playerId })
      utils.player.listWithCurrentTeam.invalidate()
      toast.success(t("playersPage.playerDetail.reopenContract.toast.reopened"))
    },
    onError: (err) => {
      toast.error(t("playersPage.playerDetail.reopenContract.toast.reopenError"), {
        description: resolveTranslatedError(err, tErrors),
      })
    },
  })

  // --- Computed ---

  function toContractRow(contract: ContractWithRelations): ContractRow {
    return {
      id: contract.id,
      position: contract.position,
      jerseyNumber: contract.jerseyNumber,
      startSeasonId: contract.startSeasonId,
      endSeasonId: contract.endSeasonId,
      player: {
        id: player!.id,
        firstName: player!.firstName,
        lastName: player!.lastName,
        dateOfBirth: player!.dateOfBirth ? new Date(player!.dateOfBirth) : null,
        nationality: player!.nationality,
        photoUrl: player!.photoUrl,
      },
    }
  }

  // Track which contract's teamId is being acted on (for dialogs)
  const [activeDialogTeamId, setActiveDialogTeamId] = useState<string | null>(null)

  // All contracts sorted by season start (most recent first)
  const sortedContracts = useMemo(() => {
    if (!player?.contracts) return []
    return ([...player.contracts] as ContractWithRelations[]).sort(
      (a, b) => new Date(b.startSeason.seasonStart).getTime() - new Date(a.startSeason.seasonStart).getTime(),
    )
  }, [player?.contracts])

  const age = calcAge(player?.dateOfBirth)

  // --- Handlers ---

  function openEditInfo() {
    if (!player) return
    setForm({
      firstName: player.firstName,
      lastName: player.lastName,
      dateOfBirth:
        player.dateOfBirth instanceof Date
          ? player.dateOfBirth.toISOString().slice(0, 10)
          : player.dateOfBirth || "",
      nationality: player.nationality || "",
      photoUrl: player.photoUrl || "",
    })
    setFormErrors({})
    setEditInfoOpen(true)
  }

  function setField<K extends keyof PlayerForm>(key: K, value: PlayerForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    if (formErrors[key]) setFormErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  function validateForm(): boolean {
    const next: Partial<Record<keyof PlayerForm, string>> = {}
    if (!form.firstName.trim()) next.firstName = t("playersPage.validation.firstNameRequired")
    if (!form.lastName.trim()) next.lastName = t("playersPage.validation.lastNameRequired")
    if (form.dateOfBirth && Number.isNaN(Date.parse(form.dateOfBirth))) {
      next.dateOfBirth = t("playersPage.validation.dateInvalid")
    }
    setFormErrors(next)
    return Object.keys(next).length === 0
  }

  function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validateForm()) return
    updateMutation.mutate({
      id: playerId,
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      dateOfBirth: form.dateOfBirth || undefined,
      nationality: form.nationality.trim() || undefined,
      photoUrl: form.photoUrl || undefined,
    })
  }

  function handleDialogSuccess() {
    utils.player.getByIdWithHistory.invalidate({ id: playerId })
    utils.player.listWithCurrentTeam.invalidate()
  }

  // --- Loading / Not found ---

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!player) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <Link
          to="/$orgSlug/players"
          params={{ orgSlug }}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("playersPage.playerDetail.backToPlayers")}
        </Link>
        <p className="text-muted-foreground">{t("playersPage.playerDetail.notFound")}</p>
      </div>
    )
  }

  // --- Render ---

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {/* Back link */}
      <Link
        to="/$orgSlug/players"
        params={{ orgSlug }}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("playersPage.playerDetail.backToPlayers")}
      </Link>

      {/* ----------------------------------------------------------------- */}
      {/* Player Info Section (read-only)                                    */}
      {/* ----------------------------------------------------------------- */}
      <div className="bg-white rounded-xl shadow-sm border border-border/50 p-6 mb-6">
        <div className="flex items-start justify-between mb-6">
          <h1 className="text-xl font-bold text-foreground">
            {player.firstName} {player.lastName}
          </h1>
          <Button variant="outline" size="sm" onClick={openEditInfo}>
            <Pencil className="h-3.5 w-3.5 mr-1.5" />
            {t("playersPage.playerDetail.editInfo")}
          </Button>
        </div>

        <div className="flex items-start gap-6">
          {/* Photo */}
          <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-xl bg-muted overflow-hidden">
            {player.photoUrl ? (
              <img
                src={player.photoUrl}
                alt={`${player.firstName} ${player.lastName}`}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-2xl font-bold text-muted-foreground">
                {player.firstName[0]}
                {player.lastName[0]}
              </span>
            )}
          </div>

          <div className="flex-1 min-w-0 space-y-3">
            {/* DOB + Age */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {player.dateOfBirth && (
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  {formatDate(player.dateOfBirth)}
                  {age !== null && (
                    <span className="text-xs">({t("playersPage.hoverCard.ageYears", { age })})</span>
                  )}
                </span>
              )}
              {player.nationality && (
                <span className="inline-block bg-muted text-xs rounded px-1.5 py-0.5 font-medium">
                  {player.nationality}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Contracts                                                            */}
      {/* ----------------------------------------------------------------- */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-foreground">
            {t("playersPage.playerDetail.contractHistory")}
          </h2>
          <Button variant="accent" size="sm" onClick={() => setSignDialogOpen(true)}>
            <UserPlus className="h-3.5 w-3.5 mr-1.5" />
            {t("playersPage.playerDetail.signToTeam")}
          </Button>
        </div>

        {sortedContracts.length === 0 ? (
          <div className="text-sm text-muted-foreground bg-white rounded-xl shadow-sm border border-border/50 p-6 text-center">
            {t("playersPage.playerDetail.noContracts")}
          </div>
        ) : (
          <div className="space-y-4">
            {sortedContracts.map((c) => {
              const isActive = !c.endSeasonId
              const seasonRange = c.endSeason
                ? `${c.startSeason.name} – ${c.endSeason.name}`
                : `${c.startSeason.name} – ${t(`playersPage.playerDetail.ongoing`)}`

              return (
                <div
                  key={c.id}
                  className={`bg-white rounded-xl shadow-sm border p-5 ${isActive ? `border-emerald-300 dark:border-emerald-700` : `border-border/50`}`}
                >
                  {/* Header: team info + status */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {c.team.logoUrl ? (
                        <img src={c.team.logoUrl} alt="" className="h-10 w-10 rounded-full object-cover shrink-0" />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-muted shrink-0 flex items-center justify-center text-sm font-bold text-muted-foreground">
                          {c.team.shortName.slice(0, 2)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="font-semibold text-foreground text-base truncate">{c.team.name}</div>
                        <div className="flex flex-wrap items-center gap-2 mt-0.5 text-sm text-muted-foreground">
                          <span className={POSITION_ACCENT[c.position] ?? ""}>
                            {t(`rosterPage.positions.${c.position}`)}
                          </span>
                          {c.jerseyNumber != null && (
                            <span className="font-mono text-xs">#{c.jerseyNumber}</span>
                          )}
                          <span className="text-border">·</span>
                          <span className="flex items-center gap-1 text-xs">
                            <Calendar className="h-3 w-3" />
                            {seasonRange}
                          </span>
                        </div>
                      </div>
                    </div>

                    <Badge
                      variant="secondary"
                      className={isActive
                        ? "bg-emerald-600 text-white dark:bg-emerald-700 shrink-0"
                        : "bg-muted text-muted-foreground shrink-0"
                      }
                    >
                      {isActive ? t("playersPage.playerDetail.active") : t("playersPage.playerDetail.ended")}
                    </Badge>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-border/30">
                    {isActive && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => { setActiveDialogTeamId(c.teamId); setEditContract(toContractRow(c)) }}
                        >
                          <Pencil className="h-3.5 w-3.5 mr-1.5" />
                          {t("playersPage.playerDetail.editContract")}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => { setActiveDialogTeamId(c.teamId); setTransferContract(toContractRow(c)) }}
                        >
                          <ArrowRightLeft className="h-3.5 w-3.5 mr-1.5" />
                          {t("playersPage.playerDetail.transfer")}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => { setActiveDialogTeamId(c.teamId); setReleaseContract(toContractRow(c)) }}
                        >
                          <UserMinus className="h-3.5 w-3.5 mr-1.5" />
                          {t("playersPage.playerDetail.release")}
                        </Button>
                      </>
                    )}
                    {!isActive && (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={reopenContractMutation.isPending}
                        onClick={() => reopenContractMutation.mutate({ id: c.id })}
                      >
                        <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                        {t("playersPage.playerDetail.reopenContract.button")}
                      </Button>
                    )}
                    <div className="flex-1" />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive/50 hover:text-destructive"
                      onClick={() => setDeleteContractId(c.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                      {t("playersPage.playerDetail.deleteContract.title")}
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Edit Player Info Dialog                                            */}
      {/* ----------------------------------------------------------------- */}
      <Sheet open={editInfoOpen} onOpenChange={setEditInfoOpen}>
        <SheetContent size="lg">
          <SheetClose />
          <SheetHeader>
            <SheetTitle>{t("playersPage.dialogs.editTitle")}</SheetTitle>
            <SheetDescription>{t("playersPage.dialogs.editDescription")}</SheetDescription>
          </SheetHeader>

          <form onSubmit={handleEditSubmit} className="flex flex-1 flex-col overflow-hidden">
            <SheetBody className="space-y-6">
              {/* Photo */}
              <div>
                <Label className="text-xs text-muted-foreground mb-2 block">
                  {t("playersPage.fields.photo")}
                </Label>
                <ImageUpload
                  value={form.photoUrl || null}
                  onChange={(url) => setField("photoUrl", url || "")}
                  type="photo"
                  label={t("playersPage.fields.uploadPhoto")}
                />
              </div>

              {/* Name row */}
              <div className="grid grid-cols-2 gap-4">
                <FormField label={t("playersPage.fields.firstName")} error={formErrors.firstName} required>
                  <Input
                    value={form.firstName}
                    onChange={(e) => setField("firstName", e.target.value)}
                    placeholder={t("playersPage.fields.firstNamePlaceholder")}
                  />
                </FormField>
                <FormField label={t("playersPage.fields.lastName")} error={formErrors.lastName} required>
                  <Input
                    value={form.lastName}
                    onChange={(e) => setField("lastName", e.target.value)}
                    placeholder={t("playersPage.fields.lastNamePlaceholder")}
                  />
                </FormField>
              </div>

              {/* Date of birth + Nationality */}
              <div className="grid grid-cols-2 gap-4">
                <FormField label={t("playersPage.fields.dateOfBirth")} error={formErrors.dateOfBirth}>
                  <Input
                    type="date"
                    value={form.dateOfBirth}
                    onChange={(e) => setField("dateOfBirth", e.target.value)}
                  />
                </FormField>
                <FormField label={t("playersPage.fields.nationality")}>
                  <Input
                    value={form.nationality}
                    onChange={(e) => setField("nationality", e.target.value)}
                    placeholder={t("playersPage.fields.nationalityPlaceholder")}
                  />
                </FormField>
              </div>
            </SheetBody>

            <SheetFooter>
              <div className="flex-1" />
              <Button type="button" variant="outline" onClick={() => setEditInfoOpen(false)}>
                {t("cancel")}
              </Button>
              <Button type="submit" variant="accent" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? t("saving") : t("save")}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      {/* ----------------------------------------------------------------- */}
      {/* Sign to Team Dialog                                                */}
      {/* ----------------------------------------------------------------- */}
      {workingSeason && (
        <SignPlayerDialog
          open={signDialogOpen}
          onOpenChange={setSignDialogOpen}
          playerId={playerId}
          seasonId={workingSeason.id}
          teams={(teams ?? []).map((team) => ({
            id: team.id,
            name: team.name,
            shortName: team.shortName,
            city: team.city,
            logoUrl: team.logoUrl,
            primaryColor: team.primaryColor,
          }))}
          onSuccess={handleDialogSuccess}
        />
      )}

      {/* ----------------------------------------------------------------- */}
      {/* Contract Action Dialogs (Edit / Transfer / Release)                */}
      {/* ----------------------------------------------------------------- */}
      {activeDialogTeamId && workingSeason && (
        <>
          <EditContractDialog
            open={!!editContract}
            onOpenChange={(open) => {
              if (!open) {
                setEditContract(null)
                setActiveDialogTeamId(null)
                handleDialogSuccess()
              }
            }}
            contract={editContract}
            teamId={activeDialogTeamId}
            seasonId={workingSeason.id}
          />

          <TransferDialog
            open={!!transferContract}
            onOpenChange={(open) => {
              if (!open) {
                setTransferContract(null)
                setActiveDialogTeamId(null)
                handleDialogSuccess()
              }
            }}
            contract={transferContract}
            currentTeamId={activeDialogTeamId}
            seasonId={workingSeason.id}
            teams={(teams ?? []).map((team) => ({
              id: team.id,
              name: team.name,
              shortName: team.shortName,
              city: team.city,
              logoUrl: team.logoUrl,
              primaryColor: team.primaryColor,
            }))}
          />

          <ReleasePlayerDialog
            open={!!releaseContract}
            onOpenChange={(open) => {
              if (!open) {
                setReleaseContract(null)
                setActiveDialogTeamId(null)
                handleDialogSuccess()
              }
            }}
            contract={releaseContract}
            teamId={activeDialogTeamId}
            seasonId={workingSeason.id}
          />
        </>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* Delete Contract Confirmation Dialog                                */}
      {/* ----------------------------------------------------------------- */}
      <Sheet open={!!deleteContractId} onOpenChange={(open) => !open && setDeleteContractId(null)}>
        <SheetContent>
          <SheetClose />
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              {t("playersPage.playerDetail.deleteContract.title")}
            </SheetTitle>
            <SheetDescription>
              {t("playersPage.playerDetail.deleteContract.description")}
            </SheetDescription>
          </SheetHeader>

          <SheetBody className="space-y-4">
            {/* End contract alternative */}
            {(() => {
              const contractToDelete = deleteContractId
                ? (player?.contracts as ContractWithRelations[] | undefined)?.find((c) => c.id === deleteContractId)
                : null
              const isActive = contractToDelete && !contractToDelete.endSeasonId

              return isActive ? (
                <div className="p-3 rounded-md bg-muted/60 border border-border">
                  <p className="text-sm text-foreground font-medium mb-1.5">
                    {t("playersPage.playerDetail.deleteContract.endInstead")}
                  </p>
                  <p className="text-xs text-muted-foreground mb-3">
                    {t("playersPage.playerDetail.deleteContract.endInsteadDescription")}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (contractToDelete) {
                        setDeleteContractId(null)
                        setActiveDialogTeamId(contractToDelete.teamId)
                        setReleaseContract(toContractRow(contractToDelete))
                      }
                    }}
                  >
                    <UserMinus className="h-3.5 w-3.5 mr-1.5" />
                    {t("playersPage.playerDetail.release")}
                  </Button>
                </div>
              ) : null
            })()}

            {/* Destructive warning */}
            <div className="p-3 rounded-md bg-destructive/5 border border-destructive/15">
              <p className="text-sm font-medium text-destructive mb-2">
                {t("playersPage.playerDetail.deleteContract.warning")}
              </p>
              <ul className="text-sm text-destructive/80 space-y-1 list-disc list-inside">
                <li>{t("playersPage.playerDetail.deleteContract.consequences.lineups")}</li>
                <li>{t("playersPage.playerDetail.deleteContract.consequences.stats")}</li>
                <li>{t("playersPage.playerDetail.deleteContract.consequences.goalieStats")}</li>
              </ul>
            </div>
          </SheetBody>

          <SheetFooter>
            <div className="flex-1" />
            <Button type="button" variant="outline" onClick={() => setDeleteContractId(null)}>
              {t("cancel")}
            </Button>
            <Button
              variant="destructive"
              disabled={deleteContractMutation.isPending}
              onClick={() => {
                if (deleteContractId) {
                  deleteContractMutation.mutate({ id: deleteContractId })
                }
              }}
            >
              {deleteContractMutation.isPending
                ? t("playersPage.playerDetail.deleteContract.deleting")
                : t("playersPage.playerDetail.deleteContract.confirm")}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  )
}
