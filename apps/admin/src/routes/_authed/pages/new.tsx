import { toast } from "@puckhub/ui"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { trpc } from "@/trpc"
import { PageForm, type PageFormData } from "~/components/pageForm"
import { PageHeader } from "~/components/pageHeader"
import { useTranslation } from "~/i18n/use-translation"

export const Route = createFileRoute("/_authed/pages/new")({
  component: NewPagePage,
  validateSearch: (search: Record<string, unknown>): { parent?: string } => ({
    ...(typeof search.parent === "string" ? { parent: search.parent } : {}),
  }),
})

function NewPagePage() {
  const { t } = useTranslation("common")
  const navigate = useNavigate()
  const { parent } = Route.useSearch()
  const utils = trpc.useUtils()

  const createMutation = trpc.page.create.useMutation({
    onSuccess: () => {
      utils.page.list.invalidate()
      toast.success(t("pagesCreate.toast.created"))
      navigate({ to: "/pages" })
    },
    onError: (err) => {
      toast.error(t("pagesCreate.toast.createError"), { description: err.message })
    },
  })

  function handleSubmit(data: PageFormData) {
    createMutation.mutate({
      title: data.title.trim(),
      content: data.content,
      status: data.status,
      parentId: data.parentId,
      menuLocations: data.menuLocations,
      sortOrder: data.sortOrder,
    })
  }

  const initialData: PageFormData | undefined = parent
    ? {
        title: "",
        content: "",
        status: "draft",
        parentId: parent,
        menuLocations: [],
        sortOrder: 0,
      }
    : undefined

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("pagesCreate.title")}
        description={parent ? t("pagesCreate.subpageDescription") : t("pagesCreate.description")}
      />
      <PageForm
        initialData={initialData}
        onSubmit={handleSubmit}
        isPending={createMutation.isPending}
        submitLabel={t("create")}
      />
    </div>
  )
}
