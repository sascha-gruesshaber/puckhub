import { randomUUID } from "node:crypto"
import { expect, test } from "@playwright/test"
import { adminPath, E2E_ORG_ID, login, withE2EDb } from "./helpers"

type TrikotFixture = {
  id: string
  name: string
}

async function getOneColorTemplateId(): Promise<string> {
  return withE2EDb(async (sql) => {
    const rows = await sql<{ id: string }[]>`
      SELECT id FROM trikot_templates WHERE template_type = 'one_color' LIMIT 1
    `
    if (!rows[0]) throw new Error("No one_color template found in DB")
    return rows[0].id
  })
}

async function createTrikotFixture(name: string): Promise<TrikotFixture> {
  const id = randomUUID()
  const now = new Date().toISOString()
  const templateId = await getOneColorTemplateId()

  await withE2EDb(async (sql) => {
    await sql`
      INSERT INTO trikots (id, organization_id, name, template_id, primary_color, created_at, updated_at)
      VALUES (
        ${id},
        ${E2E_ORG_ID},
        ${name},
        ${templateId},
        ${"#FF0000"},
        ${now},
        ${now}
      )
    `
  })

  return { id, name }
}

async function deleteTrikotFixture(id: string) {
  await withE2EDb(async (sql) => {
    await sql`DELETE FROM trikots WHERE id = ${id}`
  })
}

async function findTrikotIdByName(name: string) {
  return withE2EDb(async (sql) => {
    const rows = await sql<{ id: string }[]>`
      SELECT id FROM trikots
      WHERE organization_id = ${E2E_ORG_ID} AND name = ${name}
      ORDER BY created_at DESC LIMIT 1
    `
    return rows[0]?.id ?? null
  })
}

test.describe("Trikots Management", () => {
  test("create a trikot", async ({ page }) => {
    const trikotName = `E2E Trikot ${Date.now()}`

    await login(page)
    await page.goto(adminPath("trikots"))
    await expect(page.getByRole("heading", { name: "trikotsPage.title" })).toBeVisible({
      timeout: 10_000,
    })

    try {
      await page.getByTestId("trikots-new").click()

      await page.getByTestId("trikot-form-name").fill(trikotName)
      await page.getByTestId("trikot-form-template-one_color").click()
      await page.getByTestId("trikot-form-submit").click()

      // Verify trikot appears in list
      await expect(page.getByTestId("trikot-row").filter({ hasText: trikotName })).toBeVisible({
        timeout: 10_000,
      })

      // Cleanup
      const createdId = await findTrikotIdByName(trikotName)
      if (createdId) await deleteTrikotFixture(createdId)
    } catch (error) {
      // Cleanup on failure
      await withE2EDb(async (sql) => {
        await sql`DELETE FROM trikots WHERE organization_id = ${E2E_ORG_ID} AND name = ${trikotName}`
      })
      throw error
    }
  })

  test("update a trikot", async ({ page }) => {
    const originalName = `E2E Editable Trikot ${Date.now()}`
    const updatedName = `${originalName} Updated`
    const trikot = await createTrikotFixture(originalName)

    try {
      await login(page)
      await page.goto(adminPath("trikots"))
      await expect(page.getByRole("heading", { name: "trikotsPage.title" })).toBeVisible({
        timeout: 10_000,
      })

      await page.getByTestId("trikot-row").filter({ hasText: originalName }).click()

      const nameField = page.getByTestId("trikot-form-name")
      await nameField.clear()
      await nameField.fill(updatedName)
      await page.getByTestId("trikot-form-submit").click()

      // Verify updated name in list
      await expect(page.getByTestId("trikot-row").filter({ hasText: updatedName })).toBeVisible({
        timeout: 10_000,
      })
    } finally {
      await deleteTrikotFixture(trikot.id)
    }
  })

  test("delete a trikot", async ({ page }) => {
    const trikot = await createTrikotFixture(`E2E Deletable Trikot ${Date.now()}`)

    await login(page)
    await page.goto(adminPath("trikots"))
    await expect(page.getByRole("heading", { name: "trikotsPage.title" })).toBeVisible({
      timeout: 10_000,
    })

    await page.getByTestId("trikot-row").filter({ hasText: trikot.name }).click()
    await page.getByTestId("trikot-delete").click()
    await page.getByTestId("trikot-delete-confirm").click()

    await expect(page.getByTestId("trikot-row").filter({ hasText: trikot.name })).toHaveCount(0, {
      timeout: 10_000,
    })
  })
})
