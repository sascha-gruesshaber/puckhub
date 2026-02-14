import { toast } from "@puckhub/ui"
import { useMemo } from "react"
import { trpc } from "@/trpc"
import { useTranslation } from "~/i18n/use-translation"
import { resolveTranslatedError } from "~/lib/errorI18n"

function _appLocaleToDbLocale(locale: string): "de-DE" | "en-US" {
  return locale === "en" ? "en-US" : "de-DE"
}

function dbLocaleToAppLocale(locale: string | null | undefined): "de" | "en" {
  return locale?.startsWith("en") ? "en" : "de"
}

export function LanguagePicker() {
  const { i18n } = useTranslation("common")
  const { t: tErrors } = useTranslation("errors")
  const utils = trpc.useUtils()
  const { data: preference } = trpc.userPreferences.getMyLocale.useQuery(undefined, {
    retry: false,
  })

  const mutation = trpc.userPreferences.setMyLocale.useMutation({
    onSuccess: async ({ success }, variables) => {
      if (!success) return
      await utils.userPreferences.getMyLocale.invalidate()
      if (variables.locale) {
        await i18n.changeLanguage(variables.locale)
      }
    },
    onError: (err) => {
      toast.error(resolveTranslatedError(err, tErrors))
    },
  })

  const value = useMemo(() => {
    return dbLocaleToAppLocale(preference?.locale ?? i18n.language)
  }, [i18n.language, preference?.locale])

  const isDe = value === "de"

  function toggleLanguage() {
    const newLocale = isDe ? "en-US" : "de-DE"
    mutation.mutate({ locale: newLocale })
  }

  return (
    <button
      type="button"
      onClick={toggleLanguage}
      disabled={mutation.isPending}
      className="group relative flex items-center justify-center gap-1.5 w-full transition-all duration-200"
      style={{
        padding: "7px 12px",
        background: "rgba(255, 255, 255, 0.03)",
        border: "1px solid var(--sidebar-border)",
        borderRadius: 7,
        cursor: mutation.isPending ? "default" : "pointer",
        opacity: mutation.isPending ? 0.5 : 1,
      }}
      onMouseEnter={(e) => {
        if (!mutation.isPending) {
          e.currentTarget.style.background = "rgba(255, 255, 255, 0.06)"
          e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.15)"
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "rgba(255, 255, 255, 0.03)"
        e.currentTarget.style.borderColor = "var(--sidebar-border)"
      }}
      title={isDe ? "Switch to English" : "Zu Deutsch wechseln"}
    >
      {/* Flag/Language Indicator */}
      <span
        className="shrink-0 font-semibold transition-colors"
        style={{
          fontSize: 13,
          color: isDe ? "#94A3B8" : "#64748B",
        }}
      >
        DE
      </span>

      {/* Toggle Track */}
      <div
        className="relative shrink-0 transition-all duration-300"
        style={{
          width: 34,
          height: 18,
          background: "linear-gradient(135deg, rgba(244, 211, 94, 0.15) 0%, rgba(212, 168, 67, 0.15) 100%)",
          borderRadius: 9,
          border: "1px solid rgba(244, 211, 94, 0.25)",
        }}
      >
        {/* Toggle Thumb */}
        <div
          className="absolute top-[1px] transition-all duration-300"
          style={{
            width: 14,
            height: 14,
            background: "linear-gradient(135deg, #F4D35E 0%, #D4A843 100%)",
            borderRadius: 7,
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.3)",
            left: isDe ? "2px" : "16px",
          }}
        />
      </div>

      {/* Flag/Language Indicator */}
      <span
        className="shrink-0 font-semibold transition-colors"
        style={{
          fontSize: 13,
          color: !isDe ? "#94A3B8" : "#64748B",
        }}
      >
        EN
      </span>
    </button>
  )
}
