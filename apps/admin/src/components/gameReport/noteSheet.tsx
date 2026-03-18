import {
  Button,
  Checkbox,
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
  Textarea,
  toast,
} from "@puckhub/ui"
import { useEffect, useState } from "react"
import { trpc } from "@/trpc"
import { useTranslation } from "~/i18n/use-translation"
import { resolveTranslatedError } from "~/lib/errorI18n"
import type { TeamInfo } from "./gameTimeline"

interface NoteSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  gameId: string
  homeTeam: TeamInfo
  awayTeam: TeamInfo
  editingEvent?: {
    id: string
    teamId: string | null
    period: number | null
    timeMinutes: number | null
    timeSeconds: number | null
    noteText: string | null
    notePublic: boolean
  } | null
}

function NoteSheet({ open, onOpenChange, gameId, homeTeam, awayTeam, editingEvent }: NoteSheetProps) {
  const { t } = useTranslation("common")
  const { t: tErrors } = useTranslation("errors")
  const utils = trpc.useUtils()

  const isEdit = !!editingEvent

  const [noteText, setNoteText] = useState("")
  const [notePublic, setNotePublic] = useState(true)
  const [gameWide, setGameWide] = useState(true)
  const [period, setPeriod] = useState(1)
  const [minutes, setMinutes] = useState(0)
  const [seconds, setSeconds] = useState(0)
  const [teamId, setTeamId] = useState<string | "">("")

  useEffect(() => {
    if (open) {
      setNoteText(editingEvent?.noteText ?? "")
      setNotePublic(editingEvent?.notePublic ?? true)
      const isGameWide = editingEvent ? editingEvent.period == null : true
      setGameWide(isGameWide)
      setPeriod(editingEvent?.period ?? 1)
      setMinutes(editingEvent?.timeMinutes ?? 0)
      setSeconds(editingEvent?.timeSeconds ?? 0)
      setTeamId(editingEvent?.teamId ?? "")
    }
  }, [open, editingEvent])

  const addEvent = trpc.gameReport.addEvent.useMutation({
    onSuccess: () => {
      toast.success(t("gameReport.toast.noteAdded"))
      utils.gameReport.getReport.invalidate({ gameId })
      onOpenChange(false)
    },
    onError: (err) => toast.error(t("gameReport.toast.error"), { description: resolveTranslatedError(err, tErrors) }),
  })

  const updateEvent = trpc.gameReport.updateEvent.useMutation({
    onSuccess: () => {
      toast.success(t("gameReport.toast.noteUpdated"))
      utils.gameReport.getReport.invalidate({ gameId })
      onOpenChange(false)
    },
    onError: (err) => toast.error(t("gameReport.toast.error"), { description: resolveTranslatedError(err, tErrors) }),
  })

  const isPending = addEvent.isPending || updateEvent.isPending

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!noteText.trim()) return

    if (isEdit) {
      updateEvent.mutate({
        id: editingEvent.id,
        noteText: noteText.trim(),
        notePublic,
        period: gameWide ? null : period,
        timeMinutes: gameWide ? null : minutes,
        timeSeconds: gameWide ? null : seconds,
        teamId: gameWide || !teamId ? null : teamId,
      })
    } else {
      addEvent.mutate({
        gameId,
        eventType: "note",
        noteText: noteText.trim(),
        notePublic,
        ...(gameWide
          ? {}
          : {
              period,
              timeMinutes: minutes,
              timeSeconds: seconds,
              ...(teamId ? { teamId } : {}),
            }),
      })
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetClose />

        <SheetHeader>
          <SheetTitle>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-blue-500 ring-4 ring-blue-500/20" />
              {isEdit ? t("gameReport.editNote") : t("gameReport.addNote")}
            </div>
          </SheetTitle>
          <SheetDescription>{t("gameReport.noteDescription")}</SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit}>
          <SheetBody className="space-y-5">
            {/* Note text */}
            <FormField label={t("gameReport.fields.noteText")} required>
              <Textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder={t("gameReport.noteDescription")}
                rows={3}
                className="resize-y"
              />
            </FormField>

            {/* Public toggle */}
            <div className="flex items-center gap-2">
              <Checkbox id="note-public" checked={notePublic} onCheckedChange={(c) => setNotePublic(!!c)} />
              <Label htmlFor="note-public" className="text-sm cursor-pointer">
                {t("gameReport.notePublicLabel")}
              </Label>
            </div>

            <div className="border-t border-border/60" />

            {/* Game-wide toggle */}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Checkbox id="note-game-wide" checked={gameWide} onCheckedChange={(c) => setGameWide(!!c)} />
                <Label htmlFor="note-game-wide" className="text-sm cursor-pointer">
                  {t("gameReport.gameWideNote")}
                </Label>
              </div>
              <p className="text-xs text-muted-foreground ml-6">{t("gameReport.gameWideNoteHint")}</p>
            </div>

            {/* Period + Time + Team (when not game-wide) */}
            {!gameWide && (
              <>
                <div className="grid grid-cols-3 gap-3">
                  <FormField label={t("gameReport.fields.period")}>
                    <Select value={String(period)} onValueChange={(v) => setPeriod(Number(v))}>
                      <SelectTrigger className="h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1. {t("gameReport.period")}</SelectItem>
                        <SelectItem value="2">2. {t("gameReport.period")}</SelectItem>
                        <SelectItem value="3">3. {t("gameReport.period")}</SelectItem>
                        <SelectItem value="4">{t("gameReport.overtime")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormField>
                  <FormField label={t("gameReport.fields.minutes")}>
                    <Input
                      type="number"
                      min={0}
                      max={20}
                      value={minutes}
                      onChange={(e) => setMinutes(Number(e.target.value))}
                    />
                  </FormField>
                  <FormField label={t("gameReport.fields.seconds")}>
                    <Input
                      type="number"
                      min={0}
                      max={59}
                      value={seconds}
                      onChange={(e) => setSeconds(Number(e.target.value))}
                    />
                  </FormField>
                </div>

                {/* Team selector */}
                <FormField label={`${t("gameReport.fields.team")} (${t("gameReport.fields.noteText").toLowerCase()})`}>
                  <Select value={teamId || "_none"} onValueChange={(v) => setTeamId(v === "_none" ? "" : v)}>
                    <SelectTrigger className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">—</SelectItem>
                      <SelectItem value={homeTeam.id}>{homeTeam.shortName}</SelectItem>
                      <SelectItem value={awayTeam.id}>{awayTeam.shortName}</SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>
              </>
            )}
          </SheetBody>

          <SheetFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={isPending || !noteText.trim()}>
              {isPending ? t("saving") : t("save")}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}

export { NoteSheet }
