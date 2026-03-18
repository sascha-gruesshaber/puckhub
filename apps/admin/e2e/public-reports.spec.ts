import { randomUUID } from "node:crypto"
import { expect, test } from "@playwright/test"
import { adminPath, E2E_ORG_ID, login, withE2EDb } from "./helpers"

async function getCompletedGameId(): Promise<string> {
  return withE2EDb(async (sql) => {
    const rows = await sql<{ id: string }[]>`
      SELECT id FROM games
      WHERE organization_id = ${E2E_ORG_ID} AND status = 'completed'
      LIMIT 1
    `
    if (!rows[0]) throw new Error("No completed game found in DB")
    return rows[0].id
  })
}

async function createPublicReportFixture(): Promise<{ id: string }> {
  const id = randomUUID()
  const gameId = await getCompletedGameId()

  await withE2EDb(async (sql) => {
    await sql`
      INSERT INTO public_game_reports (id, organization_id, game_id, home_score, away_score, submitter_email_masked, comment)
      VALUES (
        ${id},
        ${E2E_ORG_ID},
        ${gameId},
        ${5},
        ${1},
        ${"t***@test.local"},
        ${"E2E fixture report"}
      )
    `
  })

  return { id }
}

async function deletePublicReportFixture(id: string) {
  await withE2EDb(async (sql) => {
    await sql`DELETE FROM public_game_reports WHERE id = ${id}`
  })
}

test.describe("Public Reports Management", () => {
  test("public reports page loads and shows seeded report", async ({ page }) => {
    await login(page)
    await page.goto(adminPath("games/public-reports"))
    await expect(page.getByRole("heading", { name: "publicReports.title" })).toBeVisible({
      timeout: 10_000,
    })

    // Seeded report: Hawks (HWK) vs Bears (BRS), 3:2, masked submitter email
    await expect(page.getByText("HWK").first()).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText("BRS").first()).toBeVisible()
    await expect(page.getByText("f***@example.com")).toBeVisible()

    // Report should show "active" badge
    await expect(page.getByText("publicReports.active")).toBeVisible()
  })

  test("revert a public report", async ({ page }) => {
    const report = await createPublicReportFixture()

    try {
      await login(page)
      await page.goto(adminPath("games/public-reports"))
      await expect(page.getByRole("heading", { name: "publicReports.title" })).toBeVisible({
        timeout: 10_000,
      })

      // Wait for our fixture report to appear
      await expect(page.getByText("t***@test.local")).toBeVisible({ timeout: 10_000 })

      // Click revert on the fixture report row
      const reportRow = page.getByTestId("public-report-row").filter({ hasText: "t***@test.local" })
      await reportRow.getByTestId("public-report-revert").click()

      // Confirm dialog should appear
      await expect(page.getByText("publicReports.revertTitle")).toBeVisible()

      // Fill revert note
      await page.getByTestId("public-report-revert-note").fill("E2E test revert")

      // Confirm revert
      await page.getByTestId("public-report-revert-confirm").click()

      // After revert, the report should show "reverted" badge
      await expect(reportRow.getByText("publicReports.reverted")).toBeVisible({ timeout: 10_000 })
    } finally {
      await deletePublicReportFixture(report.id)
    }
  })
})
