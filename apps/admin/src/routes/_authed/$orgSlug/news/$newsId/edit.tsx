import { Button, toast } from "@puckhub/ui"
import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router"
import { Trash2 } from "lucide-react"
import { useState } from "react"
import { trpc } from "@/trpc"
import { ConfirmDialog } from "~/components/confirmDialog"
import { DangerZone } from "~/components/dangerZone"
import { DetailPageLayout } from "~/components/detailPageLayout"
import { NewsForm, type NewsFormData } from "~/components/newsForm"
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

  function formatDatetimeLocal(date: Date | null): string {
    if (!date) return ""
    const d = new Date(date)
    const pad = (n: number) => n.toString().padStart(2, "0")
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  }

  const initialData: NewsFormData | null = article
    ? {
        title: article.title,
        shortText: article.shortText ?? "",
        content: article.content,
        status: article.status,
        scheduledPublishAt: formatDatetimeLocal(article.scheduledPublishAt),
      }
    : null

  return (
    <DetailPageLayout
      backTo="/$orgSlug/news"
      backParams={{ orgSlug }}
      backLabel={t("newsPage.title")}
      maxWidth=""
      isLoading={isLoading}
      notFound={!isLoading && !article}
    >
      {initialData && (
        <NewsForm
          initialData={initialData}
          onSubmit={handleSubmit}
          isPending={updateMutation.isPending}
          sidebarFooter={
            <DangerZone hint={t("newsPage.deleteDialog.hint")}>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="w-full"
                onClick={() => setDeleteDialogOpen(true)}
                data-testid="news-delete"
              >
                <Trash2 className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                {t("newsPage.actions.delete")}
              </Button>
            </DangerZone>
          }
        />
      )}

      {article && (
        <ConfirmDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          title={t("newsPage.deleteDialog.title")}
          description={t("newsPage.deleteDialog.description", { title: article.title })}
          confirmLabel={t("newsPage.actions.delete")}
          variant="destructive"
          isPending={deleteMutation.isPending}
          confirmTestId="news-delete-confirm"
          onConfirm={() => deleteMutation.mutate({ id: newsId })}
        />
      )}
    </DetailPageLayout>
  )
}
