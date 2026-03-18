import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"
import * as React from "react"
import { cn } from "../lib/utils"

// ---------------------------------------------------------------------------
// Dialog — controlled wrapper around Radix Dialog
// ---------------------------------------------------------------------------
interface DialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
}

function Dialog({ open, onOpenChange, children }: DialogProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className="fixed left-[50%] top-[50%] z-50 translate-x-[-50%] translate-y-[-50%] duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]"
          aria-describedby={undefined}
        >
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

// ---------------------------------------------------------------------------
// DialogContent — visual container (rounded card)
// ---------------------------------------------------------------------------
const DialogContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("relative mx-auto w-full max-w-2xl rounded-lg border bg-background shadow-lg", className)}
      {...props}
    >
      {children}
    </div>
  ),
)
DialogContent.displayName = "DialogContent"

// ---------------------------------------------------------------------------
// DialogHeader
// ---------------------------------------------------------------------------
const DialogHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col space-y-1.5 p-6 pb-4", className)} {...props} />
  ),
)
DialogHeader.displayName = "DialogHeader"

// ---------------------------------------------------------------------------
// DialogTitle — uses Radix for accessibility
// ---------------------------------------------------------------------------
const DialogTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <DialogPrimitive.Title asChild>
      <h2 ref={ref} className={cn("text-lg font-semibold leading-none tracking-tight", className)} {...props} />
    </DialogPrimitive.Title>
  ),
)
DialogTitle.displayName = "DialogTitle"

// ---------------------------------------------------------------------------
// DialogDescription
// ---------------------------------------------------------------------------
const DialogDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <DialogPrimitive.Description asChild>
      <p ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
    </DialogPrimitive.Description>
  ),
)
DialogDescription.displayName = "DialogDescription"

// ---------------------------------------------------------------------------
// DialogFooter
// ---------------------------------------------------------------------------
const DialogFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex items-center justify-end gap-2 p-6 pt-4", className)} {...props} />
  ),
)
DialogFooter.displayName = "DialogFooter"

// ---------------------------------------------------------------------------
// DialogClose — X button (regular button, NOT Radix Close, so callers
// retain full control over close behavior via onClick)
// ---------------------------------------------------------------------------
const DialogClose = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ className, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      className={cn(
        "absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        className,
      )}
      {...props}
    >
      <X size={15} />
      <span className="sr-only">Close</span>
    </button>
  ),
)
DialogClose.displayName = "DialogClose"

export { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle }
