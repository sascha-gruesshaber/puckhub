import { expect, test } from "@playwright/test"
import { adminPath, login } from "./helpers"

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
    await expect(page.getByText("3").first()).toBeVisible()

    // Report should show "active" badge
    await expect(page.getByText("publicReports.active")).toBeVisible()
  })

  test("revert a public report", async ({ page }) => {
    await login(page)
    await page.goto(adminPath("games/public-reports"))
    await expect(page.getByRole("heading", { name: "publicReports.title" })).toBeVisible({
      timeout: 10_000,
    })

    // Wait for report data to load
    await expect(page.getByText("f***@example.com")).toBeVisible({ timeout: 10_000 })

    // Click revert button on the active report
    await page.getByRole("button", { name: "publicReports.revert" }).first().click()

    // Confirm dialog should appear
    await expect(page.getByText("publicReports.revertTitle")).toBeVisible()
    await expect(page.getByText("publicReports.revertDescription")).toBeVisible()

    // Optionally fill revert note
    await page.getByPlaceholder("publicReports.revertNotePlaceholder").fill("Wrong score submitted")

    // Confirm revert
    await page.getByRole("button", { name: "publicReports.revert" }).last().click()

    // After revert, the report should show "reverted" badge
    await expect(page.getByText("publicReports.reverted")).toBeVisible({ timeout: 10_000 })
  })
})
