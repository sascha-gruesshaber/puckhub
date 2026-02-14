import * as schema from "@puckhub/db/schema"
import { eq } from "drizzle-orm"
import { z } from "zod"
import { publicProcedure, router } from "../init"

export const standingsRouter = router({
  getByRound: publicProcedure.input(z.object({ roundId: z.string().uuid() })).query(async ({ ctx, input }) => {
    return ctx.db.query.standings.findMany({
      where: eq(schema.standings.roundId, input.roundId),
      orderBy: (standings, { asc, desc }) => [
        desc(standings.totalPoints),
        asc(standings.gamesPlayed),
        desc(standings.goalDifference),
        desc(standings.goalsFor),
      ],
    })
  }),
})
