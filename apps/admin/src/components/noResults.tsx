import { Search } from "lucide-react"
import { useTranslation } from "~/i18n/use-translation"

interface NoResultsProps {
  query: string
}

function NoResults({ query }: NoResultsProps) {
  const { t } = useTranslation("common")

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Search className="h-12 w-12 text-muted-foreground/30 mb-3" aria-hidden="true" />
      <p className="text-muted-foreground font-medium">{t("noResults.title", { query })}</p>
      <p className="text-sm text-muted-foreground/70 mt-1">{t("noResults.subtitle")}</p>
    </div>
  )
}

export { NoResults }
