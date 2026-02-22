import { z } from 'zod'
import { publicProcedure, router } from '../init'

export const trikotTemplateRouter = router({
  list: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.trikotTemplate.findMany({
      orderBy: [{ colorCount: 'asc' }, { name: 'asc' }],
    })
  }),

  getById: publicProcedure.input(z.object({ id: z.string().uuid() })).query(async ({ ctx, input }) => {
    return ctx.db.trikotTemplate.findFirst({
      where: { id: input.id },
    })
  }),
})
