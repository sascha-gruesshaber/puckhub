-- DropIndex
DROP INDEX IF EXISTS "website_config_subdomain_key";

-- AlterTable
ALTER TABLE "website_config" DROP COLUMN IF EXISTS "subdomain";
