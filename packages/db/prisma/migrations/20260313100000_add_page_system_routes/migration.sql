-- AlterTable: rename is_static to is_system_route and add route_path
ALTER TABLE "pages" RENAME COLUMN "is_static" TO "is_system_route";

-- AddColumn
ALTER TABLE "pages" ADD COLUMN "route_path" TEXT;
