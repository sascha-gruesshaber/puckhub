import { expect, test } from "@playwright/test"

const ORG_ID = "e2e-org-id"
const q = `?orgId=${ORG_ID}`

test.describe("Localized Routes", () => {
  test("/tabelle renders same content as /standings", async ({ page }) => {
    await page.goto(`/tabelle${q}`)
    await expect(page.getByText("E2E Hawks")).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText("E2E Bears")).toBeVisible()
  })

  test("/spielplan renders same content as /schedule", async ({ page }) => {
    await page.goto(`/spielplan${q}`)
    await expect(page.getByText("HWK").first()).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText("BRS").first()).toBeVisible()
  })

  test("/neuigkeiten/$newsId renders German news detail", async ({ page }) => {
    // No standalone /neuigkeiten route exists — only /neuigkeiten/$newsId
    // Get a news article link from the home page first
    await page.goto(`/${q}`)
    const articleLink = page.getByRole("link", { name: /Season Kickoff/ })
    await expect(articleLink).toBeVisible({ timeout: 15_000 })
    const href = await articleLink.getAttribute("href")

    // Convert /news/$id to /neuigkeiten/$id
    const germanHref = href!.replace("/news/", "/neuigkeiten/")
    const sep = germanHref.includes("?") ? "&" : "?"
    await page.goto(`${germanHref}${sep}orgId=${ORG_ID}`)

    await expect(page.getByRole("heading", { name: /Season Kickoff/ })).toBeVisible({ timeout: 15_000 })
  })

  test("/statistiken/scorer renders same content as /stats/scorers", async ({ page }) => {
    await page.goto(`/statistiken/scorer${q}`)
    await expect(page.getByText("Hawkins").first()).toBeVisible({ timeout: 15_000 })
  })
})
