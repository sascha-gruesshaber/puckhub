import { Skeleton, toast } from "@puckhub/ui"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { trpc } from "@/trpc"
import { NewsForm, type NewsFormData } from "~/components/newsForm"
import { PageHeader } from "~/components/pageHeader"
import { useTranslation } from "~/i18n/use-translation"

export const Route = createFileRoute("/_authed/news/$newsId/edit")({
  component: EditNewsPage,
})

function EditNewsPage() {
  const { t } = useTranslation("common")
  const { newsId } = Route.useParams()
  const navigate = useNavigate()
  const utils = trpc.useUtils()

  const { data: article, isLoading } = trpc.news.getById.useQuery({ id: newsId })

  const updateMutation = trpc.news.update.useMutation({
    onSuccess: () => {
      utils.news.list.invalidate()
      utils.news.getById.invalidate({ id: newsId })
      toast.success(t("newsEdit.toast.updated"))
      navigate({ to: "/news" })
    },
    onError: (err) => {
      toast.error(t("newsEdit.toast.saveError"), { description: err.message })
    },
  })

  function handleSubmit(data: NewsFormData) {
    updateMutation.mutate({
      id: newsId,
      title: data.title.trim(),
      shortText: data.shortText.trim() || null,
      content: data.content,
      status: data.status,
      scheduledPublishAt: data.scheduledPublishAt ? new Date(data.scheduledPublishAt).toISOString() : null,
    })
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-9 w-64 rounded" />
          <Skeleton className="h-5 w-40 rounded mt-2" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
          <div className="space-y-5">
            <Skeleton className="h-10 w-full rounded" />
            <Skeleton className="h-20 w-full rounded" />
            <Skeleton className="h-64 w-full rounded" />
          </div>
          <Skeleton className="h-56 w-full rounded" />
        </div>
      </div>
    )
  }

  if (!article) return null

  function formatDatetimeLocal(date: Date | null): string {
    if (!date) return ""
    const d = new Date(date)
    const pad = (n: number) => n.toString().padStart(2, "0")
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  }

  const initialData: NewsFormData = {
    title: article.title,
    shortText: article.shortText ?? "",
    content: article.content,
    status: article.status,
    scheduledPublishAt: formatDatetimeLocal(article.scheduledPublishAt),
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t("newsEdit.title")} description={article.title} />
      <NewsForm initialData={initialData} onSubmit={handleSubmit} isPending={updateMutation.isPending} />
    </div>
  )
}
