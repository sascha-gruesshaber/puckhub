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
import { TeamCombobox } from "~/components/teamCombobox"
import { resolveTranslatedError } from "~/lib/errorI18n"
import { useTranslation } from "~/i18n/use-translation"
import type { ContractRow } from "./rosterTable"

interface TransferDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  contract: ContractRow | null
  currentTeamId: string
  seasonId: string
  teams: {
    id: string
    name: string
    shortName: string
    city?: string | null
    logoUrl?: string | null
    primaryColor?: string | null
  }[]
}

function TransferDialog({ open, onOpenChange, contract, currentTeamId, seasonId, teams }: TransferDialogProps) {
  const { t } = useTranslation("common")
  const { t: tErrors } = useTranslation("errors")
  const [newTeamId, setNewTeamId] = useState("")
  const [position, setPosition] = useState<"forward" | "defense" | "goalie">("forward")
  const [jerseyNumber, setJerseyNumber] = useState("")
  const [errors, setErrors] = useState<Record<string, string>>({})

  const utils = trpc.useUtils()

  useEffect(() => {
    if (contract) {
      setPosition(contract.position as "forward" | "defense" | "goalie")
      setJerseyNumber("")
      setNewTeamId("")
      setErrors({})
    }
  }, [contract])

  const otherTeams = teams.filter((t) => t.id !== currentTeamId)

  const transferMutation = trpc.contract.transferPlayer.useMutation({
    onSuccess: () => {
      utils.contract.rosterForSeason.invalidate({ teamId: currentTeamId, seasonId })
      if (newTeamId) {
        utils.contract.rosterForSeason.invalidate({ teamId: newTeamId, seasonId })
      }
      onOpenChange(false)
      toast.success(t("rosterPage.transferDialog.toast.transferred"))
    },
    onError: (err) => {
      toast.error(t("rosterPage.transferDialog.toast.transferError"), { description: resolveTranslatedError(err, tErrors) })
    },
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!contract) return

    const next: Record<string, string> = {}
    if (!newTeamId) next.team = t("rosterPage.transferDialog.validation.teamRequired")
    setErrors(next)
    if (Object.keys(next).length > 0) return

    transferMutation.mutate({
      contractId: contract.id,
      newTeamId,
      seasonId,
      position,
      jerseyNumber: jerseyNumber ? Number(jerseyNumber) : undefined,
    })
  }

  if (!contract) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogClose onClick={() => onOpenChange(false)} />
        <DialogHeader>
          <DialogTitle>{t("rosterPage.transferDialog.title")}</DialogTitle>
          <DialogDescription>
            {t("rosterPage.transferDialog.description", {
              player: `${contract.player.firstName} ${contract.player.lastName}`,
            })}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 p-6 pt-2">
          <FormField label={t("rosterPage.transferDialog.fields.newTeam")} error={errors.team} required>
            <TeamCombobox
              teams={otherTeams.map((t) => ({
                id: t.id,
                name: t.name,
                shortName: t.shortName,
                city: t.city,
                logoUrl: t.logoUrl,
                primaryColor: t.primaryColor,
              }))}
              value={newTeamId}
              onChange={(teamId) => {
                setNewTeamId(teamId)
                setErrors((prev) => ({ ...prev, team: "" }))
              }}
              placeholder={t("rosterPage.transferDialog.fields.newTeamPlaceholder")}
            />
          </FormField>

          <FormField label={t("rosterPage.transferDialog.fields.position")}>
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

          <FormField label={t("rosterPage.transferDialog.fields.newJerseyNumber")}>
            <Input
              type="number"
              min="1"
              max="99"
              value={jerseyNumber}
              onChange={(e) => setJerseyNumber(e.target.value)}
              placeholder={t("rosterPage.transferDialog.fields.jerseyNumberPlaceholder")}
            />
          </FormField>

          <DialogFooter className="p-0 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("cancel")}
            </Button>
            <Button type="submit" variant="accent" disabled={transferMutation.isPending}>
              {transferMutation.isPending
                ? t("rosterPage.transferDialog.actions.transferring")
                : t("rosterPage.transferDialog.actions.transfer")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export { TransferDialog }
