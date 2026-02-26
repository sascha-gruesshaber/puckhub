import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { config } from 'dotenv'

const migrationDir = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(migrationDir, '../../../../.env') })

import { createPrismaClientWithUrl } from '../index'
import { analyzeLegacy, connectLegacyMySQL, migrateLegacy } from './legacyMigrate'

const analyzeOnly = process.argv.includes('--analyze-only')

async function main() {
  const conn = await connectLegacyMySQL()

  if (analyzeOnly) {
    console.log('\n=== ANALYSIS MODE (read-only) ===\n')
    await analyzeLegacy(conn)
    await conn.end()
    return
  }

  console.log('\n=== MIGRATION MODE ===\n')
  const db = createPrismaClientWithUrl(process.env.DATABASE_URL!)

  try {
    await migrateLegacy(db, conn)
    console.log('Migration completed successfully.')
  } finally {
    await conn.end()
    await db.$disconnect()
  }
}

main().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
