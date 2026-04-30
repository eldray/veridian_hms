import { PrismaClient } from '@prisma/client'

// Prisma 7 automatically reads from prisma.config.ts
// No need to pass any arguments to the constructor
const prisma = new PrismaClient()

export default prisma