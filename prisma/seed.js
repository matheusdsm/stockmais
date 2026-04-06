import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import bcrypt from 'bcrypt'
import { URL } from 'url'
import dotenv from 'dotenv'

dotenv.config()

const { Pool } = pg

const databaseUrl = process.env.DATABASE_URL
const parsedUrl = new URL(databaseUrl)
const password = parsedUrl.password

parsedUrl.password = encodeURIComponent(password)

const pool = new Pool({
  connectionString: parsedUrl.toString()
})

const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  const passwordHash = await bcrypt.hash('admin12345', 10)
  
  const admin = await prisma.usuario.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      passwordHash,
      role: 'gerente',
      nomeCompleto: 'Administrador'
    }
  })

  console.log('Usuário admin criado:', admin)
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
