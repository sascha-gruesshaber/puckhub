import { cn } from "~/lib/utils"

interface HtmlContentProps {
  html: string
  className?: string
}

export function HtmlContent({ html, className }: HtmlContentProps) {
  return (
    <div
      className={cn("prose-content", className)}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
