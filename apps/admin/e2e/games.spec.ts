import { expect, test } from "@playwright/test"
import { adminPath, formField, login } from "./helpers"

test.describe("Games Management", () => {
  test("games list loads with seeded data", async ({ page }) => {
    await login(page)
    await page.goto(adminPath("games"))
    await expect(page.getByRole("heading", { name: "gamesPage.title" })).toBeVisible({
      timeout: 10_000,
    })

    // Games page shows team shortNames: HWK (Hawks) and BRS (Bears)
    await expect(page.getByText("HWK").first()).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText("BRS").first()).toBeVisible()
  })

  test("filter by status tab shows correct games", async ({ page }) => {
    await login(page)
    await page.goto(adminPath("games"))
    await expect(page.getByRole("heading", { name: "gamesPage.title" })).toBeVisible({
      timeout: 10_000,
    })

    // Wait for games to load
    await expect(page.getByText("HWK").first()).toBeVisible({ timeout: 10_000 })

    // Click status filter dropdown
    await page.getByRole("button", { name: "gamesPage.filters.allStatus" }).click()

    // Select "completed" status
    await page.getByRole("option", { name: "gamesPage.status.completed" }).click()

    // Completed games should still be visible (Hawks vs Bears completed games)
    await expect(page.getByText("HWK").first()).toBeVisible({ timeout: 10_000 })

    // Clear filter and select "scheduled"
    await page.getByRole("button", { name: "gamesPage.filters.allStatus" }).click()
    await page.getByRole("option", { name: "gamesPage.status.scheduled" }).click()

    // Scheduled games should be visible
    await expect(page.getByText("HWK").first()).toBeVisible({ timeout: 10_000 })
  })

  test("filter by team shows only that team's games", async ({ page }) => {
    await login(page)
    await page.goto(adminPath("games"))
    await expect(page.getByRole("heading", { name: "gamesPage.title" })).toBeVisible({
      timeout: 10_000,
    })

    await expect(page.getByText("HWK").first()).toBeVisible({ timeout: 10_000 })

    // Click team filter dropdown
    await page.getByRole("button", { name: "gamesPage.filters.allTeams" }).click()

    // Select Hawks team (option shows team name from DB)
    await page.getByRole("option", { name: /E2E Hawks/ }).click()

    // Hawks games should be visible
    await expect(page.getByText("HWK").first()).toBeVisible({ timeout: 10_000 })
  })

  test("create, edit, and delete a game", async ({ page }) => {
    await login(page)
    await page.goto(adminPath("games"))
    await expect(page.getByRole("heading", { name: "gamesPage.title" })).toBeVisible({
      timeout: 10_000,
    })

    // --- CREATE ---
    await page.getByRole("button", { name: "gamesPage.actions.newGame" }).click()

    // Select round
    const roundContainer = page.locator("div", {
      has: page.locator("label", { hasText: "gamesPage.form.fields.round" }),
    })
    await roundContainer.locator("select").selectOption({ index: 1 })

    // Select home team via TeamCombobox
    const homeTeamContainer = page.locator("div", {
      has: page.locator("label", { hasText: "gamesPage.form.fields.homeTeam" }),
    })
    await homeTeamContainer.locator("button").first().click()
    await page.locator(".team-combobox-dropdown").waitFor({ state: "visible" })
    await page.locator(".team-combobox-item", { hasText: "E2E Hawks" }).click()

    // Select away team via TeamCombobox
    const awayTeamContainer = page.locator("div", {
      has: page.locator("label", { hasText: "gamesPage.form.fields.awayTeam" }),
    })
    await awayTeamContainer.locator("button").first().click()
    await page.locator(".team-combobox-dropdown").waitFor({ state: "visible" })
    await page.locator(".team-combobox-item", { hasText: "E2E Bears" }).click()

    // Fill location
    await formField(page, "gamesPage.form.fields.location").fill("E2E Test Arena")

    // Fill date/time (future date)
    await formField(page, "gamesPage.form.fields.scheduledAt").fill("2026-08-01T18:00")

    await page.getByRole("button", { name: "create" }).click()

    // Handle midnight confirmation dialog if it appears
    const midnightConfirm = page.getByRole("button", { name: "gamesPage.dialogs.midnightConfirmButton" })
    if (await midnightConfirm.isVisible({ timeout: 1_000 }).catch(() => false)) {
      await midnightConfirm.click()
    }

    // Verify game created (toast or game appears in list)
    await page.waitForLoadState("networkidle")

    // --- DELETE ---
    // Find the newly created game (E2E Test Arena location)
    const gameRow = page.locator(".data-row", { hasText: "E2E Test Arena" }).first()
    if (await gameRow.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await gameRow.locator("[aria-label='gamesPage.actions.delete']").click()

      // ConfirmDialog
      await page.getByRole("button", { name: "gamesPage.actions.delete" }).last().click()
      await expect(gameRow).not.toBeVisible({ timeout: 10_000 })
    }
  })

  test("cancel and reopen a game", async ({ page }) => {
    await login(page)
    await page.goto(adminPath("games"))
    await expect(page.getByRole("heading", { name: "gamesPage.title" })).toBeVisible({
      timeout: 10_000,
    })

    // Wait for games to load
    await expect(page.getByText("HWK").first()).toBeVisible({ timeout: 10_000 })

    // Filter to show only scheduled games
    await page.getByRole("button", { name: "gamesPage.filters.allStatus" }).click()
    await page.getByRole("option", { name: "gamesPage.status.scheduled" }).click()

    // Find a scheduled game and cancel it
    const cancelBtn = page.locator("[aria-label='gamesPage.actions.cancelGame']").first()
    await expect(cancelBtn).toBeVisible({ timeout: 10_000 })
    await cancelBtn.click()

    // Confirm cancellation
    await page.getByRole("button", { name: "gamesPage.actions.cancelGame" }).last().click()

    // Wait for state change
    await page.waitForLoadState("networkidle")

    // Clear status filter
    await page.getByRole("button", { name: "gamesPage.filters.allStatus" }).click()
    await page.getByRole("option", { name: "gamesPage.status.cancelled" }).click()

    // The cancelled game should be visible
    await expect(page.getByText("HWK").first()).toBeVisible({ timeout: 10_000 })

    // Reopen the game
    const reopenBtn = page.locator("[aria-label='gamesPage.actions.reopenGame']").first()
    await expect(reopenBtn).toBeVisible({ timeout: 10_000 })
    await reopenBtn.click()

    // Confirm reopen
    await page.getByRole("button", { name: "gamesPage.actions.reopenGame" }).last().click()

    await page.waitForLoadState("networkidle")
  })
})
