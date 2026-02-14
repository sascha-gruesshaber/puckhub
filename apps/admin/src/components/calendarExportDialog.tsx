import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  toast,
} from "@puckhub/ui"
import { Check, Copy } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "~/i18n/use-translation"

interface CalendarExportDialogProps {
  /**
   * Whether the dialog is open
   */
  open: boolean
  /**
   * Callback when the dialog open state changes
   */
  onOpenChange: (open: boolean) => void
  /**
   * Season ID for the calendar export
   */
  seasonId: string
  /**
   * Optional team ID to filter the calendar export
   */
  teamId?: string
  /**
   * Number of games that will be included in the export
   */
  gameCount: number
}

/**
 * Dialog for displaying and copying the calendar subscription URL.
 * Allows users to subscribe to game schedules in their calendar apps (Google Calendar, Apple Calendar, Outlook, etc.)
 */
export function CalendarExportDialog({ open, onOpenChange, seasonId, teamId, gameCount }: CalendarExportDialogProps) {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)

  // Build subscription URL
  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3001"
  const params = new URLSearchParams()
  params.set("seasonId", seasonId)
  if (teamId) {
    params.set("teamId", teamId)
  }
  const subscriptionUrl = `${apiUrl}/api/calendar/export.ics?${params.toString()}`

  // Handle copy to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(subscriptionUrl)
      setCopied(true)
      toast.success(t("gamesPage.calendarExport.copied"))

      // Reset copied state after 2 seconds
      setTimeout(() => {
        setCopied(false)
      }, 2000)
    } catch (_error) {
      toast.error("Failed to copy URL")
    }
  }

  // Reset copied state when dialog closes
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setCopied(false)
    }
    onOpenChange(newOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogClose onClick={() => handleOpenChange(false)} />
        <DialogHeader>
          <DialogTitle>{t("gamesPage.calendarExport.title")}</DialogTitle>
          <DialogDescription>{t("gamesPage.calendarExport.description")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Game count */}
          <div className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
            {t("gamesPage.calendarExport.eventCount", { count: gameCount })}
          </div>

          {/* Subscription URL */}
          <div className="space-y-2">
            <Label htmlFor="subscription-url">{t("gamesPage.calendarExport.urlLabel")}</Label>
            <div className="flex gap-2">
              <Input
                id="subscription-url"
                value={subscriptionUrl}
                readOnly
                className="font-mono text-xs"
                onClick={(e) => e.currentTarget.select()}
              />
              <Button
                type="button"
                variant={copied ? "default" : "outline"}
                size="icon"
                onClick={handleCopy}
                className="shrink-0"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Instructions */}
          <div className="rounded-md border border-border p-4 text-sm">
            <p className="mb-2 font-medium">{t("gamesPage.calendarExport.instructions")}</p>
            <ul className="ml-4 list-disc space-y-1 text-muted-foreground">
              <li>
                <strong>Google Calendar:</strong> Settings → Add calendar → From URL
              </li>
              <li>
                <strong>Apple Calendar:</strong> File → New Calendar Subscription
              </li>
              <li>
                <strong>Outlook:</strong> Add calendar → Subscribe from web
              </li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" onClick={() => handleOpenChange(false)}>
            {t("cancel")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
