import * as DialogPrimitive from "@radix-ui/react-dialog"
import { cva, type VariantProps } from "class-variance-authority"
import { X } from "lucide-react"
import * as React from "react"
import { cn } from "../lib/utils"

// ---------------------------------------------------------------------------
// Context — lets SheetClose trigger close through the Sheet's dirty logic
// ---------------------------------------------------------------------------
const SheetContext = React.createContext<{ requestClose: () => void }>({
  requestClose: () => {},
})

// ---------------------------------------------------------------------------
// Sheet (root) — wraps Radix Dialog with slide-in behavior
// ---------------------------------------------------------------------------
interface SheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** When true, closing (backdrop click, Escape, X button) triggers onDirtyClose instead */
  dirty?: boolean
  /** Called when user tries to close a dirty sheet */
  onDirtyClose?: () => void
  children: React.ReactNode
}

function Sheet({ open, onOpenChange, dirty, onDirtyClose, children }: SheetProps) {
  const requestClose = React.useCallback(() => {
    if (dirty && onDirtyClose) {
      onDirtyClose()
    } else {
      onOpenChange(false)
    }
  }, [dirty, onDirtyClose, onOpenChange])

  // Intercept Radix onOpenChange to respect dirty state
  const handleOpenChange = React.useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        requestClose()
      } else {
        onOpenChange(true)
      }
    },
    [requestClose, onOpenChange],
  )

  const ctx = React.useMemo(() => ({ requestClose }), [requestClose])

  return (
    <SheetContext.Provider value={ctx}>
      <DialogPrimitive.Root open={open} onOpenChange={handleOpenChange}>
        {children}
      </DialogPrimitive.Root>
    </SheetContext.Provider>
  )
}

// ---------------------------------------------------------------------------
// SheetContent — the sliding panel with size variants
// ---------------------------------------------------------------------------
const sheetContentVariants = cva(
  "relative ml-auto flex h-full w-full flex-col border-l bg-background shadow-xl sm:min-w-[500px]",
  {
    variants: {
      size: {
        default: "max-w-[480px]",
        lg: "max-w-[640px]",
        wide: "max-w-[768px]",
      },
    },
    defaultVariants: {
      size: "default",
    },
  },
)

interface SheetContentProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof sheetContentVariants> {}

const SheetContent = React.forwardRef<HTMLDivElement, SheetContentProps>(
  ({ className, size, children, ...props }, ref) => (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
      <DialogPrimitive.Content
        className="fixed inset-y-0 right-0 z-50 flex data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right duration-200"
        aria-describedby={undefined}
      >
        <div ref={ref} className={cn(sheetContentVariants({ size }), className)} {...props}>
          {children}
        </div>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  ),
)
SheetContent.displayName = "SheetContent"

// ---------------------------------------------------------------------------
// SheetHeader — top area with title + description
// ---------------------------------------------------------------------------
const SheetHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col space-y-1.5 border-b px-6 py-5 pr-14", className)} {...props} />
  ),
)
SheetHeader.displayName = "SheetHeader"

// ---------------------------------------------------------------------------
// SheetTitle
// ---------------------------------------------------------------------------
const SheetTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <DialogPrimitive.Title asChild>
      <h2 ref={ref} className={cn("text-lg font-semibold leading-none tracking-tight", className)} {...props} />
    </DialogPrimitive.Title>
  ),
)
SheetTitle.displayName = "SheetTitle"

// ---------------------------------------------------------------------------
// SheetDescription
// ---------------------------------------------------------------------------
const SheetDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <DialogPrimitive.Description asChild>
      <p ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
    </DialogPrimitive.Description>
  ),
)
SheetDescription.displayName = "SheetDescription"

// ---------------------------------------------------------------------------
// SheetBody — scrollable middle area
// ---------------------------------------------------------------------------
const SheetBody = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex-1 overflow-y-auto p-6", className)} {...props} />
  ),
)
SheetBody.displayName = "SheetBody"

// ---------------------------------------------------------------------------
// SheetFooter — fixed bottom with border-top
// ---------------------------------------------------------------------------
const SheetFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex items-center gap-2 border-t px-6 py-4", className)} {...props} />
  ),
)
SheetFooter.displayName = "SheetFooter"

// ---------------------------------------------------------------------------
// SheetClose — X button, uses context so it respects dirty state
// No onClick prop needed — it automatically goes through Sheet's requestClose
// ---------------------------------------------------------------------------
const SheetClose = React.forwardRef<HTMLButtonElement, Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onClick">>(
  ({ className, ...props }, ref) => {
    const { requestClose } = React.useContext(SheetContext)

    return (
      <button
        ref={ref}
        type="button"
        className={cn(
          "absolute z-10 rounded-md p-1.5 opacity-70 transition-all hover:opacity-100 hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring",
          className,
        )}
        style={{ right: "1rem", top: "1rem" }}
        onClick={requestClose}
        {...props}
      >
        <X size={16} />
        <span className="sr-only">Close</span>
      </button>
    )
  },
)
SheetClose.displayName = "SheetClose"

export { Sheet, SheetBody, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle }
