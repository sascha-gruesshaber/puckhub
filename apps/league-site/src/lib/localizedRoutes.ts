import { useSettings } from "./context"
import { DE_PATH_MAP } from "./germanRoutes"

/** Reverse mapping: German → canonical */
const EN_PATHS: Record<string, string> = Object.fromEntries(Object.entries(DE_PATH_MAP).map(([en, de]) => [de, en]))

/** Given a canonical (English) path, return the locale-appropriate path. */
export function localePath(canonicalPath: string, locale: string): string {
  if (locale.startsWith("de")) {
    return DE_PATH_MAP[canonicalPath] ?? canonicalPath
  }
  return canonicalPath
}

/** Given any path (English or German), return the canonical (English) path. */
export function canonicalPath(path: string): string {
  return EN_PATHS[path] ?? path
}

/** Given any path, return all locale variants of that path. */
export function allPathVariants(path: string): string[] {
  const canonical = EN_PATHS[path] ?? path
  const de = DE_PATH_MAP[canonical]
  return de ? [canonical, de] : [canonical]
}

/** Hook that returns a function to translate canonical paths to locale-specific paths. */
export function useLocalePath() {
  const { locale } = useSettings()
  return (path: string) => localePath(path, locale) as any
}
