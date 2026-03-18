import {
  Button,
  FormField,
  Input,
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
  toast,
} from "@puckhub/ui"
import { useEffect, useMemo, useState } from "react"
import { trpc } from "@/trpc"
import { ConfirmDialog } from "~/components/confirmDialog"
import { PlayerInfoCard } from "~/components/player/playerInfoCard"
import { useTranslation } from "~/i18n/use-translation"
import { resolveTranslatedError } from "~/lib/errorI18n"
import type { ContractRow } from "./rosterTable"

interface EditContractSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  contract: ContractRow | null
  seasonId: string
}

function EditContractSheet({ open, onOpenChange, contract, seasonId }: EditContractSheetProps) {
  const { t } = useTranslation("common")
  const { t: tErrors } = useTranslation("errors")
  const [position, setPosition] = useState<"forward" | "defense" | "goalie">("forward")
  const [jerseyNumber, setJerseyNumber] = useState("")
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false)

  const utils = trpc.useUtils()

  useEffect(() => {
    if (contract) {
      setPosition(contract.position as "forward" | "defense" | "goalie")
      setJerseyNumber(contract.jerseyNumber?.toString() ?? "")
    }
  }, [contract])

  // Track dirty state
  const isDirty = contract
    ? position !== contract.position || jerseyNumber !== (contract.jerseyNumber?.toString() ?? "")
    : false

  const updateMutation = trpc.contract.updateContract.useMutation({
    onSuccess: () => {
      if (contract?.teamId) {
        utils.contract.rosterForSeason.invalidate({ teamId: contract.teamId, seasonId })
      }
      utils.contract.rosterForSeasonAllTeams.invalidate({ seasonId })
      onOpenChange(false)
      toast.success(t("rosterPage.editDialog.toast.updated"))
    },
    onError: (err) => {
      toast.error(t("rosterPage.editDialog.toast.saveError"), { description: resolveTranslatedError(err, tErrors) })
    },
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!contract) return

    updateMutation.mutate({
      id: contract.id,
      position,
      jerseyNumber: jerseyNumber ? Number(jerseyNumber) : null,
    })
  }

  const { data: allSeasons } = trpc.season.list.useQuery(undefined, { enabled: open })

  const sinceSeasonName = useMemo(() => {
    if (!allSeasons || !contract) return null
    return allSeasons.find((s) => s.id === contract.startSeasonId)?.name ?? null
  }, [allSeasons, contract])

  if (!contract) return null

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange} dirty={isDirty} onDirtyClose={() => setConfirmCloseOpen(true)}>
        <SheetContent>
          <SheetClose />
          <SheetHeader>
            <SheetTitle>{t("rosterPage.editDialog.title")}</SheetTitle>
            <SheetDescription>
              {contract.player.firstName} {contract.player.lastName}
            </SheetDescription>
          </SheetHeader>

          <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
            <SheetBody className="space-y-6">
              <PlayerInfoCard
                player={contract.player}
                position={contract.position}
                jerseyNumber={contract.jerseyNumber}
                sinceSeasonName={sinceSeasonName}
              />

              <FormField label={t("rosterPage.editDialog.fields.position")} required>
                <Select value={position} onValueChange={(v) => setPosition(v as "forward" | "defense" | "goalie")}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="goalie">{t("rosterPage.positions.goalie")}</SelectItem>
                    <SelectItem value="defense">{t("rosterPage.positions.defense")}</SelectItem>
                    <SelectItem value="forward">{t("rosterPage.positions.forward")}</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>

              <FormField label={t("rosterPage.editDialog.fields.jerseyNumber")}>
                <Input
                  type="number"
                  min="1"
                  max="99"
                  value={jerseyNumber}
                  onChange={(e) => setJerseyNumber(e.target.value)}
                  placeholder={t("rosterPage.editDialog.fields.jerseyNumberPlaceholder")}
                />
              </FormField>
            </SheetBody>

            <SheetFooter>
              <div className="flex-1" />
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (isDirty) {
                    setConfirmCloseOpen(true)
                  } else {
                    onOpenChange(false)
                  }
                }}
              >
                {t("cancel")}
              </Button>
              <Button type="submit" variant="accent" disabled={updateMutation.isPending}>
                {updateMutation.isPending
                  ? t("rosterPage.editDialog.actions.saving")
                  : t("rosterPage.editDialog.actions.save")}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={confirmCloseOpen}
        onOpenChange={setConfirmCloseOpen}
        title={t("unsavedChanges.title", { defaultValue: "Ungespeicherte Änderungen" })}
        description={t("unsavedChanges.description", {
          defaultValue: "Du hast ungespeicherte Änderungen. Möchtest du wirklich schließen?",
        })}
        confirmLabel={t("unsavedChanges.discard", { defaultValue: "Verwerfen" })}
        variant="destructive"
        onConfirm={() => {
          setConfirmCloseOpen(false)
          onOpenChange(false)
        }}
      />
    </>
  )
}

export { EditContractSheet }
