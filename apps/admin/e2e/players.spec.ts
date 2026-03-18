import { randomUUID } from "node:crypto"
import { expect, test } from "@playwright/test"
import { adminPath, E2E_ORG_ID, login, withE2EDb } from "./helpers"

type PlayerFixture = {
  id: string
  firstName: string
  lastName: string
}

async function createPlayerFixture(firstName: string, lastName: string): Promise<PlayerFixture> {
  const id = randomUUID()
  const now = new Date().toISOString()

  await withE2EDb(async (sql) => {
    await sql`
      INSERT INTO players (id, organization_id, first_name, last_name, created_at, updated_at)
      VALUES (${id}, ${E2E_ORG_ID}, ${firstName}, ${lastName}, ${now}, ${now})
    `
  })

  return { id, firstName, lastName }
}

async function deletePlayerFixture(id: string) {
  await withE2EDb(async (sql) => {
    await sql`DELETE FROM players WHERE id = ${id}`
  })
}

test.describe("Players Management", () => {
  test("players list loads with seeded data", async ({ page }) => {
    await login(page)
    await page.goto(adminPath("players"))
    await expect(page.getByRole("heading", { name: "playersPage.title" })).toBeVisible({
      timeout: 10_000,
    })

    // Should show seeded players
    await expect(page.getByText("Hawkins").first()).toBeVisible()
    await expect(page.getByText("Bradley").first()).toBeVisible()
  })

  test("create a player", async ({ page }) => {
    const lastName = `TestPlayer${Date.now()}`

    await login(page)
    await page.goto(adminPath("players"))
    await expect(page.getByRole("heading", { name: "playersPage.title" })).toBeVisible({
      timeout: 10_000,
    })

    try {
      await page.getByTestId("players-new").click()
      await page.getByTestId("players-form-first-name").fill("E2E")
      await page.getByTestId("players-form-last-name").fill(lastName)
      await page.getByTestId("players-form-submit").click()

      // New players are unassigned — select the unassigned filter
      await page.locator("button.filter-pill").first().click()
      await page.getByRole("option", { name: "playersPage.filters.unassigned" }).click()

      await expect(page.getByTestId("player-row").filter({ hasText: lastName })).toBeVisible({
        timeout: 10_000,
      })
    } finally {
      // Cleanup
      await withE2EDb(async (sql) => {
        await sql`DELETE FROM players WHERE organization_id = ${E2E_ORG_ID} AND last_name = ${lastName}`
      })
    }
  })

  test("update a player", async ({ page }) => {
    const originalLastName = `EditablePlayer${Date.now()}`
    const updatedLastName = `${originalLastName}Updated`
    const player = await createPlayerFixture("E2E", originalLastName)

    try {
      await login(page)
      await page.goto(adminPath("players"))
      await expect(page.getByRole("heading", { name: "playersPage.title" })).toBeVisible({
        timeout: 10_000,
      })

      // Unassigned fixture player needs unassigned filter
      await page.locator("button.filter-pill").first().click()
      await page.getByRole("option", { name: "playersPage.filters.unassigned" }).click()

      await page.getByTestId("player-row").filter({ hasText: originalLastName }).click()
      await expect(page).toHaveURL(/\/players\/.+/)

      await page.getByTestId("player-edit-info").click()

      const lastNameField = page.getByTestId("player-edit-last-name")
      await lastNameField.clear()
      await lastNameField.fill(updatedLastName)

      await page.getByTestId("player-edit-submit").click()
      await expect(page.getByRole("heading", { name: `E2E ${updatedLastName}` })).toBeVisible({
        timeout: 10_000,
      })
    } finally {
      await deletePlayerFixture(player.id)
    }
  })
})
