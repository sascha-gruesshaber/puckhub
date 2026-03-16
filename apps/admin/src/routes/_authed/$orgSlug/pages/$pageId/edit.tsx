import { Button, Skeleton, toast } from "@puckhub/ui"
import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router"
import { Trash2 } from "lucide-react"
import { useState } from "react"
import { trpc } from "@/trpc"
import { ConfirmDialog } from "~/components/confirmDialog"
import { PageForm, type PageFormData } from "~/components/pageForm"
import { PageHeader } from "~/components/pageHeader"
import { usePermissionGuard } from "~/contexts/permissionsContext"
import { useTranslation } from "~/i18n/use-translation"
import { resolveTranslatedError } from "~/lib/errorI18n"

export const Route = createFileRoute("/_authed/$orgSlug/pages/$pageId/edit")({
  component: EditPagePage,
})

function EditPagePage() {
  usePermissionGuard("pages")
  const { orgSlug } = useParams({ strict: false }) as { orgSlug: string }
  const { t } = useTranslation("common")
  const { t: tErrors } = useTranslation("errors")
  const { pageId } = Route.useParams()
  const navigate = useNavigate()
  const utils = trpc.useUtils()

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  const { data: page, isLoading } = trpc.page.getById.useQuery({ id: pageId })

  const updateMutation = trpc.page.update.useMutation({
    onSuccess: () => {
      utils.page.list.invalidate()
      utils.page.getById.invalidate({ id: pageId })
      toast.success(t("pagesEdit.toast.updated"))
      navigate({ to: "/$orgSlug/pages", params: { orgSlug } })
    },
    onError: (err) => {
      toast.error(t("pagesEdit.toast.saveError"), { description: resolveTranslatedError(err, tErrors) })
    },
  })

  const deleteMutation = trpc.page.delete.useMutation({
    onSuccess: () => {
      utils.page.list.invalidate()
      toast.success(t("pagesPage.toast.pageDeleted"))
      navigate({ to: "/$orgSlug/pages", params: { orgSlug } })
    },
    onError: (err) => {
      toast.error(t("pagesPage.toast.deleteError"), { description: resolveTranslatedError(err, tErrors) })
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
      <PageHeader
        title={t("pagesEdit.title")}
        description={page.title}
        action={
          !page.isSystemRoute ? (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
              {t("pagesPage.actions.delete")}
            </Button>
          ) : undefined
        }
      />
      <PageForm
        initialData={initialData}
        currentSlug={page.slug}
        onSubmit={handleSubmit}
        isPending={updateMutation.isPending}
        isSystemRoute={page.isSystemRoute}
      />

      {!page.isSystemRoute && (
        <ConfirmDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          title={t("pagesPage.deletePageDialog.title")}
          description={t("pagesPage.deletePageDialog.description", { title: page.title })}
          confirmLabel={t("pagesPage.actions.delete")}
          variant="destructive"
          isPending={deleteMutation.isPending}
          onConfirm={() => deleteMutation.mutate({ id: pageId })}
        />
      )}
    </div>
  )
}
