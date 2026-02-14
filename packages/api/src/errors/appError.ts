import { type TRPC_ERROR_CODE_KEY, TRPCError } from "@trpc/server"
import { APP_ERROR_CODES, type AppErrorCode } from "./codes"

const messageToCode: Record<string, AppErrorCode> = {
  "Not authenticated": APP_ERROR_CODES.AUTH_NOT_AUTHENTICATED,
  "Keine Administratorrechte": APP_ERROR_CODES.AUTH_NOT_ADMIN,
  "Benutzer nicht gefunden": APP_ERROR_CODES.USER_NOT_FOUND,
  "Ein Benutzer mit dieser E-Mail-Adresse existiert bereits": APP_ERROR_CODES.USER_EMAIL_CONFLICT,
  "Account nicht gefunden": APP_ERROR_CODES.ACCOUNT_NOT_FOUND,
  "Diese Rolle ist bereits zugewiesen": APP_ERROR_CODES.USER_ROLE_ALREADY_ASSIGNED,
  "Du kannst deinen eigenen Account nicht löschen": APP_ERROR_CODES.USER_CANNOT_DELETE_SELF,
  "Saison nicht gefunden": APP_ERROR_CODES.SEASON_NOT_FOUND,
  "Vertrag nicht gefunden": APP_ERROR_CODES.CONTRACT_NOT_FOUND,
  "Spieler hat bereits einen aktiven Vertrag in dieser Saison": APP_ERROR_CODES.CONTRACT_ALREADY_ACTIVE,
  "Runde nicht gefunden.": APP_ERROR_CODES.ROUND_NOT_FOUND,
  "Spiel nicht gefunden.": APP_ERROR_CODES.GAME_NOT_FOUND,
  "News nicht gefunden": APP_ERROR_CODES.NEWS_NOT_FOUND,
  "Seite nicht gefunden": APP_ERROR_CODES.PAGE_NOT_FOUND,
  "Slug ist bereits vergeben": APP_ERROR_CODES.PAGE_SLUG_CONFLICT,
  "Alias ist bereits vergeben": APP_ERROR_CODES.PAGE_ALIAS_CONFLICT,
  "Setup wurde bereits abgeschlossen": APP_ERROR_CODES.SETUP_ALREADY_COMPLETED,
}

const requiredMessagePattern = /ist erforderlich$/i

export function createAppError(code: TRPC_ERROR_CODE_KEY, appErrorCode: AppErrorCode, message: string = appErrorCode) {
  const err = new TRPCError({ code, message })
  ;(err as TRPCError & { appErrorCode: AppErrorCode }).appErrorCode = appErrorCode
  return err
}

export function inferAppErrorCode(error: TRPCError): AppErrorCode {
  const tagged = (error as TRPCError & { appErrorCode?: AppErrorCode }).appErrorCode
  if (tagged) {
    return tagged
  }

  if (error.message in messageToCode) {
    return messageToCode[error.message]!
  }

  if (requiredMessagePattern.test(error.message)) {
    return APP_ERROR_CODES.VALIDATION_REQUIRED
  }

  return APP_ERROR_CODES.UNKNOWN
}
