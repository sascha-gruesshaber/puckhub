import postgres from "postgres"
import { afterAll, afterEach, beforeEach } from "vitest"

const baseUrl = process.env.TEST_DB_BASE_URL
const template = process.env.TEST_DB_TEMPLATE

if (!baseUrl || !template) {
  throw new Error("TEST_DB_BASE_URL or TEST_DB_TEMPLATE not set — is globalSetup running?")
}

const poolId = process.env.VITEST_POOL_ID ?? String(process.pid)
let counter = 0

// Maintenance connection to the postgres DB (reused across all tests in this worker)
const maintenance = postgres(baseUrl, { max: 1 })

function replaceDbName(url: string, dbName: string): string {
  const parsed = new URL(url)
  parsed.pathname = `/${dbName}`
  return parsed.toString()
}

// Dynamically import test-utils so we can call initTestDb/closeTestDb
const { initTestDb, closeTestDb } = await import("./testUtils")

let currentDbName: string | null = null

beforeEach(async () => {
  counter++
  const dbName = `puckhub_test_${poolId}_${counter}`
  currentDbName = dbName

  // Create a fresh DB from the pre-seeded template
  await maintenance.unsafe(`CREATE DATABASE ${dbName} TEMPLATE ${template}`)

  const dbUrl = replaceDbName(baseUrl, dbName)
  initTestDb(dbUrl)
})

afterEach(async () => {
  // Close per-test connection first
  await closeTestDb()

  // Drop per-test DB
  if (currentDbName) {
    await maintenance.unsafe(`DROP DATABASE IF EXISTS ${currentDbName} WITH (FORCE)`)
    currentDbName = null
  }
})

afterAll(async () => {
  await maintenance.end()
})
