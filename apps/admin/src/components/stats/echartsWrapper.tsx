import { Skeleton } from "@puckhub/ui"
import { lazy, Suspense } from "react"

const ReactECharts = lazy(() => import("echarts-for-react"))

interface EChartsWrapperProps {
  option: Record<string, unknown>
  height?: number | string
  className?: string
}

// Brand colors from CSS custom properties
const CHART_COLORS = [
  "hsl(217, 71%, 25%)", // primary (navy)
  "hsl(44, 87%, 66%)", // accent (gold)
  "hsl(0, 84%, 60%)", // destructive (red)
  "hsl(142, 71%, 45%)", // green
  "hsl(199, 89%, 48%)", // blue
  "hsl(270, 50%, 55%)", // purple
  "hsl(25, 95%, 53%)", // orange
  "hsl(330, 80%, 60%)", // pink
  "hsl(180, 60%, 45%)", // teal
  "hsl(60, 70%, 50%)", // yellow-green
]

function getBaseTheme() {
  return {
    color: CHART_COLORS,
    textStyle: {
      fontFamily: "Inter, system-ui, sans-serif",
      fontSize: 12,
      color: "hsl(215, 16%, 47%)", // muted-foreground
    },
    grid: {
      top: 40,
      right: 20,
      bottom: 30,
      left: 20,
      containLabel: true,
    },
  }
}

function EChartsWrapper({ option, height = 400, className }: EChartsWrapperProps) {
  const mergedOption = {
    ...getBaseTheme(),
    ...option,
    textStyle: {
      ...getBaseTheme().textStyle,
      ...(option.textStyle as Record<string, unknown> | undefined),
    },
  }

  return (
    <Suspense fallback={<Skeleton className="w-full rounded-lg" style={{ height }} />}>
      <ReactECharts
        option={mergedOption}
        style={{ height, width: "100%" }}
        className={className}
        opts={{ renderer: "svg" }}
        notMerge
      />
    </Suspense>
  )
}

export { EChartsWrapper, CHART_COLORS }
