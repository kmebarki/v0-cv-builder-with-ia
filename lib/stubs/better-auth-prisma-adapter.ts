import type { PrismaClient } from "@prisma/client"

export interface BetterAuthPrismaAdapterConfig {
  prisma: PrismaClient
}

export interface BetterAuthPrismaAdapter {
  prisma: PrismaClient
}

export function prismaAdapter(config: BetterAuthPrismaAdapterConfig): BetterAuthPrismaAdapter {
  return { prisma: config.prisma }
}
