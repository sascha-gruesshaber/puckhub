import type * as React from "react"
import { cn } from "../lib/utils"
import { Label } from "./label"

interface FormFieldProps {
  label: string
  error?: string
  required?: boolean
  description?: string
  children: React.ReactNode
  className?: string
}

function FormField({ label, error, required, description, children, className }: FormFieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-sm">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
      {description && !error && <p className="text-xs text-muted-foreground">{description}</p>}
    </div>
  )
}

export { FormField, type FormFieldProps }
