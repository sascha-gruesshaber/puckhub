// Re-export shared E2E helpers
import { E2E_ORG_SLUG as _E2E_ORG_SLUG } from "../../../e2e/helpers"

export {
  clearApiLog,
  E2E_ADMIN_USER_ID,
  E2E_ORG_ID,
  E2E_ORG_SLUG,
  formField,
  leaguePath,
  login,
  waitForMagicLink,
  withE2EDb,
} from "../../../e2e/helpers"

/** Builds an admin route path with the E2E org slug prefix */
export function adminPath(path: string): string {
  // Strip leading slash for clean joining
  const clean = path.startsWith("/") ? path.slice(1) : path
  return `/${_E2E_ORG_SLUG}/${clean}`
}
