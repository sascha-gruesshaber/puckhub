import { expect, test } from "@playwright/test"
import { login } from "./helpers"

test.describe.skip("Navigation", () => {
  test("dashboard loads with stats cards", async ({ page }) => {
    await login(page)
    await expect(page.getByRole("heading", { name: "dashboard.title" })).toBeVisible()
  })

  test("sidebar links navigate to correct pages", async ({ page }) => {
    await login(page)

    const routes = [
      { link: "nav.teams", heading: "teamsPage.title" },
      { link: "nav.players", heading: "playersPage.title" },
      { link: "nav.games", heading: "gamesPage.title" },
      { link: "nav.news", heading: "newsPage.title" },
      { link: "nav.pages", heading: "pagesPage.title" },
      { link: "nav.trikots", heading: "trikotsPage.title" },
      { link: "nav.settings", heading: "settingsPage.title" },
      { link: "nav.users", heading: "usersPage.title" },
      { link: "nav.sponsors", heading: "sponsorsPage.title" },
    ]

    for (const route of routes) {
      await page.getByRole("link", { name: route.link }).click()
      await expect(page.getByRole("heading", { name: route.heading })).toBeVisible({
        timeout: 10_000,
      })
    }
  })

  test("profile page accessible from user menu", async ({ page }) => {
    await login(page)
    await page.getByTitle("profile").click()
    await expect(page.getByRole("heading", { name: "profilePage.title" })).toBeVisible({
      timeout: 10_000,
    })
  })
})
