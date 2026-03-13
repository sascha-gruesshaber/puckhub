import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/version")({
  server: {
    handlers: {
      GET: async () => {
        return Response.json({
          app: "platform",
          version: process.env.APP_VERSION ?? "dev",
          commit: process.env.APP_COMMIT ?? "unknown",
          branch: process.env.APP_BRANCH ?? "unknown",
          buildDate: process.env.APP_BUILD_DATE ?? "unknown",
        })
      },
    },
  },
})
