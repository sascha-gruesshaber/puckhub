CREATE INDEX "contracts_player_id_idx" ON "contracts" USING btree ("player_id");--> statement-breakpoint
CREATE INDEX "contracts_team_id_idx" ON "contracts" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "contracts_start_season_id_idx" ON "contracts" USING btree ("start_season_id");--> statement-breakpoint
CREATE INDEX "divisions_season_id_idx" ON "divisions" USING btree ("season_id");--> statement-breakpoint
CREATE INDEX "game_events_game_id_idx" ON "game_events" USING btree ("game_id");--> statement-breakpoint
CREATE INDEX "game_lineups_game_id_idx" ON "game_lineups" USING btree ("game_id");--> statement-breakpoint
CREATE INDEX "game_suspensions_game_id_idx" ON "game_suspensions" USING btree ("game_id");--> statement-breakpoint
CREATE INDEX "game_suspensions_team_id_idx" ON "game_suspensions" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "games_round_id_idx" ON "games" USING btree ("round_id");--> statement-breakpoint
CREATE INDEX "games_home_team_id_idx" ON "games" USING btree ("home_team_id");--> statement-breakpoint
CREATE INDEX "games_away_team_id_idx" ON "games" USING btree ("away_team_id");--> statement-breakpoint
CREATE INDEX "games_venue_id_idx" ON "games" USING btree ("venue_id");--> statement-breakpoint
CREATE INDEX "games_scheduled_at_idx" ON "games" USING btree ("scheduled_at");--> statement-breakpoint
CREATE INDEX "rounds_division_id_idx" ON "rounds" USING btree ("division_id");--> statement-breakpoint
CREATE INDEX "standings_round_id_idx" ON "standings" USING btree ("round_id");--> statement-breakpoint
CREATE INDEX "team_divisions_team_id_idx" ON "team_divisions" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "team_divisions_division_id_idx" ON "team_divisions" USING btree ("division_id");