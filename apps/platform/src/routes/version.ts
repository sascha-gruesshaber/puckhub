import { createFileRoute } from "@tanstack/react-router"

// Commit hash and branch name describe our internal development, not the running
// product. They stay off the public response unless a deployment explicitly asks
// for them (EXPOSE_BUILD_DETAILS=true), which keeps deploy-verification working on
// an internal network without publishing the detail to the internet.

export const Route = createFileRoute("/version")({
  server: {
    handlers: {
      GET: async () => {
        const exposeBuildDetails = process.env.EXPOSE_BUILD_DETAILS === "true"

        return Response.json({
          app: "platform",
          version: process.env.APP_VERSION ?? "dev",
          buildDate: process.env.APP_BUILD_DATE ?? "unknown",
          ...(exposeBuildDetails
            ? {
                commit: process.env.APP_COMMIT ?? "unknown",
                branch: process.env.APP_BRANCH ?? "unknown",
              }
            : {}),
        })
      },
    },
  },
})
