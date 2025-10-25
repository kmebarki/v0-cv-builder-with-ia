import { PrismaClient } from "@prisma/client"
import argon2 from "argon2"

const prisma = new PrismaClient()

async function ensureRole(name, description) {
  return prisma.role.upsert({
    where: { name },
    update: { description },
    create: { name, description },
  })
}

async function ensurePermission(name, description) {
  return prisma.permission.upsert({
    where: { name },
    update: { description },
    create: { name, description },
  })
}

async function linkPermission(roleId, permissionId) {
  await prisma.rolePermission.upsert({
    where: { roleId_permissionId: { roleId, permissionId } },
    update: {},
    create: { roleId, permissionId },
  })
}

async function seedAdmin(role) {
  const email = process.env.ADMIN_EMAIL?.toLowerCase()
  const password = process.env.ADMIN_PASSWORD

  if (!email || !password) {
    console.warn("[seed] ADMIN_EMAIL ou ADMIN_PASSWORD non défini - aucun compte administrateur créé.")
    return
  }

  const passwordHash = await argon2.hash(password, { type: argon2.argon2id })

  const adminUser = await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      emailVerifiedAt: new Date(),
    },
    create: {
      email,
      passwordHash,
      emailVerifiedAt: new Date(),
      roles: {
        create: { roleId: role.id },
      },
    },
    include: { roles: true },
  })

  const alreadyLinked = adminUser.roles.some((userRole) => userRole.roleId === role.id)
  if (!alreadyLinked) {
    await prisma.userRole.create({
      data: {
        userId: adminUser.id,
        roleId: role.id,
      },
    })
  }

  console.info(`[seed] Compte administrateur prêt: ${email}`)
}

async function main() {
  const userRole = await ensureRole("user", "Utilisateur standard")
  const adminRole = await ensureRole("admin", "Administrateur de la plateforme")

  const permissions = await Promise.all([
    ensurePermission("manage_users", "Gérer les utilisateurs"),
    ensurePermission("manage_templates", "Administrer les templates"),
    ensurePermission("view_audit_logs", "Consulter les journaux d'audit"),
  ])

  await Promise.all(permissions.map((permission) => linkPermission(adminRole.id, permission.id)))

  // Le rôle utilisateur a par défaut le droit de gérer ses propres CVs.
  const selfServicePermission = await ensurePermission(
    "manage_own_assets",
    "Modifier ses propres données de CV",
  )
  await linkPermission(userRole.id, selfServicePermission.id)

  await seedAdmin(adminRole)

  console.info("[seed] Rôles et permissions synchronisés.")
}

main()
  .catch((error) => {
    console.error("[seed] Erreur lors de l'initialisation Prisma", error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
