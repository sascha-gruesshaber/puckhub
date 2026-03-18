import { randomUUID } from "node:crypto"
import { expect, test } from "@playwright/test"
import { adminPath, E2E_ADMIN_USER_ID, E2E_ORG_ID, login, withE2EDb } from "./helpers"

type NewsFixture = {
  id: string
  title: string
}

async function createNewsFixture(title: string): Promise<NewsFixture> {
  const id = randomUUID()
  const now = new Date().toISOString()

  await withE2EDb(async (sql) => {
    await sql`
      INSERT INTO news (id, organization_id, title, short_text, content, status, author_id, published_at, created_at, updated_at)
      VALUES (
        ${id},
        ${E2E_ORG_ID},
        ${title},
        ${`${title} short text`},
        ${`<p>${title} content</p>`},
        ${"published"},
        ${E2E_ADMIN_USER_ID},
        ${now},
        ${now},
        ${now}
      )
    `
  })

  return { id, title }
}

async function deleteNewsFixture(id: string) {
  await withE2EDb(async (sql) => {
    await sql`
      DELETE FROM news
      WHERE id = ${id}
    `
  })
}

async function expectNewsExists(id: string, expected = true) {
  const exists = await withE2EDb(async (sql) => {
    const rows = await sql<{ id: string }[]>`
      SELECT id
      FROM news
      WHERE id = ${id}
      LIMIT 1
    `
    return rows.length > 0
  })

  expect(exists).toBe(expected)
}

async function findNewsIdByTitle(title: string) {
  return withE2EDb(async (sql) => {
    const rows = await sql<{ id: string }[]>`
      SELECT id
      FROM news
      WHERE organization_id = ${E2E_ORG_ID}
        AND title = ${title}
      ORDER BY created_at DESC
      LIMIT 1
    `
    return rows[0]?.id ?? null
  })
}

test.describe("News Management", () => {
  test("news list shows seeded articles", async ({ page }) => {
    await login(page)
    await page.goto(adminPath("news"))
    await expect(page.getByRole("heading", { name: "newsPage.title" })).toBeVisible({
      timeout: 10_000,
    })

    await expect(page.getByText("Season Kickoff")).toBeVisible()
    await expect(page.getByText("Trade Deadline Recap")).toBeVisible()
    await expect(page.getByText("Playoff Preview")).toBeVisible() // draft is visible in admin
  })

  test("create a news article", async ({ page }) => {
    const articleTitle = `E2E Created Article ${Date.now()}`

    await login(page)
    await page.goto(adminPath("news"))
    await expect(page.getByRole("heading", { name: "newsPage.title" })).toBeVisible({
      timeout: 10_000,
    })

    try {
      await page.getByTestId("news-new").click()
      await expect(page).toHaveURL(/\/news\/new/)

      await page.getByTestId("news-form-title").fill(articleTitle)

      const editor = page.getByTestId("news-form-editor").locator("[contenteditable='true']").first()
      await editor.click()
      await editor.pressSequentially("This is E2E test content for the news article.")

      await page.getByTestId("news-form-submit").click()

      await expect(page.getByRole("heading", { name: "newsPage.title" })).toBeVisible({
        timeout: 10_000,
      })
      await expect(page.getByText(articleTitle)).toBeVisible({ timeout: 10_000 })

      const createdId = await findNewsIdByTitle(articleTitle)
      expect(createdId).not.toBeNull()
      await expectNewsExists(createdId!)
      await deleteNewsFixture(createdId!)
    } catch (error) {
      await withE2EDb(async (sql) => {
        await sql`
          DELETE FROM news
          WHERE organization_id = ${E2E_ORG_ID}
            AND title = ${articleTitle}
        `
      })
      throw error
    }
  })

  test("update a news article", async ({ page }) => {
    const originalTitle = `E2E Editable Article ${Date.now()}`
    const updatedTitle = `${originalTitle} Updated`
    const article = await createNewsFixture(originalTitle)

    try {
      await login(page)
      await page.goto(adminPath("news"))
      await expect(page.getByRole("heading", { name: "newsPage.title" })).toBeVisible({
        timeout: 10_000,
      })

      await page.getByTestId("news-row").filter({ hasText: originalTitle }).click()
      await expect(page).toHaveURL(/\/news\/.*\/edit/)

      const titleField = page.getByTestId("news-form-title")
      await titleField.clear()
      await titleField.fill(updatedTitle)
      await page.getByTestId("news-form-submit").click()

      await expect(page.getByRole("heading", { name: "newsPage.title" })).toBeVisible({
        timeout: 10_000,
      })
      await expect(page.getByText(updatedTitle)).toBeVisible({ timeout: 10_000 })

      const storedTitle = await withE2EDb(async (sql) => {
        const rows = await sql<{ title: string }[]>`
          SELECT title
          FROM news
          WHERE id = ${article.id}
        `
        return rows[0]?.title ?? null
      })

      expect(storedTitle).toBe(updatedTitle)
    } finally {
      await deleteNewsFixture(article.id)
    }
  })

  test("delete a news article", async ({ page }) => {
    const article = await createNewsFixture(`E2E Deletable Article ${Date.now()}`)

    await login(page)
    await page.goto(adminPath("news"))
    await expect(page.getByRole("heading", { name: "newsPage.title" })).toBeVisible({
      timeout: 10_000,
    })

    await page.getByTestId("news-row").filter({ hasText: article.title }).click()
    await expect(page).toHaveURL(/\/news\/.*\/edit/)

    await page.getByTestId("news-delete").click()
    await page.getByTestId("news-delete-confirm").click()

    await expect(page.getByRole("heading", { name: "newsPage.title" })).toBeVisible({
      timeout: 10_000,
    })
    await expect(page.getByTestId("news-row").filter({ hasText: article.title })).toHaveCount(0)
    await expectNewsExists(article.id, false)
  })
})
