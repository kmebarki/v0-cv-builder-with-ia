// scripts/seed-admin.js
const { PrismaClient } = require('@prisma/client')
const argon2 = require('argon2')

;(async () => {
  const prisma = new PrismaClient()
  const email = process.env.ADMIN_EMAIL
  const rawPassword = process.env.ADMIN_PASSWORD

  if (!email || !rawPassword) {
    console.error('❌ ADMIN_EMAIL ou ADMIN_PASSWORD manquant dans .env')
    process.exit(1)
  }

  try {
    // 1) Créer / upsert l'utilisateur
    const passwordHash = await argon2.hash(rawPassword)

    const user = await prisma.user.upsert({
      where: { email },
      update: { passwordHash },
      create: { email, passwordHash, firstName: 'Admin', lastName: 'IFH' },
    })

    // 2) Créer le rôle "admin" si absent
    const adminRole = await prisma.role.upsert({
      where: { name: 'admin' },
      update: {},
      create: { name: 'admin', description: 'Super administrateur' },
    })

    // 3) Associer l'utilisateur au rôle "admin" si pas déjà fait
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: adminRole.id } },
      update: {},
      create: { userId: user.id, roleId: adminRole.id },
    })

    console.log(`✅ Admin prêt : ${email}`)
  } catch (e) {
    console.error('❌ Seed admin a échoué :', e)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
})()
