import {
  Button,
  Card,
  CardContent,
  FormField,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@puckhub/ui"
import { useNavigate, useParams } from "@tanstack/react-router"
import { useMemo, useState } from "react"
import { trpc } from "@/trpc"
import { useTranslation } from "~/i18n/use-translation"
import { RichTextEditorLazy as RichTextEditor } from "./richTextEditorLazy"

export interface PageFormData {
  title: string
  content: string
  status: "draft" | "published"
  parentId: string | null
  menuLocations: ("main_nav" | "footer")[]
  sortOrder: number
}

interface PageFormProps {
  initialData?: PageFormData
  currentSlug?: string
  onSubmit: (data: PageFormData) => void
  isPending: boolean
  submitLabel?: string
  isSystemRoute?: boolean
  /** SEO preview data (read-only, auto-generated) */
  seoTitle?: string | null
  seoDescription?: string | null
  /** Rendered at the bottom of the sidebar (e.g. danger zone with delete) */
  sidebarFooter?: React.ReactNode
}

interface FormState {
  title: string
  content: string
  status: "draft" | "published"
  parentId: string | null
  menuLocations: ("main_nav" | "footer")[]
  sortOrder: number
}

const emptyForm: FormState = {
  title: "",
  content: "",
  status: "draft",
  parentId: null,
  menuLocations: [],
  sortOrder: 0,
}

export function PageForm({
  initialData,
  currentSlug,
  onSubmit,
  isPending,
  submitLabel,
  isSystemRoute,
  seoTitle,
  seoDescription,
  sidebarFooter,
}: PageFormProps) {
  const { t } = useTranslation("common")
  const { orgSlug } = useParams({ strict: false }) as { orgSlug: string }
  const navigate = useNavigate()
  const resolvedSubmitLabel = submitLabel ?? t("save")
  const [form, setForm] = useState<FormState>(
    initialData
      ? {
          title: initialData.title,
          content: initialData.content,
          status: initialData.status,
          parentId: initialData.parentId,
          menuLocations: initialData.menuLocations,
          sortOrder: initialData.sortOrder,
        }
      : emptyForm,
  )
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({})

  // Fetch top-level pages for parent dropdown
  const { data: allPages } = trpc.page.list.useQuery()
  const topLevelPages = useMemo(() => (allPages ?? []).filter((p) => !p.parentId && !p.isSystemRoute), [allPages])

  const _isSubPage = !!form.parentId
  const isChildSystemRoute = isSystemRoute && !!form.parentId

  // Compute slug preview
  const slugPreview = useMemo(() => {
    if (currentSlug) {
      if (form.parentId) {
        const parent = topLevelPages.find((p) => p.id === form.parentId)
        return parent ? `/${parent.slug}/${currentSlug}` : `/${currentSlug}`
      }
      return `/${currentSlug}`
    }
    return null
  }, [currentSlug, form.parentId, topLevelPages])

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  function toggleMenuLocation(loc: "main_nav" | "footer") {
    setForm((prev) => ({
      ...prev,
      menuLocations: prev.menuLocations.includes(loc)
        ? prev.menuLocations.filter((l) => l !== loc)
        : [...prev.menuLocations, loc],
    }))
  }

  function validate(): boolean {
    const next: Partial<Record<string, string>> = {}
    if (!form.title.trim()) next.title = t("pageForm.validation.titleRequired")
    setErrors(next)
    return Object.keys(next).length === 0
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    onSubmit({
      title: form.title,
      content: form.content,
      status: form.status,
      parentId: form.parentId,
      menuLocations: form.menuLocations,
      sortOrder: form.sortOrder,
    })
  }

  // Check if this page has children (to hide parent dropdown)
  const hasChildren = useMemo(() => {
    if (!allPages || !currentSlug) return false
    const currentPage = allPages.find((p) => p.slug === currentSlug)
    return currentPage ? (currentPage.children?.length ?? 0) > 0 : false
  }, [allPages, currentSlug])

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">
        {/* Main content area */}
        <div className="space-y-5">
          {isSystemRoute && (
            <div className="rounded-lg border border-blue-500/20 bg-blue-500/10 px-4 py-3 text-sm text-blue-400">
              {t("pageForm.systemRouteInfo")}
            </div>
          )}

          <FormField label={t("pageForm.fields.title")} error={errors.title} required>
            <Input
              data-testid="page-form-title"
              value={form.title}
              onChange={(e) => setField("title", e.target.value)}
              placeholder={t("pageForm.fields.titlePlaceholder")}
            />
          </FormField>

          {slugPreview && (
            <div className="text-sm text-muted-foreground">
              {t("pageForm.fields.url")}: <span className="font-mono">{slugPreview}</span>
            </div>
          )}

          {!isSystemRoute && (
            <div data-testid="page-form-editor">
              <Label className="text-sm font-medium mb-2 block">{t("pageForm.fields.content")}</Label>
              <RichTextEditor
                content={form.content}
                onChange={(html) => setField("content", html)}
                placeholder={t("pageForm.fields.contentPlaceholder")}
              />
            </div>
          )}
        </div>

        {/* Sidebar */}
        <Card className="lg:sticky lg:top-20">
          <CardContent className="p-5 space-y-4">
            {/* Status */}
            <div>
              <Label className="text-sm font-medium mb-3 block">{t("pageForm.fields.status")}</Label>
              <div className="space-y-2">
                <StatusOption
                  value="draft"
                  checked={form.status === "draft"}
                  onChange={(v) => setField("status", v)}
                  label={t("draft")}
                  description={t("pageForm.statusDescriptions.draft")}
                  testId="page-form-status-draft"
                />
                <StatusOption
                  value="published"
                  checked={form.status === "published"}
                  onChange={(v) => setField("status", v)}
                  label={t("published")}
                  description={t("pageForm.statusDescriptions.published")}
                  testId="page-form-status-published"
                />
              </div>
            </div>

            {/* Parent page dropdown (hidden for system routes, hidden if page has children) */}
            {!hasChildren && !isSystemRoute && (
              <div>
                <Label className="text-sm font-medium mb-2 block">{t("pageForm.fields.parentPage")}</Label>
                <Select
                  value={form.parentId ?? "__root__"}
                  onValueChange={(v) => setField("parentId", v === "__root__" ? null : v)}
                >
                  <SelectTrigger className="w-full h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__root__">{t("pageForm.fields.parentPageRootOption")}</SelectItem>
                    {topLevelPages
                      .filter((p) => p.slug !== currentSlug)
                      .map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.title}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Menu locations (hidden for child system routes — they're always menu-less) */}
            {!isChildSystemRoute && (
              <div>
                <Label className="text-sm font-medium mb-2 block">{t("pageForm.fields.menuLocations")}</Label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      data-testid="page-form-menu-main-nav"
                      type="checkbox"
                      checked={form.menuLocations.includes("main_nav")}
                      onChange={() => toggleMenuLocation("main_nav")}
                      className="h-4 w-4 accent-[hsl(var(--accent))]"
                    />
                    <span className="text-sm">{t("pageForm.fields.mainNavigation")}</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      data-testid="page-form-menu-footer"
                      type="checkbox"
                      checked={form.menuLocations.includes("footer")}
                      onChange={() => toggleMenuLocation("footer")}
                      className="h-4 w-4 accent-[hsl(var(--accent))]"
                    />
                    <span className="text-sm">{t("pageForm.fields.footer")}</span>
                  </label>
                </div>
              </div>
            )}

            {/* Sort order — only shown as fallback; primary ordering is via drag-and-drop in the page list */}
            {!isChildSystemRoute && (
              <FormField label={t("pageForm.fields.sortOrder")}>
                <Input
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) => setField("sortOrder", parseInt(e.target.value, 10) || 0)}
                />
              </FormField>
            )}

            <div className="flex flex-col gap-2 pt-2">
              <Button
                type="submit"
                variant="accent"
                disabled={isPending}
                className="w-full"
                data-testid="page-form-submit"
              >
                {isPending ? t("saving") : resolvedSubmitLabel}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => navigate({ to: "/$orgSlug/pages", params: { orgSlug } })}
              >
                {t("cancel")}
              </Button>
            </div>

            {(seoTitle || seoDescription) && (
              <div className="border-t pt-4">
                <Label className="text-sm font-medium mb-2 block">{t("seoPreview.title")}</Label>
                <div className="rounded-lg border bg-muted/30 p-3 space-y-1.5">
                  {seoTitle && <p className="text-sm font-semibold text-blue-400 truncate">{seoTitle}</p>}
                  {seoDescription && <p className="text-xs text-muted-foreground line-clamp-3">{seoDescription}</p>}
                </div>
              </div>
            )}

            {sidebarFooter}
          </CardContent>
        </Card>
      </div>
    </form>
  )
}

// ---------------------------------------------------------------------------
// Status radio option
// ---------------------------------------------------------------------------
function StatusOption({
  value,
  checked,
  onChange,
  label,
  description,
  testId,
}: {
  value: "draft" | "published"
  checked: boolean
  onChange: (value: "draft" | "published") => void
  label: string
  description: string
  testId?: string
}) {
  return (
    <label
      className="flex items-start gap-3 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors"
      style={{
        borderColor: checked ? "hsl(var(--accent))" : undefined,
        background: checked ? "hsl(var(--accent) / 0.05)" : undefined,
      }}
    >
      <input
        data-testid={testId}
        type="radio"
        name="pageStatus"
        value={value}
        checked={checked}
        onChange={() => onChange(value)}
        className="mt-0.5 h-4 w-4 accent-[hsl(var(--accent))]"
      />
      <div className="min-w-0">
        <div className="text-sm font-medium leading-tight">{label}</div>
        <div className="text-xs text-muted-foreground mt-0.5">{description}</div>
      </div>
    </label>
  )
}
