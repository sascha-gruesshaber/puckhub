import { pgEnum } from "drizzle-orm/pg-core"

export const roundTypeEnum = pgEnum("round_type", [
  "regular",
  "preround",
  "playoffs",
  "playdowns",
  "playups",
  "relegation",
  "placement",
  "final",
])

export const positionEnum = pgEnum("position", ["forward", "defense", "goalie"])

export const gameStatusEnum = pgEnum("game_status", ["scheduled", "in_progress", "completed", "postponed", "cancelled"])

export const gameEventTypeEnum = pgEnum("game_event_type", ["goal", "penalty"])


export const newsStatusEnum = pgEnum("news_status", ["draft", "published"])

export const pageStatusEnum = pgEnum("page_status", ["draft", "published"])

export const menuLocationEnum = pgEnum("menu_location", ["main_nav", "footer"])

export const trikotTemplateTypeEnum = pgEnum("trikot_template_type", ["one_color", "two_color"])
