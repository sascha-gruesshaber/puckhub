import { toast } from "@puckhub/ui"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { trpc } from "@/trpc"
import { NewsForm, type NewsFormData } from "~/components/newsForm"
import { PageHeader } from "~/components/pageHeader"
import { useTranslation } from "~/i18n/use-translation"

export const Route = createFileRoute("/_authed/news/new")({
  component: NewNewsPage,
})

function NewNewsPage() {
  const { t } = useTranslation("common")
  const navigate = useNavigate()
  const utils = trpc.useUtils()

  const createMutation = trpc.news.create.useMutation({
    onSuccess: () => {
      utils.news.list.invalidate()
      toast.success(t("newsCreate.toast.created"))
      navigate({ to: "/news" })
    },
    onError: (err) => {
      toast.error(t("newsCreate.toast.createError"), { description: err.message })
    },
  })

  function handleSubmit(data: NewsFormData) {
    createMutation.mutate({
      title: data.title.trim(),
      shortText: data.shortText.trim() || undefined,
      content: data.content,
      status: data.status,
      scheduledPublishAt: data.scheduledPublishAt ? new Date(data.scheduledPublishAt).toISOString() : null,
    })
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t("newsCreate.title")} description={t("newsCreate.description")} />
      <NewsForm onSubmit={handleSubmit} isPending={createMutation.isPending} submitLabel={t("create")} />
    </div>
  )
}
