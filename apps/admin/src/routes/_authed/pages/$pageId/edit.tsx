import { Skeleton, toast } from "@puckhub/ui"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { trpc } from "@/trpc"
import { PageForm, type PageFormData } from "~/components/pageForm"
import { PageHeader } from "~/components/pageHeader"
import { useTranslation } from "~/i18n/use-translation"

export const Route = createFileRoute("/_authed/pages/$pageId/edit")({
  component: EditPagePage,
})

function EditPagePage() {
  const { t } = useTranslation("common")
  const { pageId } = Route.useParams()
  const navigate = useNavigate()
  const utils = trpc.useUtils()

  const { data: page, isLoading } = trpc.page.getById.useQuery({ id: pageId })

  const updateMutation = trpc.page.update.useMutation({
    onSuccess: () => {
      utils.page.list.invalidate()
      utils.page.getById.invalidate({ id: pageId })
      toast.success(t("pagesEdit.toast.updated"))
      navigate({ to: "/pages" })
    },
    onError: (err) => {
      toast.error(t("pagesEdit.toast.saveError"), { description: err.message })
    },
  })

  function handleSubmit(data: PageFormData) {
    updateMutation.mutate({
      id: pageId,
      title: data.title.trim(),
      content: data.content,
      status: data.status,
      parentId: data.parentId,
      menuLocations: data.menuLocations,
      sortOrder: data.sortOrder,
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
            <Skeleton className="h-64 w-full rounded" />
          </div>
          <Skeleton className="h-56 w-full rounded" />
        </div>
      </div>
    )
  }

  if (!page) return null

  const initialData: PageFormData = {
    title: page.title,
    content: page.content,
    status: page.status,
    parentId: page.parentId,
    menuLocations: page.menuLocations as ("main_nav" | "footer")[],
    sortOrder: page.sortOrder,
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t("pagesEdit.title")} description={page.title} />
      <PageForm
        initialData={initialData}
        isStatic={page.isStatic}
        currentSlug={page.slug}
        onSubmit={handleSubmit}
        isPending={updateMutation.isPending}
      />
    </div>
  )
}
