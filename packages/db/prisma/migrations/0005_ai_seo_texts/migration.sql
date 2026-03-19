-- AlterTable: Add SEO fields to news
ALTER TABLE "news" ADD COLUMN "seo_title" TEXT;
ALTER TABLE "news" ADD COLUMN "seo_description" TEXT;

-- AlterTable: Add SEO fields to pages
ALTER TABLE "pages" ADD COLUMN "seo_title" TEXT;
ALTER TABLE "pages" ADD COLUMN "seo_description" TEXT;

-- AlterTable: Add news_id and page_id to ai_usage_log
ALTER TABLE "ai_usage_log" ADD COLUMN "news_id" UUID;
ALTER TABLE "ai_usage_log" ADD COLUMN "page_id" UUID;

-- AddForeignKey
ALTER TABLE "ai_usage_log" ADD CONSTRAINT "ai_usage_log_news_id_fkey" FOREIGN KEY ("news_id") REFERENCES "news"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ai_usage_log" ADD CONSTRAINT "ai_usage_log_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "pages"("id") ON DELETE SET NULL ON UPDATE CASCADE;
