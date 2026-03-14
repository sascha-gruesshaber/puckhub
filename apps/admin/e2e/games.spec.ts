import { expect, test } from "@playwright/test"
import { login } from "./helpers"

test.describe.skip("Games Management", () => {
  test("games list loads with seeded data", async ({ page }) => {
    await login(page)
    await page.goto("/games")
    await expect(page.getByRole("heading", { name: "gamesPage.title" })).toBeVisible({
      timeout: 10_000,
    })

    // Should show seeded games (Hawks and Bears matchups)
    await expect(page.getByText("E2E Hawks")).toBeVisible()
    await expect(page.getByText("E2E Bears")).toBeVisible()
  })

  test("filter by status tab shows correct games", async ({ page }) => {
    await login(page)
    await page.goto("/games")
    await expect(page.getByRole("heading", { name: "gamesPage.title" })).toBeVisible({
      timeout: 10_000,
    })

    // Filter to scheduled only
    await page.getByRole("button", { name: "gamesPage.status.scheduled" }).click()
    // Should show the scheduled game
    await expect(page.getByText("E2E Hawks")).toBeVisible()
    // Completed games should be hidden
    await expect(page.getByText("3 : 2")).not.toBeVisible()
  })

  test("filter by team shows only that team's games", async ({ page }) => {
    await login(page)
    await page.goto("/games")
    await expect(page.getByRole("heading", { name: "gamesPage.title" })).toBeVisible({
      timeout: 10_000,
    })

    // Open team filter and select Hawks
    await page.getByRole("button", { name: "gamesPage.filters.team" }).click()
    await page.getByRole("option", { name: /E2E Hawks/ }).click()

    // All visible games should include Hawks
    await expect(page.getByText("E2E Hawks").first()).toBeVisible()
  })

  test("create, edit, and delete a game", async ({ page }) => {
    await login(page)
    await page.goto("/games")
    await expect(page.getByRole("heading", { name: "gamesPage.title" })).toBeVisible({
      timeout: 10_000,
    })

    // --- CREATE ---
    await page.getByRole("button", { name: "gamesPage.actions.new" }).click()

    // Select round (Regular Season should be available)
    await page.getByLabel("gamesPage.fields.round").click()
    await page.getByRole("option", { name: /Regular Season/ }).click()

    // Select home team
    await page.getByLabel("gamesPage.fields.homeTeam").click()
    await page.getByRole("option", { name: /E2E Bears/ }).click()

    // Select away team
    await page.getByLabel("gamesPage.fields.awayTeam").click()
    await page.getByRole("option", { name: /E2E Hawks/ }).click()

    // Set location
    await page.getByLabel("gamesPage.fields.location").fill("E2E Test Arena")

    await page.getByRole("button", { name: "create" }).click()

    // Verify game appears
    await expect(page.getByText("E2E Test Arena")).toBeVisible({ timeout: 10_000 })

    // --- EDIT ---
    const gameRow = page.locator(".data-row", { hasText: "E2E Test Arena" })
    await gameRow.getByRole("button", { name: "gamesPage.actions.edit" }).click()

    const locationInput = page.getByLabel("gamesPage.fields.location")
    await locationInput.clear()
    await locationInput.fill("E2E Updated Arena")
    await page.getByRole("button", { name: "save" }).click()

    await expect(page.getByText("E2E Updated Arena")).toBeVisible({ timeout: 10_000 })

    // --- DELETE ---
    const updatedRow = page.locator(".data-row", { hasText: "E2E Updated Arena" })
    await updatedRow.getByRole("button", { name: "gamesPage.actions.delete" }).click()
    await page.getByRole("button", { name: "gamesPage.actions.delete" }).last().click()

    await expect(page.getByText("E2E Updated Arena")).not.toBeVisible({ timeout: 10_000 })
  })

  test("cancel and reopen a game", async ({ page }) => {
    await login(page)
    await page.goto("/games")
    await expect(page.getByRole("heading", { name: "gamesPage.title" })).toBeVisible({
      timeout: 10_000,
    })

    // Filter to scheduled games
    await page.getByRole("button", { name: "gamesPage.status.scheduled" }).click()

    // Cancel the scheduled game
    const scheduledRow = page.locator(".data-row").first()
    await scheduledRow.getByRole("button", { name: "gamesPage.actions.cancel" }).click()
    await page.getByRole("button", { name: "gamesPage.actions.cancel" }).last().click()

    // Verify status changed — reopen button should now be visible
    await expect(scheduledRow.getByRole("button", { name: "gamesPage.actions.reopen" })).toBeVisible({
      timeout: 10_000,
    })

    // Reopen
    await scheduledRow.getByRole("button", { name: "gamesPage.actions.reopen" }).click()
    await page.getByRole("button", { name: "gamesPage.actions.reopen" }).last().click()

    // Verify reopened
    await expect(scheduledRow.getByRole("button", { name: "gamesPage.actions.cancel" })).toBeVisible({
      timeout: 10_000,
    })
  })
})
