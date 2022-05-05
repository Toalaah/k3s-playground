import { Prisma, PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

export default async function handler(req: any, res: any) {
  if (req.method === 'POST') {
    const count = Number(req.body.count)
    const id = Number(req.body.id)

    if (isNaN(count) || isNaN(id)) {
      return res.status(400).json({ message: 'Bad request' })
    }
    try {
      const dbResult = await prisma.count.update({
        where: {
          id: id,
        },
        data: {
          count: count,
        },
      })
      return res.status(200).json(dbResult)
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === 'P2025') {
          return res.status(400).json({ message: e.message })
        }
        return res.status(500).json({ message: 'Internal server error' })
      }
    }
  } else {
    res.status(400).json()
  }
}
