import { cn } from "@puckhub/ui"
import { Image, Loader2, X } from "lucide-react"
import { useCallback, useRef, useState } from "react"

interface ImageUploadProps {
  value?: string | null
  onChange: (url: string | null) => void
  type: "logo" | "photo"
  label: string
  className?: string
}

export function ImageUpload({ value, onChange, type, label, className }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const uploadFile = useCallback(
    async (file: File) => {
      setUploading(true)
      try {
        const formData = new FormData()
        formData.append("file", file)
        formData.append("type", type)

        const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:3001"
        const res = await fetch(`${apiUrl}/api/upload`, {
          method: "POST",
          body: formData,
          credentials: "include",
        })

        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || "Upload failed")
        }

        const data = await res.json()
        onChange(`${apiUrl}${data.url}`)
      } catch (err) {
        console.error("Upload failed:", err)
      } finally {
        setUploading(false)
      }
    },
    [type, onChange],
  )

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) uploadFile(file)
      if (inputRef.current) inputRef.current.value = ""
    },
    [uploadFile],
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      const file = e.dataTransfer.files[0]
      if (file) uploadFile(file)
    },
    [uploadFile],
  )

  const isSquare = type === "logo"

  if (value) {
    return (
      <div className={cn("relative group", className)}>
        <div
          className={cn(
            "overflow-hidden rounded-lg border-2 border-border bg-muted",
            isSquare ? "aspect-square w-full max-w-[160px]" : "aspect-[16/9] w-full",
          )}
        >
          <img src={value} alt={label} className="h-full w-full object-cover" />
        </div>
        <button
          type="button"
          onClick={() => onChange(null)}
          className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground text-xs opacity-0 transition-opacity group-hover:opacity-100"
        >
          <X size={12} />
        </button>
      </div>
    )
  }

  return (
    <div className={className}>
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click()
        }}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors",
          dragOver
            ? "border-[hsl(var(--accent))] bg-[hsl(var(--accent)/0.05)]"
            : "border-border hover:border-muted-foreground/50",
          isSquare ? "aspect-square w-full max-w-[160px]" : "aspect-[16/9] w-full",
          uploading && "pointer-events-none opacity-60",
        )}
      >
        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Hochladen...</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1.5 p-3 text-center">
            <Image className="h-8 w-8 text-muted-foreground/50" strokeWidth={1.5} />
            <span className="text-xs font-medium text-muted-foreground">{label}</span>
            <span className="text-[10px] text-muted-foreground/60">Klicken oder ziehen</span>
          </div>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/svg+xml"
        className="hidden"
        onChange={handleFileSelect}
      />
    </div>
  )
}
