import * as trpc from '@trpc/server'
import { z } from 'zod'
import { prisma } from '../utils/prisma'

export const appRouter = trpc
  .router()
  .query('get-count', {
    async resolve() {
      try {
        const count = await prisma.count.findFirst()
        return { count }
      } catch (err) {
        throw new trpc.TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Internal server error',
          cause: err,
        })
      }
    },
  })
  .mutation('set-count', {
    input: z.object({
      id: z.number(),
      count: z.number(),
    }),
    async resolve({ input }) {
      try {
        const result = await prisma.count.update({
          where: {
            id: input.id,
          },
          data: {
            count: input.count,
          },
        })
        return { result }
      } catch (err) {
        throw new trpc.TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Internal server error',
          cause: err,
        })
      }
    },
  })

// export type definition of API
export type AppRouter = typeof appRouter
