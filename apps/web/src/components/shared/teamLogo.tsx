import { cn } from "~/lib/utils"

interface TeamLogoProps {
  name: string
  logoUrl?: string | null
  size?: "sm" | "md" | "lg"
  className?: string
}

const sizes = {
  sm: "h-6 w-6 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-16 w-16 text-xl",
}

export function TeamLogo({ name, logoUrl, size = "md", className }: TeamLogoProps) {
  if (logoUrl) {
    return <img src={logoUrl} alt={name} className={cn(sizes[size], "object-contain", className)} />
  }

  return (
    <div
      className={cn(
        sizes[size],
        "flex items-center justify-center rounded-full bg-web-primary/10 text-web-primary font-bold",
        className,
      )}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  )
}
