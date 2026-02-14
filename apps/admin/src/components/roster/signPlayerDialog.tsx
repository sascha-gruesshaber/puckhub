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
import { useMemo, useState } from "react"
import { trpc } from "@/trpc"
import { PlayerCombobox } from "~/components/playerCombobox"
import { useTranslation } from "~/i18n/use-translation"

interface SignPlayerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  teamId: string
  seasonId: string
  existingPlayerIds: string[]
}

function SignPlayerDialog({ open, onOpenChange, teamId, seasonId, existingPlayerIds }: SignPlayerDialogProps) {
  const { t } = useTranslation("common")
  const [selectedPlayerId, setSelectedPlayerId] = useState("")
  const [position, setPosition] = useState<"forward" | "defense" | "goalie">("forward")
  const [jerseyNumber, setJerseyNumber] = useState("")
  const [errors, setErrors] = useState<Record<string, string>>({})

  const utils = trpc.useUtils()
  const { data: allPlayers } = trpc.player.list.useQuery()

  const signMutation = trpc.contract.signPlayer.useMutation({
    onSuccess: () => {
      utils.contract.rosterForSeason.invalidate({ teamId, seasonId })
      close()
      toast.success(t("rosterPage.signDialog.toast.signed"))
    },
    onError: (err) => {
      toast.error(t("rosterPage.signDialog.toast.signError"), { description: err.message })
    },
  })

  const availablePlayers = useMemo(() => {
    if (!allPlayers) return []
    const existing = new Set(existingPlayerIds)
    return allPlayers.filter((p) => !existing.has(p.id))
  }, [allPlayers, existingPlayerIds])

  function close() {
    onOpenChange(false)
    setSelectedPlayerId("")
    setPosition("forward")
    setJerseyNumber("")
    setErrors({})
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const next: Record<string, string> = {}
    if (!selectedPlayerId) next.player = t("rosterPage.signDialog.validation.playerRequired")
    setErrors(next)
    if (Object.keys(next).length > 0) return

    signMutation.mutate({
      playerId: selectedPlayerId,
      teamId,
      seasonId,
      position,
      jerseyNumber: jerseyNumber ? Number(jerseyNumber) : undefined,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogClose onClick={close} />
        <DialogHeader>
          <DialogTitle>{t("rosterPage.signDialog.title")}</DialogTitle>
          <DialogDescription>{t("rosterPage.signDialog.description")}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 p-6 pt-2">
          {/* Player selection */}
          <FormField label={t("rosterPage.signDialog.fields.player")} error={errors.player} required>
            <PlayerCombobox
              players={availablePlayers.map((p) => ({
                id: p.id,
                firstName: p.firstName,
                lastName: p.lastName,
                dateOfBirth: p.dateOfBirth,
                nationality: p.nationality,
                photoUrl: p.photoUrl,
              }))}
              value={selectedPlayerId}
              onChange={(playerId) => {
                setSelectedPlayerId(playerId)
                setErrors((prev) => ({ ...prev, player: "" }))
              }}
              placeholder={t("rosterPage.signDialog.fields.playerSearchPlaceholder")}
            />
          </FormField>

          {/* Position */}
          <FormField label={t("rosterPage.signDialog.fields.position")} required>
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

          {/* Jersey Number */}
          <FormField label={t("rosterPage.signDialog.fields.jerseyNumber")}>
            <Input
              type="number"
              min="1"
              max="99"
              value={jerseyNumber}
              onChange={(e) => setJerseyNumber(e.target.value)}
              placeholder={t("rosterPage.signDialog.fields.jerseyNumberPlaceholder")}
            />
          </FormField>

          <DialogFooter className="p-0 pt-2">
            <Button type="button" variant="outline" onClick={close}>
              {t("cancel")}
            </Button>
            <Button type="submit" variant="accent" disabled={signMutation.isPending}>
              {signMutation.isPending
                ? t("rosterPage.signDialog.actions.signing")
                : t("rosterPage.signDialog.actions.sign")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export { SignPlayerDialog }
