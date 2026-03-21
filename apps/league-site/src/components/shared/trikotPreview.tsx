interface TrikotPreviewProps {
  svg: string
  primaryColor: string
  secondaryColor?: string | null
  size?: "sm" | "md" | "lg"
  className?: string
}

const sizeMap = {
  sm: { width: 50, height: 40 },
  md: { width: 100, height: 80 },
  lg: { width: 150, height: 120 },
} as const

function TrikotPreview({ svg, primaryColor, secondaryColor, size = "md", className }: TrikotPreviewProps) {
  const resolved = svg
    .replace(/\{\{color_brust\}\}/g, primaryColor)
    .replace(/\{\{color_schulter\}\}/g, secondaryColor || primaryColor)

  const { width, height } = sizeMap[size]

  return (
    <div
      className={className}
      style={{ width, height, overflow: "hidden" }}
      dangerouslySetInnerHTML={{
        __html: resolved
          .replace(/(<svg[^>]*)\bwidth="[^"]*"/, "$1")
          .replace(/(<svg[^>]*)\bheight="[^"]*"/, "$1")
          .replace(/<svg([^>]*)>/, '<svg$1 viewBox="0 0 250 200" style="width:100%;height:100%">'),
      }}
    />
  )
}

export { TrikotPreview }
