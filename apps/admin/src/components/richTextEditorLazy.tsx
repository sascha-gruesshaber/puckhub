import { Skeleton } from "@puckhub/ui"
import { lazy, Suspense } from "react"

const RichTextEditor = lazy(() => import("./richTextEditor").then((m) => ({ default: m.RichTextEditor })))

interface RichTextEditorLazyProps {
  content: string
  onChange: (html: string) => void
  placeholder?: string
}

export function RichTextEditorLazy(props: RichTextEditorLazyProps) {
  return (
    <Suspense fallback={<Skeleton className="h-[300px] w-full rounded-lg" />}>
      <RichTextEditor {...props} />
    </Suspense>
  )
}
