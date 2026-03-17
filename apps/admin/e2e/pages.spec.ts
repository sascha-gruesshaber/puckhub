import { randomUUID } from "node:crypto"
import { expect, test } from "@playwright/test"
import { E2E_ORG_ID, adminPath, login, withE2EDb } from "./helpers"

type PageFixture = {
  id: string
  title: string
  slug: string
}

function slugifyPageTitle(text: string) {
  return text
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
}

async function createPageFixture(title: string): Promise<PageFixture> {
  const id = randomUUID()
  const now = new Date().toISOString()
  const slug = `${slugifyPageTitle(title)}-${randomUUID().slice(0, 8)}`

  await withE2EDb(async (sql) => {
    await sql`
      INSERT INTO pages (id, organization_id, title, slug, content, status, parent_id, menu_locations, sort_order, is_system_route, created_at, updated_at)
      VALUES (
        ${id},
        ${E2E_ORG_ID},
        ${title},
        ${slug},
        ${`<p>${title} content</p>`},
        ${"published"},
        ${null},
        ${"{footer}"},
        ${0},
        ${false},
        ${now},
        ${now}
      )
    `
  })

  return { id, title, slug }
}

async function deletePageFixture(id: string) {
  await withE2EDb(async (sql) => {
    await sql`
      DELETE FROM pages
      WHERE id = ${id}
    `
  })
}

async function expectPageExists(id: string, expected = true) {
  const exists = await withE2EDb(async (sql) => {
    const rows = await sql<{ id: string }[]>`
      SELECT id
      FROM pages
      WHERE id = ${id}
      LIMIT 1
    `
    return rows.length > 0
  })

  expect(exists).toBe(expected)
}

async function findPageIdByTitle(title: string) {
  return withE2EDb(async (sql) => {
    const rows = await sql<{ id: string }[]>`
      SELECT id
      FROM pages
      WHERE organization_id = ${E2E_ORG_ID}
        AND title = ${title}
      ORDER BY created_at DESC
      LIMIT 1
    `
    return rows[0]?.id ?? null
  })
}

test.describe("Pages Management", () => {
  test("pages list shows system routes and custom pages", async ({ page }) => {
    await login(page)
    await page.goto(adminPath("pages"))
    await expect(page.getByRole("heading", { name: "pagesPage.title" })).toBeVisible({
      timeout: 10_000,
    })

    // Default tab is main_nav — system routes should be visible (wait for data to load)
    await expect(page.locator("h3", { hasText: "Standings" }).first()).toBeVisible({ timeout: 10_000 })
    await expect(page.locator("h3", { hasText: "Schedule" }).first()).toBeVisible()

    // Switch to footer tab to see custom pages
    await page.getByTestId("pages-tab-footer").click()
    await expect(page.locator("h3", { hasText: "About Us" })).toBeVisible({ timeout: 10_000 })
    await expect(page.locator("h3", { hasText: "Legal Notice" })).toBeVisible()
  })

  test("create a custom page", async ({ page }) => {
    const pageTitle = `E2E Test Page ${Date.now()}`

    await login(page)
    await page.goto(adminPath("pages"))
    await expect(page.getByRole("heading", { name: "pagesPage.title" })).toBeVisible({
      timeout: 10_000,
    })

    try {
      await page.getByTestId("pages-new").click()
      await expect(page).toHaveURL(/\/pages\/new/)

      await page.getByTestId("page-form-title").fill(pageTitle)

      const editor = page.getByTestId("page-form-editor").locator("[contenteditable='true']").first()
      await editor.click()
      await editor.pressSequentially("This is E2E test content for the custom page.")

      await page.getByTestId("page-form-status-published").check()
      await page.getByTestId("page-form-menu-footer").check()
      await page.getByTestId("page-form-submit").click()

      await expect(page.getByRole("heading", { name: "pagesPage.title" })).toBeVisible({
        timeout: 10_000,
      })
      await page.getByTestId("pages-tab-footer").click()
      await expect(page.locator("h3", { hasText: pageTitle })).toBeVisible({ timeout: 10_000 })

      const createdId = await findPageIdByTitle(pageTitle)
      expect(createdId).not.toBeNull()
      await expectPageExists(createdId!)
      await deletePageFixture(createdId!)
    } catch (error) {
      await withE2EDb(async (sql) => {
        await sql`
          DELETE FROM pages
          WHERE organization_id = ${E2E_ORG_ID}
            AND title = ${pageTitle}
        `
      })
      throw error
    }
  })

  test("update a custom page", async ({ page }) => {
    const originalTitle = `E2E Editable Page ${Date.now()}`
    const updatedTitle = `${originalTitle} Updated`
    const pageFixture = await createPageFixture(originalTitle)

    try {
      await login(page)
      await page.goto(adminPath("pages"))
      await expect(page.getByRole("heading", { name: "pagesPage.title" })).toBeVisible({
        timeout: 10_000,
      })

      await page.getByTestId("pages-tab-footer").click()
      await page.locator("a", { hasText: originalTitle }).click()
      await expect(page).toHaveURL(/\/pages\/.*\/edit/)

      const titleField = page.getByTestId("page-form-title")
      await titleField.clear()
      await titleField.fill(updatedTitle)
      await page.getByTestId("page-form-submit").click()

      await expect(page.getByRole("heading", { name: "pagesPage.title" })).toBeVisible({
        timeout: 10_000,
      })
      await page.getByTestId("pages-tab-footer").click()
      await expect(page.locator("h3", { hasText: updatedTitle })).toBeVisible({ timeout: 10_000 })

      const storedPage = await withE2EDb(async (sql) => {
        const rows = await sql<{ title: string; slug: string }[]>`
          SELECT title, slug
          FROM pages
          WHERE id = ${pageFixture.id}
        `
        return rows[0] ?? null
      })

      expect(storedPage?.title).toBe(updatedTitle)
      expect(storedPage?.slug).toContain("updated")
    } finally {
      await deletePageFixture(pageFixture.id)
    }
  })

  test("delete a custom page", async ({ page }) => {
    const pageFixture = await createPageFixture(`E2E Deletable Page ${Date.now()}`)

    await login(page)
    await page.goto(adminPath("pages"))
    await expect(page.getByRole("heading", { name: "pagesPage.title" })).toBeVisible({
      timeout: 10_000,
    })

    await page.getByTestId("pages-tab-footer").click()
    await page.locator("a", { hasText: pageFixture.title }).click()

    await expect(page).toHaveURL(/\/pages\/.*\/edit/)
    await page.getByTestId("page-delete").click()
    await page.getByTestId("page-delete-confirm").click()

    await expect(page.getByRole("heading", { name: "pagesPage.title" })).toBeVisible({
      timeout: 10_000,
    })
    await page.getByTestId("pages-tab-footer").click()
    await expect(page.locator("a", { hasText: pageFixture.title })).toHaveCount(0)
    await expectPageExists(pageFixture.id, false)
  })

  test("system routes cannot be deleted", async ({ page }) => {
    await login(page)
    await page.goto(adminPath("pages"))
    await expect(page.getByRole("heading", { name: "pagesPage.title" })).toBeVisible({
      timeout: 10_000,
    })

    // Wait for system routes to load
    await expect(page.locator("h3", { hasText: "Standings" }).first()).toBeVisible({ timeout: 10_000 })

    // Open the system route and assert there is no delete action on the edit page
    await page.locator("a", { hasText: "Standings" }).first().click()
    await expect(page).toHaveURL(/\/pages\/.*\/edit/)
    await expect(page.getByTestId("page-delete")).toHaveCount(0)
  })
})
