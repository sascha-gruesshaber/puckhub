import { expect, test } from "@playwright/test"
import { login } from "./helpers"

test.describe("Navigation", () => {
  test("dashboard loads with stats cards", async ({ page }) => {
    await login(page)
    await expect(page.getByRole("heading", { name: "dashboard.title" })).toBeVisible()
  })

  test("sidebar links navigate to correct pages", async ({ page }) => {
    await login(page)

    // Sidebar link text → expected page heading (using raw i18n keys)
    const routes = [
      { link: "sidebar.items.teams", heading: "teamsPage.title" },
      { link: "sidebar.items.players", heading: "playersPage.title" },
      { link: "sidebar.items.games", heading: "gamesPage.title" },
      { link: "sidebar.items.news", heading: "newsPage.title" },
      { link: "sidebar.items.pages", heading: "pagesPage.title" },
      { link: "sidebar.items.trikots", heading: "trikotsPage.title" },
      { link: "sidebar.items.sponsors", heading: "sponsorsPage.title" },
      { link: "sidebar.items.users", heading: "usersPage.title" },
      { link: "sidebar.items.settings", heading: "settings.title" },
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

    // Open user dropdown in top bar
    await page.locator(".topbar-user-trigger").click()
    await page.getByText("topBar.profile").click()
    await expect(page.getByRole("heading", { name: "profile.title" })).toBeVisible({
      timeout: 10_000,
    })
  })
})
