import { Button, Card, CardContent, FormField, Input, Label } from "@puckhub/ui"
import { useNavigate } from "@tanstack/react-router"
import { useMemo, useState } from "react"
import { trpc } from "@/trpc"
import { useTranslation } from "~/i18n/use-translation"
import { RichTextEditor } from "./richTextEditor"

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
  isStatic?: boolean
  currentSlug?: string
  onSubmit: (data: PageFormData) => void
  isPending: boolean
  submitLabel?: string
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
  isStatic = false,
  currentSlug,
  onSubmit,
  isPending,
  submitLabel,
}: PageFormProps) {
  const { t } = useTranslation("common")
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
  const topLevelPages = useMemo(() => (allPages ?? []).filter((p) => !p.parentId), [allPages])

  const isSubPage = !!form.parentId

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
      menuLocations: isSubPage ? [] : form.menuLocations,
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
          <FormField label={t("pageForm.fields.title")} error={errors.title} required>
            <Input
              value={form.title}
              onChange={(e) => setField("title", e.target.value)}
              placeholder={t("pageForm.fields.titlePlaceholder")}
              disabled={isStatic}
            />
          </FormField>

          {slugPreview && (
            <div className="text-sm text-muted-foreground">
              {t("pageForm.fields.url")}: <span className="font-mono">{slugPreview}</span>
            </div>
          )}

          <div>
            <Label className="text-sm font-medium mb-2 block">{t("pageForm.fields.content")}</Label>
            <RichTextEditor
              content={form.content}
              onChange={(html) => setField("content", html)}
              placeholder={t("pageForm.fields.contentPlaceholder")}
            />
          </div>
        </div>

        {/* Sidebar */}
        <Card className="lg:sticky lg:top-6">
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
                />
                <StatusOption
                  value="published"
                  checked={form.status === "published"}
                  onChange={(v) => setField("status", v)}
                  label={t("published")}
                  description={t("pageForm.statusDescriptions.published")}
                />
              </div>
            </div>

            {/* Parent page dropdown (hidden for static, hidden if page has children) */}
            {!isStatic && !hasChildren && (
              <div>
                <Label className="text-sm font-medium mb-2 block">{t("pageForm.fields.parentPage")}</Label>
                <select
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  value={form.parentId ?? ""}
                  onChange={(e) => setField("parentId", e.target.value || null)}
                >
                  <option value="">{t("pageForm.fields.parentPageRootOption")}</option>
                  {topLevelPages
                    .filter((p) => p.slug !== currentSlug)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title}
                      </option>
                    ))}
                </select>
              </div>
            )}

            {/* Menu locations (hidden/disabled for sub-pages) */}
            {!isSubPage && (
              <div>
                <Label className="text-sm font-medium mb-2 block">{t("pageForm.fields.menuLocations")}</Label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.menuLocations.includes("main_nav")}
                      onChange={() => toggleMenuLocation("main_nav")}
                      className="h-4 w-4 accent-[hsl(var(--accent))]"
                    />
                    <span className="text-sm">{t("pageForm.fields.mainNavigation")}</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
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

            {/* Sort order */}
            <FormField label={t("pageForm.fields.sortOrder")}>
              <Input
                type="number"
                value={form.sortOrder}
                onChange={(e) => setField("sortOrder", parseInt(e.target.value, 10) || 0)}
              />
            </FormField>

            <div className="flex flex-col gap-2 pt-2">
              <Button type="submit" variant="accent" disabled={isPending} className="w-full">
                {isPending ? t("saving") : resolvedSubmitLabel}
              </Button>
              <Button type="button" variant="outline" className="w-full" onClick={() => navigate({ to: "/pages" })}>
                {t("cancel")}
              </Button>
            </div>
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
}: {
  value: "draft" | "published"
  checked: boolean
  onChange: (value: "draft" | "published") => void
  label: string
  description: string
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
