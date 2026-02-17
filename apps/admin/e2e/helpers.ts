import type { Page } from "@playwright/test"
import { expect } from "@playwright/test"

export async function login(page: Page) {
  await page.goto("/login")
  await page.getByLabel("login.email").fill("admin@test.local")
  await page.getByLabel("login.password").fill("test1234")
  await page.getByRole("button", { name: "login.submit" }).click()
  await expect(page.getByRole("heading", { name: "dashboard.title" })).toBeVisible({ timeout: 15_000 })
}
