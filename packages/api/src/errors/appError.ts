import { type TRPC_ERROR_CODE_KEY, TRPCError } from "@trpc/server"
import { APP_ERROR_CODES, type AppErrorCode } from "./codes"

export function createAppError(code: TRPC_ERROR_CODE_KEY, appErrorCode: AppErrorCode, message: string = appErrorCode) {
  const err = new TRPCError({ code, message })
  ;(err as TRPCError & { appErrorCode: AppErrorCode }).appErrorCode = appErrorCode
  return err
}

export function inferAppErrorCode(error: TRPCError): AppErrorCode {
  const tagged = (error as TRPCError & { appErrorCode?: AppErrorCode }).appErrorCode
  return tagged ?? APP_ERROR_CODES.UNKNOWN
}
