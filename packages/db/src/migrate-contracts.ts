import { config } from "dotenv"
import postgres from "postgres"

config({ path: "../../.env" })

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is required")
}

const sql = postgres(connectionString)

async function migrate() {
  console.log("Applying contracts redesign migration...")

  // 1. Drop old FK and column
  await sql`ALTER TABLE "contracts" DROP CONSTRAINT IF EXISTS "contracts_season_id_seasons_id_fk"`
  console.log("  Dropped season_id FK constraint")

  await sql`ALTER TABLE "contracts" DROP COLUMN IF EXISTS "season_id"`
  console.log("  Dropped season_id column")

  // 2. Add new columns
  await sql`ALTER TABLE "contracts" ADD COLUMN IF NOT EXISTS "position" "position" NOT NULL DEFAULT 'forward'`
  console.log("  Added position column")

  await sql`ALTER TABLE "contracts" ADD COLUMN IF NOT EXISTS "start_season_id" uuid`
  console.log("  Added start_season_id column")

  await sql`ALTER TABLE "contracts" ADD COLUMN IF NOT EXISTS "end_season_id" uuid`
  console.log("  Added end_season_id column")

  await sql`ALTER TABLE "contracts" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL`
  console.log("  Added updated_at column")

  // 3. Make start_season_id NOT NULL (after adding — in case there are rows, we'd need to backfill first)
  // Check if there are any rows with NULL start_season_id
  const nullRows = await sql`SELECT count(*) as cnt FROM "contracts" WHERE "start_season_id" IS NULL`
  const nullCount = Number(nullRows[0]?.cnt ?? 0)
  if (nullCount > 0) {
    console.log(`  WARNING: ${nullCount} contracts have NULL start_season_id — deleting orphaned rows`)
    await sql`DELETE FROM "contracts" WHERE "start_season_id" IS NULL`
  }
  await sql`ALTER TABLE "contracts" ALTER COLUMN "start_season_id" SET NOT NULL`
  console.log("  Set start_season_id to NOT NULL")

  // 4. Add FK constraints (idempotent with IF NOT EXISTS workaround)
  await sql`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'contracts_start_season_id_seasons_id_fk') THEN
        ALTER TABLE "contracts" ADD CONSTRAINT "contracts_start_season_id_seasons_id_fk"
          FOREIGN KEY ("start_season_id") REFERENCES "public"."seasons"("id") ON DELETE cascade ON UPDATE no action;
      END IF;
    END $$
  `
  console.log("  Added start_season_id FK")

  await sql`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'contracts_end_season_id_seasons_id_fk') THEN
        ALTER TABLE "contracts" ADD CONSTRAINT "contracts_end_season_id_seasons_id_fk"
          FOREIGN KEY ("end_season_id") REFERENCES "public"."seasons"("id") ON DELETE set null ON UPDATE no action;
      END IF;
    END $$
  `
  console.log("  Added end_season_id FK")

  // 5. Add unique constraint
  await sql`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'contracts_player_id_team_id_start_season_id_unique') THEN
        ALTER TABLE "contracts" ADD CONSTRAINT "contracts_player_id_team_id_start_season_id_unique"
          UNIQUE ("player_id", "team_id", "start_season_id");
      END IF;
    END $$
  `
  console.log("  Added unique constraint")

  // 6. Drop position from players
  await sql`ALTER TABLE "players" DROP COLUMN IF EXISTS "position"`
  console.log("  Dropped position from players")

  console.log("Migration complete!")
  await sql.end()
}

migrate().catch((err) => {
  console.error("Migration failed:", err)
  process.exit(1)
})
