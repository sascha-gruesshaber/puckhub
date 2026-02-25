import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@puckhub/ui"
import { AlertTriangle, ArrowLeft, Check, Pause, Trash2, X } from "lucide-react"
import { useEffect, useState } from "react"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface DeactivateOption {
  title: string
  description: string
  preserved: string[]
  buttonLabel: string
  available: boolean
  unavailableReason?: string
}

interface PermanentDeleteOption {
  title: string
  description: string
  consequences: string[]
  buttonLabel: string
  confirmTitle: string
  confirmWarning: string
  confirmButton: string
}

interface RemoveDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  subtitle: string
  deactivate: DeactivateOption
  onDeactivate: () => void
  isDeactivating?: boolean
  permanentDelete: PermanentDeleteOption
  onDelete: () => void
  isDeleting?: boolean
  labels: {
    recommended: string
    or: string
    back: string
    cancel: string
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
function RemoveDialog({
  open,
  onOpenChange,
  title,
  subtitle,
  deactivate,
  onDeactivate,
  isDeactivating,
  permanentDelete,
  onDelete,
  isDeleting,
  labels,
}: RemoveDialogProps) {
  const [step, setStep] = useState<"choose" | "confirm">("choose")

  // Reset to step 1 when dialog closes
  useEffect(() => {
    if (!open) {
      const timer = setTimeout(() => setStep("choose"), 200)
      return () => clearTimeout(timer)
    }
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogClose onClick={() => onOpenChange(false)} />

        {step === "choose" ? (
          <>
            <DialogHeader>
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription>{subtitle}</DialogDescription>
            </DialogHeader>

            <div className="px-6 pb-6 space-y-3">
              {/* ── Deactivate option ── */}
              <div
                className={`rounded-xl border p-5 transition-colors ${
                  deactivate.available
                    ? "border-emerald-200 bg-emerald-50/60"
                    : "border-border bg-muted/30 opacity-60"
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                      deactivate.available
                        ? "bg-emerald-100 text-emerald-600"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <Pause className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-[15px]">{deactivate.title}</h3>
                      {deactivate.available && (
                        <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
                          {labels.recommended}
                        </span>
                      )}
                    </div>
                    <p className="text-[13px] text-muted-foreground leading-relaxed">
                      {deactivate.available ? deactivate.description : deactivate.unavailableReason}
                    </p>

                    {deactivate.available && (
                      <>
                        <ul className="mt-3 space-y-1">
                          {deactivate.preserved.map((item) => (
                            <li key={item} className="flex items-center gap-2 text-[13px] text-emerald-700">
                              <Check className="h-3.5 w-3.5 shrink-0" strokeWidth={2.5} />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                        <Button
                          size="sm"
                          className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white"
                          onClick={onDeactivate}
                          disabled={isDeactivating}
                        >
                          {isDeactivating ? `${deactivate.buttonLabel}...` : deactivate.buttonLabel}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* ── Divider ── */}
              <div className="flex items-center gap-3 px-2">
                <div className="flex-1 h-px bg-border" />
                <span className="text-[11px] text-muted-foreground/60 font-medium uppercase tracking-widest">
                  {labels.or}
                </span>
                <div className="flex-1 h-px bg-border" />
              </div>

              {/* ── Delete option ── */}
              <div className="rounded-xl border border-red-200/80 bg-red-50/30 p-5">
                <div className="flex items-start gap-3.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-100/80 text-red-500">
                    <Trash2 className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-[15px] mb-1">{permanentDelete.title}</h3>
                    <p className="text-[13px] text-muted-foreground leading-relaxed">
                      {permanentDelete.description}
                    </p>
                    <ul className="mt-3 space-y-1">
                      {permanentDelete.consequences.map((item) => (
                        <li key={item} className="flex items-center gap-2 text-[13px] text-red-600/80">
                          <X className="h-3.5 w-3.5 shrink-0" strokeWidth={2.5} />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4 text-destructive hover:text-destructive border-red-200 hover:bg-red-50 hover:border-red-300"
                      onClick={() => setStep("confirm")}
                    >
                      {permanentDelete.buttonLabel}
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t px-6 py-4 flex justify-end">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                {labels.cancel}
              </Button>
            </div>
          </>
        ) : (
          /* ── Step 2: Final delete confirmation ── */
          <>
            <div className="relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-red-50 to-transparent pointer-events-none" />
              <DialogHeader className="relative pt-8 pb-2 items-center text-center">
                <div className="mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-red-100 ring-4 ring-red-100/50">
                  <AlertTriangle className="h-7 w-7 text-red-600" />
                </div>
                <DialogTitle>{permanentDelete.confirmTitle}</DialogTitle>
                <DialogDescription className="max-w-sm mx-auto">
                  {permanentDelete.confirmWarning}
                </DialogDescription>
              </DialogHeader>
            </div>

            <div className="px-6 pb-2">
              <ul className="space-y-2 rounded-xl bg-red-50/60 border border-red-100 p-4">
                {permanentDelete.consequences.map((item) => (
                  <li key={item} className="flex items-center gap-2.5 text-[13px] text-red-700">
                    <div className="h-1.5 w-1.5 rounded-full bg-red-400 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="border-t px-6 py-4 flex justify-between">
              <Button variant="outline" onClick={() => setStep("choose")}>
                <ArrowLeft className="mr-2 h-3.5 w-3.5" />
                {labels.back}
              </Button>
              <Button variant="destructive" onClick={onDelete} disabled={isDeleting}>
                {isDeleting ? `${permanentDelete.confirmButton}...` : permanentDelete.confirmButton}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

export { RemoveDialog }
export type { RemoveDialogProps }
