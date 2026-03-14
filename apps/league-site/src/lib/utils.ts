import { useLocation } from "@tanstack/react-router"
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string | null | undefined, locale = "de-DE"): string {
  if (!date) return ""
  const d = typeof date === "string" ? new Date(date) : date
  return d.toLocaleDateString(locale, { day: "2-digit", month: "2-digit", year: "numeric" })
}

export function formatDateTime(date: Date | string | null | undefined, locale = "de-DE"): string {
  if (!date) return ""
  const d = typeof date === "string" ? new Date(date) : date
  return d.toLocaleDateString(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function formatTime(date: Date | string | null | undefined, locale = "de-DE"): string {
  if (!date) return ""
  const d = typeof date === "string" ? new Date(date) : date
  return d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })
}

/**
 * Returns the current path (pathname + search params) without any `from` param,
 * suitable for passing as a back-link reference to detail pages.
 */
export function useBackPath(): string {
  const location = useLocation()
  if (!location.searchStr || !location.searchStr.includes("from=")) {
    return location.href
  }
  const url = new URL(location.href, "http://localhost")
  url.searchParams.delete("from")
  return url.pathname + url.search
}
