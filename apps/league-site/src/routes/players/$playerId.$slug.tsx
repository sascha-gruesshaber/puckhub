import { createFileRoute } from "@tanstack/react-router"
import { PlayerHistoryPage, playerSearchValidator } from "./$playerId"

export const Route = createFileRoute("/players/$playerId/$slug")({
  component: PlayerHistoryPage,
  head: () => ({ meta: [{ title: "Spieler" }] }),
  validateSearch: playerSearchValidator,
})
