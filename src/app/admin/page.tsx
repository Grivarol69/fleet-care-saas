import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Building2, Users, FileBox, Car } from 'lucide-react'

export default async function AdminDashboard() {
  // Obtener estadísticas globales
  const [tenantsCount, usersCount, templatesCount, vehiclesCount] = await Promise.all([
    prisma.tenant.count(),
    prisma.user.count(),
    prisma.maintenanceTemplate.count({ where: { isGlobal: true } }),
    prisma.vehicle.count(),
  ])

  const stats = [
    {
      title: 'Tenants',
      value: tenantsCount,
      description: 'Organizaciones activas',
      icon: Building2,
      color: 'text-blue-600',
    },
    {
      title: 'Usuarios',
      value: usersCount,
      description: 'Total de usuarios',
      icon: Users,
      color: 'text-green-600',
    },
    {
      title: 'Templates Globales',
      value: templatesCount,
      description: 'Plantillas de mantenimiento',
      icon: FileBox,
      color: 'text-purple-600',
    },
    {
      title: 'Vehículos',
      value: vehiclesCount,
      description: 'Total en la plataforma',
      icon: Car,
      color: 'text-orange-600',
    },
  ]

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Dashboard de Administración</h1>
        <p className="text-slate-600">Vista general de la plataforma Fleet Care</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stat.value}</div>
              <CardDescription>{stat.description}</CardDescription>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Activity - Placeholder */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Tenants Recientes</CardTitle>
            <CardDescription>Últimas organizaciones registradas</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-500">
              Listado de tenants próximamente...
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Actividad del Sistema</CardTitle>
            <CardDescription>Eventos recientes</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-500">
              Log de actividad próximamente...
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
