DELETE FROM "pages" WHERE "id" IN (
  SELECT "id" FROM (
    SELECT "id", ROW_NUMBER() OVER (PARTITION BY "slug" ORDER BY "created_at" ASC) AS rn
    FROM "pages" WHERE "is_static" = true AND "parent_id" IS NULL
  ) sub WHERE rn > 1
);--> statement-breakpoint
ALTER TABLE "pages" DROP CONSTRAINT "pages_slug_parent_unique";--> statement-breakpoint
ALTER TABLE "pages" ADD CONSTRAINT "pages_slug_parent_unique" UNIQUE NULLS NOT DISTINCT("slug","parent_id");