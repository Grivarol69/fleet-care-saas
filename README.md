# Fleet Care SaaS

Sistema de gestión de mantenimiento de flotas (CMMS) multi-tenant con arquitectura preventiva, correctiva y predictiva.

## 📋 Descripción

Fleet Care es una plataforma SaaS moderna para la gestión integral de mantenimiento de flotas vehiculares. Permite a las empresas gestionar el mantenimiento preventivo automático, correctivo mediante PWA para choferes y técnicos, y análisis predictivo basado en health score.

### Características Principales

- 🔧 **Mantenimiento Preventivo**: Trigger automático basado en kilometraje/fechas
- 🚨 **Mantenimiento Correctivo**: Sistema PWA para reportes en campo
- 📊 **Dashboard Operativo**: Métricas en tiempo real y alertas
- 📱 **Notificaciones WhatsApp**: Alertas automáticas vía Twilio
- 🏢 **Multi-tenant**: Arquitectura segura para múltiples empresas
- 🔐 **Autenticación**: Sistema robusto con Supabase Auth

## 🛠️ Stack Tecnológico

### Frontend

- **Framework**: Next.js 15.4.7 (App Router)
- **UI**: React 19, TypeScript 5
- **Styling**: Tailwind CSS 3.4
- **Componentes**: Radix UI, shadcn/ui
- **Estado**: Zustand 5.0
- **Data Fetching**: TanStack Query 5.90
- **Formularios**: React Hook Form + Zod

### Backend

- **Database**: PostgreSQL (via Supabase)
- **ORM**: Prisma 6.15
- **Auth**: Supabase Auth
- **File Upload**: UploadThing
- **Notifications**: Twilio (WhatsApp)

### Testing & Tools

- **Testing**: Vitest 3.2 + Testing Library
- **Linting**: ESLint 9
- **Formatting**: Prettier 3.6
- **Pre-commit**: Husky + lint-staged
- **Package Manager**: pnpm 7.26

## 🚀 Setup Local

### Prerrequisitos

- Node.js 20+
- pnpm 7+
- PostgreSQL (o cuenta Supabase)

### Instalación

```bash
# Clonar repositorio
git clone https://github.com/Grivarol69/fleet-care-saas.git
cd fleet-care-saas

# Instalar dependencias
pnpm install

# Configurar variables de entorno
cp .env.example .env.local
# Editar .env.local con tus credenciales

# Generar cliente Prisma
pnpm db:generate

# Ejecutar migraciones
pnpm db:migrate

# (Opcional) Seed de datos de prueba
pnpm db:seed

# Iniciar servidor de desarrollo
pnpm dev
```

La aplicación estará disponible en `http://localhost:3000`

## 📜 Scripts Disponibles

### Desarrollo

```bash
pnpm dev              # Iniciar servidor de desarrollo
pnpm build            # Compilar para producción
pnpm start            # Iniciar servidor de producción
pnpm lint             # Ejecutar ESLint
pnpm lint:fix         # Ejecutar ESLint con auto-fix
pnpm type-check       # Verificar tipos TypeScript
pnpm format           # Formatear código con Prettier
```

### Base de Datos

```bash
pnpm db:generate      # Generar cliente Prisma
pnpm db:migrate       # Ejecutar migraciones
pnpm db:studio        # Abrir Prisma Studio
pnpm db:seed          # Poblar datos de prueba
```

### Testing

```bash
pnpm test             # Ejecutar tests con Vitest
pnpm test:watch       # Ejecutar tests en modo watch
pnpm test:coverage    # Generar reporte de cobertura
```

## 🔐 Variables de Entorno

Crea un archivo `.env.local` con las siguientes variables:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/fleet_care"

# Supabase
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# UploadThing
UPLOADTHING_TOKEN="your-uploadthing-token"

# Twilio (WhatsApp Notifications)
TWILIO_ACCOUNT_SID="your-account-sid"
TWILIO_AUTH_TOKEN="your-auth-token"
TWILIO_PHONE_NUMBER="+14155238886"

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

## 📁 Estructura del Proyecto

```
fleet-care-saas/
├── prisma/
│   ├── schema.prisma       # Schema de base de datos
│   ├── migrations/         # Migraciones SQL
│   └── seed.ts            # Datos de prueba
├── src/
│   ├── app/               # App Router (Next.js 15)
│   │   ├── api/          # API Routes
│   │   ├── dashboard/    # Páginas dashboard
│   │   └── tenant/       # Páginas multi-tenant
│   ├── components/        # Componentes React
│   │   └── ui/           # Componentes shadcn/ui
│   ├── lib/              # Utilidades y servicios
│   │   ├── notifications/ # Sistema de notificaciones
│   │   └── providers/    # Providers (Query, etc)
│   └── types/            # Tipos TypeScript
├── vitest.config.ts      # Configuración Vitest
└── README.md
```

## 🎯 Estado del Proyecto

### MVP en Desarrollo (Sprint 0)

- ✅ Arquitectura base limpia
- ✅ TypeScript: 0 errores
- ✅ Build: Exitoso
- ✅ Testing: Configurado (Vitest + Testing Library)
- ✅ Data Fetching: TanStack Query configurado
- 🚧 Sprint 1: Preventivo 100% (próximo)

### Timeline MVP

- **Sprint 0**: Setup y configuración (actual)
- **Sprint 1-6**: Desarrollo features core (12 semanas)
- **Fin MVP**: 20 Diciembre 2025

## 📝 Documentación

La documentación técnica y de sesiones está disponible en `.claude/sessions/`

Archivos clave:

- `CHECKPOINT-2025-10-07.md` - Estado actual del proyecto
- `2025-10-07-decisiones-alcance-mvp.md` - Decisiones de alcance MVP
- `2025-10-07-cronograma-ajustado-arquitectura-real.md` - Cronograma completo

## 🤝 Contribuir

Este es un proyecto privado en desarrollo. Para contribuir:

1. Fork el repositorio
2. Crea un branch para tu feature (`git checkout -b feature/nueva-feature`)
3. Commit tus cambios (`git commit -m 'feat: agregar nueva feature'`)
4. Push al branch (`git push origin feature/nueva-feature`)
5. Abre un Pull Request

## 📄 Licencia

Privado - Todos los derechos reservados

## 👨‍💻 Autor

Desarrollado por el equipo de Fleet Care
