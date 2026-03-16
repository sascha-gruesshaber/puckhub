import { Button, Skeleton, toast } from "@puckhub/ui"
import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router"
import { Trash2 } from "lucide-react"
import { useState } from "react"
import { trpc } from "@/trpc"
import { ConfirmDialog } from "~/components/confirmDialog"
import { NewsForm, type NewsFormData } from "~/components/newsForm"
import { PageHeader } from "~/components/pageHeader"
import { usePermissionGuard } from "~/contexts/permissionsContext"
import { useTranslation } from "~/i18n/use-translation"
import { resolveTranslatedError } from "~/lib/errorI18n"

export const Route = createFileRoute("/_authed/$orgSlug/news/$newsId/edit")({
  component: EditNewsPage,
})

function EditNewsPage() {
  usePermissionGuard("news")
  const { orgSlug } = useParams({ strict: false }) as { orgSlug: string }
  const { t } = useTranslation("common")
  const { t: tErrors } = useTranslation("errors")
  const { newsId } = Route.useParams()
  const navigate = useNavigate()
  const utils = trpc.useUtils()

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  const { data: article, isLoading } = trpc.news.getById.useQuery({ id: newsId })

  const updateMutation = trpc.news.update.useMutation({
    onSuccess: () => {
      utils.news.list.invalidate()
      utils.news.getById.invalidate({ id: newsId })
      toast.success(t("newsEdit.toast.updated"))
      navigate({ to: "/$orgSlug/news", params: { orgSlug } })
    },
    onError: (err) => {
      toast.error(t("newsEdit.toast.saveError"), { description: resolveTranslatedError(err, tErrors) })
    },
  })

  const deleteMutation = trpc.news.delete.useMutation({
    onSuccess: () => {
      utils.news.list.invalidate()
      toast.success(t("newsPage.toast.deleted"))
      navigate({ to: "/$orgSlug/news", params: { orgSlug } })
    },
    onError: (err) => {
      toast.error(t("newsPage.toast.deleteError"), { description: resolveTranslatedError(err, tErrors) })
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
      <PageHeader
        title={t("newsEdit.title")}
        description={article.title}
        action={
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setDeleteDialogOpen(true)}
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
            {t("newsPage.actions.delete")}
          </Button>
        }
      />
      <NewsForm initialData={initialData} onSubmit={handleSubmit} isPending={updateMutation.isPending} />

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title={t("newsPage.deleteDialog.title")}
        description={t("newsPage.deleteDialog.description", { title: article.title })}
        confirmLabel={t("newsPage.actions.delete")}
        variant="destructive"
        isPending={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate({ id: newsId })}
      />
    </div>
  )
}
