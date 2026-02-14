import * as schema from "@puckhub/db/schema"
import { eq } from "drizzle-orm"
import { z } from "zod"
import { publicProcedure, router } from "../init"

export const trikotTemplateRouter = router({
  list: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.query.trikotTemplates.findMany({
      orderBy: (t, { asc }) => [asc(t.colorCount), asc(t.name)],
    })
  }),

  getById: publicProcedure.input(z.object({ id: z.string().uuid() })).query(async ({ ctx, input }) => {
    return ctx.db.query.trikotTemplates.findFirst({
      where: eq(schema.trikotTemplates.id, input.id),
    })
  }),
})
