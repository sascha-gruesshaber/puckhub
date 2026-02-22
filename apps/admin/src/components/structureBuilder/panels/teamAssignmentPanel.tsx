import { Button, toast } from "@puckhub/ui"
import { Trash2 } from "lucide-react"
import { trpc } from "@/trpc"
import { resolveTranslatedError } from "~/lib/errorI18n"
import { useTranslation } from "~/i18n/use-translation"

interface TeamAssignmentPanelProps {
  assignmentId: string
  teamName: string
  shortName: string
  logoUrl: string | null
  onInvalidate: () => void
}

export function TeamAssignmentPanel({
  assignmentId,
  teamName,
  shortName,
  logoUrl,
  onInvalidate,
}: TeamAssignmentPanelProps) {
  const { t } = useTranslation("common")
  const { t: tErrors } = useTranslation("errors")
  const removeMutation = trpc.teamDivision.remove.useMutation({
    onSuccess: () => {
      onInvalidate()
      toast.success(t("seasonStructure.toast.teamRemoved"))
    },
    onError: (err) => toast.error(t("seasonStructure.toast.error"), { description: resolveTranslatedError(err, tErrors) }),
  })

  const initials = shortName.substring(0, 2).toUpperCase()

  return (
    <div className="flex flex-col gap-4">
      <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">
        {t("seasonStructure.teamAssignment.title")}
      </div>

      {/* Team preview */}
      <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 border border-gray-200">
        <div
          className="w-10 h-10 rounded-lg shrink-0 flex items-center justify-center overflow-hidden"
          style={{ background: logoUrl ? "transparent" : undefined }}
        >
          {logoUrl ? (
            <img src={logoUrl} alt="" className="w-full h-full object-contain" />
          ) : (
            <div className="w-full h-full rounded-lg bg-gray-200 flex items-center justify-center">
              <span className="text-sm font-bold text-gray-700">{initials}</span>
            </div>
          )}
        </div>
        <div>
          <div className="text-sm font-semibold text-gray-900">{teamName}</div>
          <div className="text-xs text-gray-500">{shortName}</div>
        </div>
      </div>

      <div className="border-t border-gray-200 pt-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => removeMutation.mutate({ id: assignmentId })}
          disabled={removeMutation.isPending}
          className="text-xs h-8 text-red-600 hover:text-red-700 hover:bg-red-50"
        >
          <Trash2 className="mr-1.5 h-3.5 w-3.5" />
          {t("seasonStructure.teamAssignment.removeFromDivision")}
        </Button>
      </div>
    </div>
  )
}
