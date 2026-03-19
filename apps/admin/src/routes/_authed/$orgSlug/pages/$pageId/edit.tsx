import { Button, toast } from "@puckhub/ui"
import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router"
import { Trash2 } from "lucide-react"
import { useState } from "react"
import { trpc } from "@/trpc"
import { ConfirmDialog } from "~/components/confirmDialog"
import { DangerZone } from "~/components/dangerZone"
import { DetailPageLayout } from "~/components/detailPageLayout"
import { PageForm, type PageFormData } from "~/components/pageForm"
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

  const initialData: PageFormData | null = page
    ? {
        title: page.title,
        content: page.content,
        status: page.status,
        parentId: page.parentId,
        menuLocations: page.menuLocations as ("main_nav" | "footer")[],
        sortOrder: page.sortOrder,
      }
    : null

  return (
    <DetailPageLayout
      backTo="/$orgSlug/pages"
      backParams={{ orgSlug }}
      backLabel={t("pagesPage.title")}
      maxWidth=""
      isLoading={isLoading}
      notFound={!isLoading && !page}
    >
      {page && initialData && (
        <PageForm
          initialData={initialData}
          currentSlug={page.slug}
          onSubmit={handleSubmit}
          isPending={updateMutation.isPending}
          isSystemRoute={page.isSystemRoute}
          seoTitle={page.seoTitle}
          seoDescription={page.seoDescription}
          sidebarFooter={
            !page.isSystemRoute ? (
              <DangerZone hint={t("pagesPage.deletePageDialog.hint")}>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="w-full"
                  onClick={() => setDeleteDialogOpen(true)}
                  data-testid="page-delete"
                >
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                  {t("pagesPage.actions.delete")}
                </Button>
              </DangerZone>
            ) : undefined
          }
        />
      )}

      {page && !page.isSystemRoute && (
        <ConfirmDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          title={t("pagesPage.deletePageDialog.title")}
          description={t("pagesPage.deletePageDialog.description", { title: page.title })}
          confirmLabel={t("pagesPage.actions.delete")}
          variant="destructive"
          isPending={deleteMutation.isPending}
          confirmTestId="page-delete-confirm"
          onConfirm={() => deleteMutation.mutate({ id: pageId })}
        />
      )}
    </DetailPageLayout>
  )
}
