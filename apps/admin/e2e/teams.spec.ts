import { randomUUID } from "node:crypto"
import { expect, test } from "@playwright/test"
import { adminPath, E2E_ORG_ID, login, withE2EDb } from "./helpers"

type TeamFixture = {
  id: string
  name: string
}

async function createTeamFixture(name: string): Promise<TeamFixture> {
  const id = randomUUID()
  const now = new Date().toISOString()

  await withE2EDb(async (sql) => {
    await sql`
      INSERT INTO teams (id, organization_id, name, short_name, city, created_at, updated_at)
      VALUES (${id}, ${E2E_ORG_ID}, ${name}, ${"E2E"}, ${"Test City"}, ${now}, ${now})
    `
  })

  return { id, name }
}

async function deleteTeamFixture(id: string) {
  await withE2EDb(async (sql) => {
    await sql`DELETE FROM teams WHERE id = ${id}`
  })
}

test.describe("Teams Management", () => {
  test("teams list loads with seeded data", async ({ page }) => {
    await login(page)
    await page.goto(adminPath("teams"))
    await expect(page.getByRole("heading", { name: "teamsPage.title" })).toBeVisible({
      timeout: 10_000,
    })

    // Should show seeded teams
    await expect(page.getByText("E2E Hawks")).toBeVisible()
    await expect(page.getByText("E2E Bears")).toBeVisible()
  })

  test("create a team", async ({ page }) => {
    const teamName = `E2E Created Team ${Date.now()}`

    await login(page)
    await page.goto(adminPath("teams"))
    await expect(page.getByRole("heading", { name: "teamsPage.title" })).toBeVisible({
      timeout: 10_000,
    })

    try {
      await page.getByTestId("teams-new").click()
      await page.getByTestId("teams-form-name").fill(teamName)
      await page.getByTestId("teams-form-short-name").fill("ECT")
      await page.getByTestId("teams-form-city").fill("Test City")
      await page.getByTestId("teams-form-submit").click()

      // New teams aren't in any division — select the unassigned filter
      await page.locator("button.filter-pill").first().click()
      await page.getByRole("option", { name: "teamsPage.filters.unassigned" }).click()

      await expect(page.getByTestId("team-row").filter({ hasText: teamName })).toBeVisible({
        timeout: 10_000,
      })
    } finally {
      // Cleanup
      await withE2EDb(async (sql) => {
        await sql`DELETE FROM teams WHERE organization_id = ${E2E_ORG_ID} AND name = ${teamName}`
      })
    }
  })

  test("update a team", async ({ page }) => {
    const originalName = `E2E Editable Team ${Date.now()}`
    const updatedName = `${originalName} Updated`
    const team = await createTeamFixture(originalName)

    try {
      await login(page)
      await page.goto(adminPath("teams"))
      await expect(page.getByRole("heading", { name: "teamsPage.title" })).toBeVisible({
        timeout: 10_000,
      })

      // Unassigned fixture team needs unassigned filter
      await page.locator("button.filter-pill").first().click()
      await page.getByRole("option", { name: "teamsPage.filters.unassigned" }).click()

      await page.getByTestId("team-row").filter({ hasText: originalName }).click()
      await expect(page).toHaveURL(/\/teams\/.+/)

      await page.getByTestId("team-edit").click()

      const nameField = page.getByTestId("team-edit-name")
      await nameField.clear()
      await nameField.fill(updatedName)

      await page.getByTestId("team-edit-submit").click()
      await expect(page.getByText(updatedName)).toBeVisible({ timeout: 10_000 })
    } finally {
      await deleteTeamFixture(team.id)
    }
  })
})
