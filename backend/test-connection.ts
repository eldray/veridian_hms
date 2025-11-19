// test-connection.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testConnection() {
  try {
    console.log('Testing database connection...')
    
    // Test raw query
    const result = await prisma.$queryRaw`SELECT version()`
    console.log('✅ Database connection successful!')
    console.log('PostgreSQL version:', result)
    
    // Test creating a user
    const user = await prisma.user.create({
      data: {
        username: 'testadmin',
        password: 'temp123',
        fullName: 'Test Admin',
        role: 'admin',
        email: 'test@hospital.com'
      }
    })
    console.log('✅ Test user created:', user)
    
  } catch (error) {
    console.error('❌ Database connection failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testConnection()
