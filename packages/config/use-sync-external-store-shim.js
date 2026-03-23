// React 19+ includes useSyncExternalStore natively.
// This ESM shim replaces the CJS use-sync-external-store/shim package
// to avoid Rolldown's __require("react") CJS interop issue in standalone bundles.
import * as React from "react"

export const useSyncExternalStore = React.useSyncExternalStore
