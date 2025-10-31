// prisma.config.ts
import { defineConfig } from '@prisma/config'
import { config as loadEnv } from "dotenv"
loadEnv({ path: ".env" })

export default defineConfig({
  schema: 'prisma/schema.prisma',
})

