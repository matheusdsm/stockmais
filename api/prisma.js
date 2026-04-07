import Prisma from '@prisma/client'
const { PrismaClient } = Prisma

const globalForPrisma = global

export const prisma = globalForPrisma.prisma || new PrismaClient({
  log: ['error', 'warn']
})

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

export default prisma