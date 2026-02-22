import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  FormField,
  Input,
  toast,
} from "@puckhub/ui"
import { useEffect, useState } from "react"
import { trpc } from "@/trpc"
import { resolveTranslatedError } from "~/lib/errorI18n"
import { useTranslation } from "~/i18n/use-translation"
import type { ContractRow } from "./rosterTable"

interface EditContractDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  contract: ContractRow | null
  teamId: string
  seasonId: string
}

function EditContractDialog({ open, onOpenChange, contract, teamId, seasonId }: EditContractDialogProps) {
  const { t } = useTranslation("common")
  const { t: tErrors } = useTranslation("errors")
  const [position, setPosition] = useState<"forward" | "defense" | "goalie">("forward")
  const [jerseyNumber, setJerseyNumber] = useState("")

  const utils = trpc.useUtils()

  useEffect(() => {
    if (contract) {
      setPosition(contract.position as "forward" | "defense" | "goalie")
      setJerseyNumber(contract.jerseyNumber?.toString() ?? "")
    }
  }, [contract])

  const updateMutation = trpc.contract.updateContract.useMutation({
    onSuccess: () => {
      utils.contract.rosterForSeason.invalidate({ teamId, seasonId })
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

  if (!contract) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogClose onClick={() => onOpenChange(false)} />
        <DialogHeader>
          <DialogTitle>{t("rosterPage.editDialog.title")}</DialogTitle>
          <DialogDescription>
            {contract.player.firstName} {contract.player.lastName}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 p-6 pt-2">
          <FormField label={t("rosterPage.editDialog.fields.position")} required>
            <select
              value={position}
              onChange={(e) => setPosition(e.target.value as "forward" | "defense" | "goalie")}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="goalie">{t("rosterPage.positions.goalie")}</option>
              <option value="defense">{t("rosterPage.positions.defense")}</option>
              <option value="forward">{t("rosterPage.positions.forward")}</option>
            </select>
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

          <DialogFooter className="p-0 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("cancel")}
            </Button>
            <Button type="submit" variant="accent" disabled={updateMutation.isPending}>
              {updateMutation.isPending
                ? t("rosterPage.editDialog.actions.saving")
                : t("rosterPage.editDialog.actions.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export { EditContractDialog }
