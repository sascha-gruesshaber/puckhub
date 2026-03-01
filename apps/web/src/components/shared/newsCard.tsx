import { Link } from "@tanstack/react-router"
import { cn } from "~/lib/utils"
import { formatDate } from "~/lib/utils"

interface NewsCardProps {
  id: string
  title: string
  shortText?: string | null
  publishedAt: Date | string | null
  authorName?: string | null
  className?: string
}

export function NewsCard({ id, title, shortText, publishedAt, authorName, className }: NewsCardProps) {
  return (
    <Link
      to="/news/$newsId"
      params={{ newsId: id }}
      className={cn(
        "group block rounded-lg border border-web-text/10 bg-white p-5 transition-all hover:shadow-md hover:border-web-primary/30",
        className,
      )}
    >
      <h3 className="font-semibold text-lg mb-2 group-hover:text-web-primary transition-colors line-clamp-2">
        {title}
      </h3>

      {shortText && (
        <p className="text-sm text-web-text/60 mb-3 line-clamp-3">{shortText}</p>
      )}

      <div className="flex items-center gap-2 text-xs text-web-text/40">
        {publishedAt && <span>{formatDate(publishedAt)}</span>}
        {authorName && (
          <>
            <span>&middot;</span>
            <span>{authorName}</span>
          </>
        )}
      </div>
    </Link>
  )
}
