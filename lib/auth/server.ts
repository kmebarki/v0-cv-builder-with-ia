import { betterAuth } from "better-auth"
import { prismaAdapter } from "better-auth/adapters/prisma"
import { env, validateEnv } from "@/lib/env"
import { prisma } from "@/lib/prisma"

validateEnv()

export const auth = betterAuth({
  secret: env.betterAuth.secret,
  adapter: prismaAdapter({ prisma }),
})
