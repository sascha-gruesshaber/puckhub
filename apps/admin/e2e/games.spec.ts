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

    // Filter to completed games
    await page.locator("button.filter-pill").last().click()

    await page.getByRole("option", { name: "gamesPage.status.completed" }).click()

    await expect(page.locator(".data-row", { hasText: "gamesPage.status.completed" }).first()).toBeVisible({
      timeout: 10_000,
    })

    // Re-open the page so the status filter trigger resets to its default label
    await page.goto(adminPath("games"))
    await expect(page.getByText("HWK").first()).toBeVisible({ timeout: 10_000 })

    await page.locator("button.filter-pill").last().click()
    await page.getByRole("option", { name: "gamesPage.status.scheduled" }).click()

    await expect(page.locator(".data-row", { hasText: "gamesPage.status.scheduled" }).first()).toBeVisible({
      timeout: 10_000,
    })
  })

  test("team filter can be applied from the filter dropdown", async ({ page }) => {
    await login(page)
    await page.goto(adminPath("games"))
    await expect(page.getByRole("heading", { name: "gamesPage.title" })).toBeVisible({
      timeout: 10_000,
    })

    await expect(page.getByText("HWK").first()).toBeVisible({ timeout: 10_000 })

    await page.locator("button.filter-pill").first().click()

    await page.getByRole("option", { name: "HWK" }).click()

    await expect(page.locator("button.filter-pill").first()).toContainText("HWK")
  })

  test("create a game from the new game sheet", async ({ page }) => {
    await login(page)
    await page.goto(adminPath("games"))
    await expect(page.getByRole("heading", { name: "gamesPage.title" })).toBeVisible({
      timeout: 10_000,
    })

    // --- CREATE ---
    await page.getByRole("button", { name: "gamesPage.actions.newGame" }).click()

    // Select round
    const roundContainer = page.locator("label", { hasText: "gamesPage.form.fields.round" }).locator("xpath=..")
    await roundContainer.getByRole("combobox").click()
    await page.getByRole("option", { name: "Regular Season" }).click()

    // Select home team via TeamCombobox
    const homeTeamContainer = page.locator("label", { hasText: "gamesPage.form.fields.homeTeam" }).locator("xpath=..")
    await homeTeamContainer.getByRole("combobox").click()
    await page.getByRole("option", { name: /E2E Hawks/ }).click()

    // Select away team via TeamCombobox
    const awayTeamContainer = page.locator("label", { hasText: "gamesPage.form.fields.awayTeam" }).locator("xpath=..")
    await awayTeamContainer.getByRole("combobox").click()
    await page.getByRole("option", { name: /E2E Bears/ }).click()

    // Fill location
    await formField(page, "gamesPage.form.fields.location").fill("E2E Test Arena")

    // Fill date/time (future date)
    await formField(page, "gamesPage.form.fields.scheduledAt").fill("2026-04-01T18:00")

    await page.getByRole("button", { name: "create" }).click()

    // Handle midnight confirmation dialog if it appears
    const midnightConfirm = page.getByRole("button", { name: "gamesPage.dialogs.midnightConfirmButton" })
    if (await midnightConfirm.isVisible({ timeout: 1_000 }).catch(() => false)) {
      await midnightConfirm.click()
    }

    await expect(page.getByText("gamesPage.toast.gameCreated")).toBeVisible({ timeout: 10_000 })
    await expect(page.locator(".data-row", { hasText: "E2E Test Arena" }).first()).toBeVisible({ timeout: 10_000 })
  })

  test("scheduled games can be opened from the list", async ({ page }) => {
    await login(page)
    await page.goto(adminPath("games"))
    await expect(page.getByRole("heading", { name: "gamesPage.title" })).toBeVisible({
      timeout: 10_000,
    })

    // Wait for games to load
    await expect(page.getByText("HWK").first()).toBeVisible({ timeout: 10_000 })

    const scheduledGameRow = page.locator(".data-row", { hasText: "gamesPage.status.scheduled" }).first()
    await expect(scheduledGameRow).toBeVisible({ timeout: 10_000 })
    await scheduledGameRow.click()

    await expect(page.getByText("gameReport.completeSection.button")).toBeVisible({ timeout: 10_000 })
  })
})
