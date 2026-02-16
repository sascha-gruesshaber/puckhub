ALTER TYPE "public"."round_type" ADD VALUE 'playups' BEFORE 'relegation';--> statement-breakpoint
ALTER TABLE "divisions" ADD COLUMN "goalie_min_games" integer DEFAULT 7 NOT NULL;--> statement-breakpoint
ALTER TABLE "rounds" ADD COLUMN "counts_for_player_stats" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "rounds" ADD COLUMN "counts_for_goalie_stats" boolean DEFAULT true NOT NULL;