interface AppErrorShape {
  data?: {
    appErrorCode?: string
  }
  message?: string
}

export function resolveTranslatedError(
  err: unknown,
  t: (key: string, options?: { defaultValue?: string }) => string,
): string {
  const e = err as AppErrorShape | undefined
  const code = e?.data?.appErrorCode

  if (code) {
    return t(code, { defaultValue: t("UNKNOWN") })
  }

  if (e?.message) {
    return e.message
  }

  return t("UNKNOWN")
}
