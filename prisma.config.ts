import 'dotenv/config'
import { defineConfig, env } from 'prisma/config'

export default defineConfig({
  // Ubicación del schema
  schema: 'prisma/schema.prisma',

  // Configuración de migraciones
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },

  // Configuración del datasource (URLs movidas desde schema.prisma)
  datasource: {
    // DATABASE_URL: Neon pooled connection (para queries normales)
    url: env('DATABASE_URL'),

    // DIRECT_URL: Neon direct connection (para migraciones)
    directUrl: env('DIRECT_URL'),
  },
})
