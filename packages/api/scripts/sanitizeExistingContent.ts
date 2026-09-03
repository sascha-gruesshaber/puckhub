#!/usr/bin/env tsx
/**
 * One-off backfill: run every stored rich-text column through `sanitizeRichText`.
 *
 * Server-side sanitisation was added after these tables were already in use, so rows
 * written before it can still contain script tags, event handlers or `javascript:`
 * URLs. The league site renders all three columns with `dangerouslySetInnerHTML`,
 * which makes an old row just as dangerous as a new one.
 *
 * Usage (from the repo root):
 *   pnpm --filter @puckhub/api sanitize:backfill            # report only, writes nothing
 *   pnpm --filter @puckhub/api sanitize:backfill --apply    # rewrite the affected rows
 *
 * Safe to run more than once: sanitising already-clean HTML is a no-op, and only rows
 * whose content actually changes are written.
 */

import { db } from "@puckhub/db"
import { sanitizeRichText, sanitizeText } from "../src/lib/sanitizeHtml"

const APPLY = process.argv.includes("--apply")
/** Rows fetched per round trip — the columns are large, so keep batches small. */
const BATCH_SIZE = 200

interface TargetSummary {
  label: string
  scanned: number
  changed: number
}

async function backfillTable<T extends { id: string }>({
  label,
  fetchBatch,
  getContent,
  sanitize,
  write,
}: {
  label: string
  fetchBatch: (cursor: string | undefined) => Promise<T[]>
  getContent: (row: T) => string | null
  sanitize: (value: string) => string
  write: (id: string, value: string) => Promise<unknown>
}): Promise<TargetSummary> {
  let cursor: string | undefined
  let scanned = 0
  let changed = 0

  for (;;) {
    const rows = await fetchBatch(cursor)
    if (rows.length === 0) break

    for (const row of rows) {
      scanned++
      const original = getContent(row)
      if (!original) continue

      const cleaned = sanitize(original)
      if (cleaned === original) continue

      changed++
      console.log(`  ${label} ${row.id}: ${original.length} → ${cleaned.length} chars`)
      if (APPLY) await write(row.id, cleaned)
    }

    cursor = rows[rows.length - 1]!.id
    if (rows.length < BATCH_SIZE) break
  }

  return { label, scanned, changed }
}

async function main() {
  console.log(APPLY ? "Sanitising stored content (writing changes)…" : "Sanitising stored content (dry run)…")

  const summaries: TargetSummary[] = []

  summaries.push(
    await backfillTable({
      label: "pages.content",
      fetchBatch: (cursor) =>
        db.page.findMany({
          take: BATCH_SIZE,
          orderBy: { id: "asc" },
          ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
          select: { id: true, content: true },
        }),
      getContent: (row) => row.content,
      sanitize: sanitizeRichText,
      write: (id, content) => db.page.update({ where: { id }, data: { content } }),
    }),
  )

  summaries.push(
    await backfillTable({
      label: "news.content",
      fetchBatch: (cursor) =>
        db.news.findMany({
          take: BATCH_SIZE,
          orderBy: { id: "asc" },
          ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
          select: { id: true, content: true },
        }),
      getContent: (row) => row.content,
      sanitize: sanitizeRichText,
      write: (id, content) => db.news.update({ where: { id }, data: { content } }),
    }),
  )

  // `shortText` is a plain-text teaser, so it goes through the text-only sanitiser.
  summaries.push(
    await backfillTable({
      label: "news.shortText",
      fetchBatch: (cursor) =>
        db.news.findMany({
          take: BATCH_SIZE,
          orderBy: { id: "asc" },
          ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
          select: { id: true, shortText: true },
        }),
      getContent: (row) => row.shortText,
      sanitize: sanitizeText,
      write: (id, shortText) => db.news.update({ where: { id }, data: { shortText } }),
    }),
  )

  summaries.push(
    await backfillTable({
      label: "games.recapContent",
      fetchBatch: (cursor) =>
        db.game.findMany({
          take: BATCH_SIZE,
          orderBy: { id: "asc" },
          ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
          select: { id: true, recapContent: true },
        }),
      getContent: (row) => row.recapContent,
      sanitize: sanitizeRichText,
      write: (id, recapContent) => db.game.update({ where: { id }, data: { recapContent } }),
    }),
  )

  console.log("\nSummary")
  let totalChanged = 0
  for (const s of summaries) {
    totalChanged += s.changed
    console.log(`  ${s.label.padEnd(20)} scanned ${String(s.scanned).padStart(6)}  needs cleaning ${s.changed}`)
  }

  if (totalChanged === 0) {
    console.log("\nNothing to clean.")
  } else if (APPLY) {
    console.log(`\nRewrote ${totalChanged} row(s).`)
  } else {
    console.log(`\n${totalChanged} row(s) would be rewritten. Re-run with --apply to write them.`)
  }
}

main()
  .catch((err) => {
    console.error("[sanitize-backfill] Failed:", err)
    process.exitCode = 1
  })
  .finally(() => db.$disconnect())
