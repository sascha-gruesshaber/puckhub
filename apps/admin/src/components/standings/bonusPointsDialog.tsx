import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from "@puckhub/ui"
import { useState } from "react"
import { TeamCombobox } from "~/components/teamCombobox"
import { useTranslation } from "~/i18n/use-translation"

interface Team {
  id: string
  name: string
  shortName: string
  city?: string | null
  logoUrl?: string | null
  primaryColor?: string | null
}

interface BonusPointsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  teams: Team[]
  initialValues?: { id: string; teamId: string; points: number; reason?: string | null }
  onSave: (data: { teamId: string; points: number; reason?: string }) => void
  isPending?: boolean
}

function BonusPointsDialog({ open, onOpenChange, teams, initialValues, onSave, isPending }: BonusPointsDialogProps) {
  const { t } = useTranslation("common")
  const isEditing = !!initialValues

  const [teamId, setTeamId] = useState(initialValues?.teamId ?? "")
  const [points, setPoints] = useState(String(initialValues?.points ?? ""))
  const [reason, setReason] = useState(initialValues?.reason ?? "")

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const numPoints = parseInt(points, 10)
    if (!teamId || Number.isNaN(numPoints)) return
    onSave({ teamId, points: numPoints, reason: reason || undefined })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogClose onClick={() => onOpenChange(false)} />
        <DialogHeader>
          <DialogTitle>
            {isEditing ? t("standingsPage.bonusPoints.edit") : t("standingsPage.bonusPoints.add")}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 px-6">
          {!isEditing && (
            <div className="space-y-2">
              <Label>{t("standingsPage.bonusPoints.team")}</Label>
              <TeamCombobox teams={teams} value={teamId} onChange={setTeamId} />
            </div>
          )}
          <div className="space-y-2">
            <Label>{t("standingsPage.bonusPoints.points")}</Label>
            <Input type="number" value={points} onChange={(e) => setPoints(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>{t("standingsPage.bonusPoints.reason")}</Label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t("standingsPage.bonusPoints.reasonPlaceholder")}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={isPending || !teamId || !points}>
              {isPending ? t("saving") : t("save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export { BonusPointsDialog }
