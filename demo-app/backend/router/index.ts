import { Count } from '@prisma/client'
import * as trpc from '@trpc/server'
import { z } from 'zod'
import { prisma } from '../utils/prisma'

export const appRouter = trpc
  .router()
  .query('get-count', {
    async resolve() {
      let count: Count | null
      try {
        const numEntries = await prisma.count.count()
        if (numEntries === 0) {
          count = await prisma.count.create({ data: { count: 0 } })
          console.log(
            `backend: returning new instance with id ${count.id}`,
            count,
          )
          return { count }
        } else {
          count = await prisma.count.findFirst()
          if (!count) throw Error
          console.log(
            `backend: returning existing instance with id ${count?.id}`,
            count,
          )
          return { count }
        }
      } catch (err) {
        throw new trpc.TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Internal server error. Could not establish connection with database',
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
        console.log(err)
        throw new trpc.TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update count',
          cause: err,
        })
      }
    },
  })

// export type definition of API
export type AppRouter = typeof appRouter
