import { createFileRoute } from "@tanstack/react-router"
import { NewsDetailPage } from "./$newsId"

export const Route = createFileRoute("/news/$newsId/$slug")({
  component: NewsDetailPage,
  head: () => ({ meta: [{ title: "Artikel" }] }),
})
