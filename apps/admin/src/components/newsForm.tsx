import { Button, Card, CardContent, FormField, Input, Label, Textarea } from "@puckhub/ui"
import { useNavigate } from "@tanstack/react-router"
import { useState } from "react"
import { useTranslation } from "~/i18n/use-translation"
import { RichTextEditorLazy as RichTextEditor } from "./richTextEditorLazy"

export interface NewsFormData {
  title: string
  shortText: string
  content: string
  status: "draft" | "published"
  scheduledPublishAt: string
}

interface NewsFormProps {
  initialData?: NewsFormData
  onSubmit: (data: NewsFormData) => void
  isPending: boolean
  submitLabel?: string
}

type PublishMode = "draft" | "scheduled" | "published"

function derivePublishMode(data: NewsFormData): PublishMode {
  if (data.status === "published") return "published"
  if (data.scheduledPublishAt) return "scheduled"
  return "draft"
}

interface FormState {
  title: string
  shortText: string
  content: string
  publishMode: PublishMode
  scheduledPublishAt: string
}

const emptyForm: FormState = {
  title: "",
  shortText: "",
  content: "",
  publishMode: "draft",
  scheduledPublishAt: "",
}

function initFromData(data: NewsFormData): FormState {
  return {
    title: data.title,
    shortText: data.shortText,
    content: data.content,
    publishMode: derivePublishMode(data),
    scheduledPublishAt: data.scheduledPublishAt,
  }
}

export function NewsForm({ initialData, onSubmit, isPending, submitLabel }: NewsFormProps) {
  const { t } = useTranslation("common")
  const navigate = useNavigate()
  const [form, setForm] = useState<FormState>(initialData ? initFromData(initialData) : emptyForm)
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({})
  const resolvedSubmitLabel = submitLabel ?? t("save")

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  function handleModeChange(mode: PublishMode) {
    setForm((prev) => ({
      ...prev,
      publishMode: mode,
      // Clear scheduled date when switching away from scheduled
      scheduledPublishAt: mode === "scheduled" ? prev.scheduledPublishAt : "",
    }))
    if (errors.scheduledPublishAt) setErrors((prev) => ({ ...prev, scheduledPublishAt: undefined }))
  }

  function validate(): boolean {
    const next: Partial<Record<string, string>> = {}
    if (!form.title.trim()) next.title = t("newsForm.validation.titleRequired")
    if (!form.content.trim() || form.content === "<p></p>") next.content = t("newsForm.validation.contentRequired")
    if (form.publishMode === "scheduled") {
      if (!form.scheduledPublishAt) {
        next.scheduledPublishAt = t("newsForm.validation.scheduledRequired")
      } else if (new Date(form.scheduledPublishAt) <= new Date()) {
        next.scheduledPublishAt = t("newsForm.validation.scheduledFuture")
      }
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    onSubmit({
      title: form.title,
      shortText: form.shortText,
      content: form.content,
      status: form.publishMode === "published" ? "published" : "draft",
      scheduledPublishAt: form.publishMode === "scheduled" ? form.scheduledPublishAt : "",
    })
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">
        {/* Main content area */}
        <div className="space-y-5">
          <FormField label={t("newsForm.fields.title")} error={errors.title} required>
            <Input
              value={form.title}
              onChange={(e) => setField("title", e.target.value)}
              placeholder={t("newsForm.fields.titlePlaceholder")}
            />
          </FormField>

          <FormField label={t("newsForm.fields.shortText")}>
            <Textarea
              value={form.shortText}
              onChange={(e) => setField("shortText", e.target.value)}
              placeholder={t("newsForm.fields.shortTextPlaceholder")}
              rows={2}
            />
          </FormField>

          <div>
            <Label className="text-sm font-medium mb-2 block">
              {t("newsForm.fields.content")} <span className="text-destructive">*</span>
            </Label>
            <RichTextEditor
              content={form.content}
              onChange={(html) => setField("content", html)}
              placeholder={t("newsForm.fields.contentPlaceholder")}
            />
            {errors.content && <p className="text-sm text-destructive mt-1">{errors.content}</p>}
          </div>
        </div>

        {/* Sidebar */}
        <Card className="lg:sticky lg:top-6">
          <CardContent className="p-5 space-y-4">
            <div>
              <Label className="text-sm font-medium mb-3 block">{t("newsForm.publish.title")}</Label>
              <div className="space-y-2">
                <PublishOption
                  value="draft"
                  checked={form.publishMode === "draft"}
                  onChange={handleModeChange}
                  label={t("newsForm.publish.options.draft.label")}
                  description={t("newsForm.publish.options.draft.description")}
                />
                <PublishOption
                  value="scheduled"
                  checked={form.publishMode === "scheduled"}
                  onChange={handleModeChange}
                  label={t("newsForm.publish.options.scheduled.label")}
                  description={t("newsForm.publish.options.scheduled.description")}
                />
                <PublishOption
                  value="published"
                  checked={form.publishMode === "published"}
                  onChange={handleModeChange}
                  label={t("newsForm.publish.options.published.label")}
                  description={t("newsForm.publish.options.published.description")}
                />
              </div>
            </div>

            {form.publishMode === "scheduled" && (
              <FormField label={t("newsForm.fields.scheduledPublishAt")} error={errors.scheduledPublishAt} required>
                <Input
                  type="datetime-local"
                  value={form.scheduledPublishAt}
                  onChange={(e) => setField("scheduledPublishAt", e.target.value)}
                />
              </FormField>
            )}

            <div className="flex flex-col gap-2 pt-2">
              <Button type="submit" variant="accent" disabled={isPending} className="w-full">
                {isPending ? t("saving") : resolvedSubmitLabel}
              </Button>
              <Button type="button" variant="outline" className="w-full" onClick={() => navigate({ to: "/news" })}>
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
// Radio option for publish mode
// ---------------------------------------------------------------------------
function PublishOption({
  value,
  checked,
  onChange,
  label,
  description,
}: {
  value: PublishMode
  checked: boolean
  onChange: (mode: PublishMode) => void
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
        name="publishMode"
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
